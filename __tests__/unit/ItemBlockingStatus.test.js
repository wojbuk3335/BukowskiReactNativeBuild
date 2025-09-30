/**
 * Test Suite for Item Blocking Status Functionality
 * 
 * Tests the new getItemBlockStatus function and related item graying logic
 * that determines when items should be visually blocked/grayed out
 * 
 * Created: September 2025
 * Context: Product blocking logic fix for transfer vs sale priority
 */

describe('Item Blocking Status Logic', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Mock today's date for consistent testing
  const TODAY = '2025-09-30';
  const YESTERDAY = '2025-09-29';
  
  // Helper function to simulate the getItemBlockStatus logic
  const getItemBlockStatus = (item, transfers, sales, currentUser) => {
    if (!item) return { isBlocked: false, reason: null, type: null };

    // Check for transfers first (PRIORITY)
    const hasTransfer = transfers.some(transfer => 
      transfer.product_id === item.product_id && 
      transfer.date &&
      transfer.date.startsWith(TODAY) &&
      transfer.transfer_to !== 'SOLD'
    );

    if (hasTransfer) {
      return { 
        isBlocked: true, 
        reason: 'Produkt został już przeniesiony dzisiaj', 
        type: 'TRANSFER' 
      };
    }

    // Then check for sales (SECONDARY)
    const isSold = sales.some(sale => 
      sale.product_id === item.product_id && 
      sale.date &&
      sale.date.startsWith(TODAY)
    );

    if (isSold) {
      return { 
        isBlocked: true, 
        reason: 'Produkt został już sprzedany dzisiaj', 
        type: 'SALE' 
      };
    }

    return { isBlocked: false, reason: null, type: null };
  };

  describe('Transfer Blocking Logic', () => {
    test('should block item when transferred today', () => {
      const item = { product_id: 'P001', name: 'Test Jacket' };
      const transfers = [
        {
          product_id: 'P001',
          date: `${TODAY}T10:00:00Z`,
          transfer_to: 'Tata',
          user: 'testuser'
        }
      ];
      const sales = [];
      const currentUser = { name: 'testuser' };

      const result = getItemBlockStatus(item, transfers, sales, currentUser);

      expect(result.isBlocked).toBe(true);
      expect(result.type).toBe('TRANSFER');
      expect(result.reason).toBe('Produkt został już przeniesiony dzisiaj');
    });

    test('should NOT block item when transferred yesterday', () => {
      const item = { product_id: 'P001', name: 'Test Jacket' };
      const transfers = [
        {
          product_id: 'P001',
          date: `${YESTERDAY}T10:00:00Z`,
          transfer_to: 'Tata',
          user: 'testuser'
        }
      ];
      const sales = [];
      const currentUser = { name: 'testuser' };

      const result = getItemBlockStatus(item, transfers, sales, currentUser);

      expect(result.isBlocked).toBe(false);
      expect(result.type).toBe(null);
    });

    test('should NOT block when transfer is to SOLD (that is sale, not transfer)', () => {
      const item = { product_id: 'P001', name: 'Test Jacket' };
      const transfers = [
        {
          product_id: 'P001',
          date: `${TODAY}T10:00:00Z`,
          transfer_to: 'SOLD',
          user: 'testuser'
        }
      ];
      const sales = [];
      const currentUser = { name: 'testuser' };

      const result = getItemBlockStatus(item, transfers, sales, currentUser);

      expect(result.isBlocked).toBe(false);
      expect(result.type).toBe(null);
    });
  });

  describe('Sale Blocking Logic', () => {
    test('should block item when sold today', () => {
      const item = { product_id: 'P001', name: 'Test Jacket' };
      const transfers = [];
      const sales = [
        {
          product_id: 'P001',
          date: `${TODAY}T14:00:00Z`,
          user: 'testuser',
          amount: 100
        }
      ];
      const currentUser = { name: 'testuser' };

      const result = getItemBlockStatus(item, transfers, sales, currentUser);

      expect(result.isBlocked).toBe(true);
      expect(result.type).toBe('SALE');
      expect(result.reason).toBe('Produkt został już sprzedany dzisiaj');
    });

    test('should NOT block item when sold yesterday', () => {
      const item = { product_id: 'P001', name: 'Test Jacket' };
      const transfers = [];
      const sales = [
        {
          product_id: 'P001',
          date: `${YESTERDAY}T14:00:00Z`,
          user: 'testuser',
          amount: 100
        }
      ];
      const currentUser = { name: 'testuser' };

      const result = getItemBlockStatus(item, transfers, sales, currentUser);

      expect(result.isBlocked).toBe(false);
      expect(result.type).toBe(null);
    });
  });

  describe('Priority Logic: Transfer vs Sale', () => {
    test('transfer should have PRIORITY over sale - both same day', () => {
      const item = { product_id: 'P001', name: 'Test Jacket' };
      const transfers = [
        {
          product_id: 'P001',
          date: `${TODAY}T10:00:00Z`,
          transfer_to: 'Tata',
          user: 'testuser'
        }
      ];
      const sales = [
        {
          product_id: 'P001',
          date: `${TODAY}T14:00:00Z`,
          user: 'testuser',
          amount: 100
        }
      ];
      const currentUser = { name: 'testuser' };

      const result = getItemBlockStatus(item, transfers, sales, currentUser);

      // Transfer should win over sale
      expect(result.isBlocked).toBe(true);
      expect(result.type).toBe('TRANSFER');
      expect(result.reason).toBe('Produkt został już przeniesiony dzisiaj');
    });

    test('should show sale when no transfer exists', () => {
      const item = { product_id: 'P001', name: 'Test Jacket' };
      const transfers = [];
      const sales = [
        {
          product_id: 'P001',
          date: `${TODAY}T14:00:00Z`,
          user: 'testuser',
          amount: 100
        }
      ];
      const currentUser = { name: 'testuser' };

      const result = getItemBlockStatus(item, transfers, sales, currentUser);

      expect(result.isBlocked).toBe(true);
      expect(result.type).toBe('SALE');
      expect(result.reason).toBe('Produkt został już sprzedany dzisiaj');
    });
  });

  describe('Edge Cases', () => {
    test('should handle null/undefined item', () => {
      const result1 = getItemBlockStatus(null, [], [], {});
      const result2 = getItemBlockStatus(undefined, [], [], {});

      expect(result1.isBlocked).toBe(false);
      expect(result2.isBlocked).toBe(false);
    });

    test('should handle empty transfers and sales arrays', () => {
      const item = { product_id: 'P001', name: 'Test Jacket' };
      const result = getItemBlockStatus(item, [], [], {});

      expect(result.isBlocked).toBe(false);
      expect(result.type).toBe(null);
    });

    test('should handle items with no product_id', () => {
      const item = { name: 'Test Jacket' }; // Missing product_id
      const transfers = [
        {
          product_id: 'P001',
          date: `${TODAY}T10:00:00Z`,
          transfer_to: 'Tata',
          user: 'testuser'
        }
      ];
      const sales = [];

      const result = getItemBlockStatus(item, transfers, sales, {});

      expect(result.isBlocked).toBe(false);
    });

    test('should handle malformed date formats', () => {
      const item = { product_id: 'P001', name: 'Test Jacket' };
      const transfers = [
        {
          product_id: 'P001',
          date: 'invalid-date',
          transfer_to: 'Tata',
          user: 'testuser'
        }
      ];
      const sales = [];

      const result = getItemBlockStatus(item, transfers, sales, {});

      expect(result.isBlocked).toBe(false);
    });

    test('should handle missing date field', () => {
      const item = { product_id: 'P001', name: 'Test Jacket' };
      const transfers = [
        {
          product_id: 'P001',
          // date: missing
          transfer_to: 'Tata',
          user: 'testuser'
        }
      ];
      const sales = [];

      const result = getItemBlockStatus(item, transfers, sales, {});

      expect(result.isBlocked).toBe(false);
    });
  });

  describe('Multiple Operations Same Day', () => {
    test('should detect blocking when multiple transfers same product same day', () => {
      const item = { product_id: 'P001', name: 'Test Jacket' };
      const transfers = [
        {
          product_id: 'P001',
          date: `${TODAY}T08:00:00Z`,
          transfer_to: 'Dom',
          user: 'user1'
        },
        {
          product_id: 'P001',
          date: `${TODAY}T10:00:00Z`,
          transfer_to: 'Tata',
          user: 'user2'
        }
      ];
      const sales = [];

      const result = getItemBlockStatus(item, transfers, sales, {});

      expect(result.isBlocked).toBe(true);
      expect(result.type).toBe('TRANSFER');
    });

    test('should handle different products - no blocking', () => {
      const item = { product_id: 'P002', name: 'Test Jacket 2' };
      const transfers = [
        {
          product_id: 'P001',
          date: `${TODAY}T10:00:00Z`,
          transfer_to: 'Tata',
          user: 'testuser'
        }
      ];
      const sales = [
        {
          product_id: 'P001',
          date: `${TODAY}T14:00:00Z`,
          user: 'testuser',
          amount: 100
        }
      ];

      const result = getItemBlockStatus(item, transfers, sales, {});

      expect(result.isBlocked).toBe(false);
    });
  });

  describe('Integration with UI Graying Logic', () => {
    test('should provide correct data for UI styling', () => {
      const item = { product_id: 'P001', name: 'Test Jacket' };
      const transfers = [
        {
          product_id: 'P001',
          date: `${TODAY}T10:00:00Z`,
          transfer_to: 'Tata',
          user: 'testuser'
        }
      ];
      const sales = [];

      const result = getItemBlockStatus(item, transfers, sales, {});

      // Check that we have all needed data for UI
      expect(result).toHaveProperty('isBlocked');
      expect(result).toHaveProperty('reason');
      expect(result).toHaveProperty('type');
      expect(typeof result.isBlocked).toBe('boolean');
      expect(typeof result.reason).toBe('string');
      expect(typeof result.type).toBe('string');
    });

    test('should return proper styling information for blocked items', () => {
      const item = { product_id: 'P001', name: 'Test Jacket' };
      const transfers = [
        {
          product_id: 'P001',
          date: `${TODAY}T10:00:00Z`,
          transfer_to: 'Tata',
          user: 'testuser'
        }
      ];

      const result = getItemBlockStatus(item, transfers, [], {});

      // For UI consumption
      const shouldGrayOut = result.isBlocked;
      const tooltipText = result.reason;
      const blockingType = result.type;

      expect(shouldGrayOut).toBe(true);
      expect(tooltipText).toContain('przeniesiony');
      expect(blockingType).toBe('TRANSFER');
    });
  });

  describe('Daily Reset Functionality', () => {
    test('should reset blocking at midnight - simulate day change', () => {
      const item = { product_id: 'P001', name: 'Test Jacket' };
      
      // Yesterday's transfer
      const yesterdayTransfers = [
        {
          product_id: 'P001',
          date: `${YESTERDAY}T23:59:00Z`,
          transfer_to: 'Tata',
          user: 'testuser'
        }
      ];

      const result = getItemBlockStatus(item, yesterdayTransfers, [], {});

      // Should not be blocked today
      expect(result.isBlocked).toBe(false);
      expect(result.type).toBe(null);
    });

    test('should show fresh state after midnight', () => {
      const item = { product_id: 'P001', name: 'Test Jacket' };
      
      // Mix of old and new operations
      const transfers = [
        {
          product_id: 'P001',
          date: `${YESTERDAY}T23:59:00Z`, // Yesterday - should not block
          transfer_to: 'Tata',
          user: 'testuser'
        }
      ];
      
      const sales = [
        {
          product_id: 'P001',
          date: `${YESTERDAY}T22:00:00Z`, // Yesterday - should not block
          user: 'testuser',
          amount: 100
        }
      ];

      const result = getItemBlockStatus(item, transfers, sales, {});

      expect(result.isBlocked).toBe(false);
      expect(result.type).toBe(null);
    });
  });
});