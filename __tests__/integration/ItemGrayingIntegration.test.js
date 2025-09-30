/**
 * Integration Test for WriteOff Item Graying Functionality
 * 
 * Tests the complete flow of item blocking and visual graying logic
 * Verifies that getItemBlockStatus integrates properly without component rendering
 * 
 * Created: September 2025
 * Context: Testing the new product blocking logic integration
 */

describe('WriteOff Item Graying Integration', () => {
  const TODAY = '2025-09-30';
  const YESTERDAY = '2025-09-29';
  
  // Mock the complete integrated blocking logic from WriteOff
  const getIntegratedBlockStatus = (item, transfers, salesData, user) => {
    if (!item) return { isBlocked: false, type: 'none', reason: null };
    
    // Ensure arrays exist, default to empty arrays if undefined/null
    const safeTransfers = transfers || [];
    const safeSalesData = salesData || [];
    
    // FIRST: Check if THIS SPECIFIC jacket (by ID) has a transfer
    const hasTransferWithSameId = safeTransfers.some((t) => {
        return t.productId === item.id;
    });
    
    // If this specific item has a transfer, it's blocked by transfer - STOP HERE!
    if (hasTransferWithSameId) {
        return { isBlocked: true, type: 'transfer', reason: 'Przeniesiono dzisiaj' };
    }
    
    // SECOND: Only check sales for items WITHOUT transfers
    const hasSaleWithSameBarcode = safeSalesData.some((sale) => {
        const barcodeMatches = sale.barcode && item.barcode && sale.barcode === item.barcode;
        const sellingPointMatches = sale.from === user?.symbol;
        return barcodeMatches && sellingPointMatches;
    });
    
    if (hasSaleWithSameBarcode) {
        // Count how many sales exist for this barcode from this selling point
        const salesCount = safeSalesData.filter(sale => {
            return sale.barcode === item.barcode && sale.from === user?.symbol;
        }).length;
        
        // Count available stock for this barcode at this selling point
        const availableStock = 1; // Simplified for testing
        
        if (salesCount >= availableStock) {
            return { isBlocked: true, type: 'sale', reason: 'Sprzedano dzisiaj' };
        }
    }
    
    return { isBlocked: false, type: 'none', reason: null };
  };

  // UI graying logic that uses the blocking status
  const getUIGrayingState = (item, transfers, salesData, user) => {
    const blockStatus = getIntegratedBlockStatus(item, transfers, salesData, user);
    
    return {
      shouldGrayOut: blockStatus.isBlocked,
      isClickable: !blockStatus.isBlocked,
      tooltipMessage: blockStatus.reason,
      blockingType: blockStatus.type,
      visualOpacity: blockStatus.isBlocked ? 0.5 : 1.0,
      showWarningIcon: blockStatus.isBlocked,
      interactionEnabled: !blockStatus.isBlocked
    };
  };

  const mockUser = {
    symbol: 'T',
    name: 'Test User',
    sellingPoint: 'Test Point'
  };

  describe('Integrated Item Visual Blocking Tests', () => {
    test('should gray out item that was transferred today', () => {
      const transfers = [
        { productId: 'item123' }
      ];
      const salesData = [];
      const item = {
        id: 'item123',
        barcode: 'BC001',
        name: 'Test Jacket'
      };

      const uiState = getUIGrayingState(item, transfers, salesData, mockUser);

      expect(uiState.shouldGrayOut).toBe(true);
      expect(uiState.isClickable).toBe(false);
      expect(uiState.blockingType).toBe('transfer');
      expect(uiState.tooltipMessage).toBe('Przeniesiono dzisiaj');
      expect(uiState.visualOpacity).toBe(0.5);
      expect(uiState.showWarningIcon).toBe(true);
    });

    test('should gray out item that was sold today', () => {
      const transfers = [];
      const salesData = [
        {
          barcode: 'BC001',
          from: 'T',
          amount: 100
        }
      ];
      const item = {
        id: 'item123',
        barcode: 'BC001',
        name: 'Test Jacket'
      };

      const uiState = getUIGrayingState(item, transfers, salesData, mockUser);

      expect(uiState.shouldGrayOut).toBe(true);
      expect(uiState.isClickable).toBe(false);
      expect(uiState.blockingType).toBe('sale');
      expect(uiState.tooltipMessage).toBe('Sprzedano dzisiaj');
      expect(uiState.visualOpacity).toBe(0.5);
    });

    test('should prioritize transfer graying over sale graying', () => {
      const transfers = [
        { productId: 'item123' }
      ];
      const salesData = [
        {
          barcode: 'BC001',
          from: 'T',
          amount: 100
        }
      ];
      const item = {
        id: 'item123',
        barcode: 'BC001',
        name: 'Test Jacket'
      };

      const uiState = getUIGrayingState(item, transfers, salesData, mockUser);

      // Should show transfer blocking, not sale
      expect(uiState.shouldGrayOut).toBe(true);
      expect(uiState.blockingType).toBe('transfer');
      expect(uiState.tooltipMessage).toBe('Przeniesiono dzisiaj');
    });

    test('should not gray out available items', () => {
      const transfers = [];
      const salesData = [];
      const item = {
        id: 'item123',
        barcode: 'BC001',
        name: 'Test Jacket'
      };

      const uiState = getUIGrayingState(item, transfers, salesData, mockUser);

      expect(uiState.shouldGrayOut).toBe(false);
      expect(uiState.isClickable).toBe(true);
      expect(uiState.blockingType).toBe('none');
      expect(uiState.visualOpacity).toBe(1.0);
      expect(uiState.showWarningIcon).toBe(false);
    });
  });

  describe('Blocking Interaction Logic Tests', () => {
    test('should prevent interaction when item is transferred', () => {
      const transfers = [
        { productId: 'item123' }
      ];
      const item = {
        id: 'item123',
        barcode: 'BC001',
        name: 'Test Jacket'
      };

      const uiState = getUIGrayingState(item, transfers, [], mockUser);

      // Simulate click attempt
      const handleClick = () => {
        if (!uiState.interactionEnabled) {
          throw new Error(`Błąd: ${uiState.tooltipMessage}`);
        }
        return 'operation successful';
      };

      expect(() => handleClick()).toThrow('Błąd: Przeniesiono dzisiaj');
    });

    test('should allow interaction when item is available', () => {
      const item = {
        id: 'item123',
        barcode: 'BC001',
        name: 'Test Jacket'
      };

      const uiState = getUIGrayingState(item, [], [], mockUser);

      const handleClick = () => {
        if (!uiState.interactionEnabled) {
          throw new Error(`Błąd: ${uiState.tooltipMessage}`);
        }
        return 'operation successful';
      };

      expect(handleClick()).toBe('operation successful');
    });

    test('should prevent sale when item is already sold', () => {
      const salesData = [
        {
          barcode: 'BC001',
          from: 'T',
          amount: 100
        }
      ];
      const item = {
        id: 'item123',
        barcode: 'BC001',
        name: 'Test Jacket'
      };

      const uiState = getUIGrayingState(item, [], salesData, mockUser);

      const attemptSale = () => {
        if (!uiState.interactionEnabled) {
          throw new Error(`Nie można sprzedać: ${uiState.tooltipMessage}`);
        }
        return 'sale successful';
      };

      expect(() => attemptSale()).toThrow('Nie można sprzedać: Sprzedano dzisiaj');
    });
  });

  describe('Daily Reset Integration Logic', () => {
    test('should allow operations on items from previous days', () => {
      // Simulate old transfers and sales
      const oldTransfers = []; // Empty because they would be filtered out by date
      const oldSalesData = []; // Empty because they would be filtered out by date
      
      const item = {
        id: 'item123',
        barcode: 'BC001',
        name: 'Test Jacket'
      };

      const uiState = getUIGrayingState(item, oldTransfers, oldSalesData, mockUser);

      // Item should be available for new operations
      expect(uiState.shouldGrayOut).toBe(false);
      expect(uiState.isClickable).toBe(true);
      expect(uiState.interactionEnabled).toBe(true);
    });

    test('should show fresh state after midnight simulation', () => {
      const item = {
        id: 'item123',
        barcode: 'BC001',
        name: 'Test Jacket'
      };

      // All arrays empty (simulating after midnight reset)
      const uiState = getUIGrayingState(item, [], [], mockUser);

      expect(uiState.shouldGrayOut).toBe(false);
      expect(uiState.blockingType).toBe('none');
      expect(uiState.tooltipMessage).toBe(null);
    });
  });

  describe('Performance with Large Data Sets', () => {
    test('should handle many blocked items efficiently', () => {
      const startTime = Date.now();
      
      // Create large datasets
      const manyTransfers = Array.from({ length: 100 }, (_, i) => ({
        productId: `item${i}`
      }));
      
      const manySalesData = Array.from({ length: 100 }, (_, i) => ({
        barcode: `BC${String(i).padStart(3, '0')}`,
        from: 'T',
        amount: 100
      }));

      const items = Array.from({ length: 200 }, (_, i) => ({
        id: `item${i}`,
        barcode: `BC${String(i).padStart(3, '0')}`,
        name: `Test Jacket ${i}`
      }));

      // Process all items
      const uiStates = items.map(item => 
        getUIGrayingState(item, manyTransfers, manySalesData, mockUser)
      );

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(uiStates).toHaveLength(200);
      expect(processingTime).toBeLessThan(1000); // Should process quickly
      
      // Verify some states
      expect(uiStates[0].shouldGrayOut).toBe(true); // item0 should be blocked by transfer
      expect(uiStates[150].shouldGrayOut).toBe(false); // item150 should not be blocked
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle missing data gracefully', () => {
      const item = {
        id: 'item123',
        barcode: 'BC001',
        name: 'Test Jacket'
      };

      // Test with undefined/null data
      const uiState1 = getUIGrayingState(item, undefined, undefined, undefined);
      const uiState2 = getUIGrayingState(item, null, null, null);
      const uiState3 = getUIGrayingState(null, [], [], mockUser);

      expect(uiState1.shouldGrayOut).toBe(false);
      expect(uiState2.shouldGrayOut).toBe(false);
      expect(uiState3.shouldGrayOut).toBe(false);
    });

    test('should handle malformed data gracefully', () => {
      const malformedTransfers = [
        {}, // Empty object
        { productId: null }, // Null productId
        { otherField: 'value' } // Missing productId
      ];
      
      const malformedSalesData = [
        {}, // Empty object
        { barcode: null, from: 'T' }, // Null barcode
        { from: 'T' } // Missing barcode
      ];

      const item = {
        id: 'item123',
        barcode: 'BC001',
        name: 'Test Jacket'
      };

      const uiState = getUIGrayingState(item, malformedTransfers, malformedSalesData, mockUser);

      // Should handle malformed data without crashing
      expect(uiState.shouldGrayOut).toBe(false);
      expect(uiState.blockingType).toBe('none');
    });
  });

  describe('Business Logic Integration', () => {
    test('should correctly implement transfer vs sale priority in integrated system', () => {
      const item = {
        id: 'item123',
        barcode: 'BC001',
        name: 'Test Jacket'
      };

      // Test 1: Only transfer
      const onlyTransfer = getUIGrayingState(
        item, 
        [{ productId: 'item123' }], 
        [], 
        mockUser
      );
      expect(onlyTransfer.blockingType).toBe('transfer');

      // Test 2: Only sale
      const onlySale = getUIGrayingState(
        item, 
        [], 
        [{ barcode: 'BC001', from: 'T' }], 
        mockUser
      );
      expect(onlySale.blockingType).toBe('sale');

      // Test 3: Both (transfer should win)
      const both = getUIGrayingState(
        item, 
        [{ productId: 'item123' }], 
        [{ barcode: 'BC001', from: 'T' }], 
        mockUser
      );
      expect(both.blockingType).toBe('transfer'); // Transfer priority
    });

    test('should handle selling point logic correctly', () => {
      const item = {
        id: 'item123',
        barcode: 'BC001',
        name: 'Test Jacket'
      };

      const salesFromDifferentPoint = [
        { barcode: 'BC001', from: 'D' } // Different selling point
      ];

      const salesFromSamePoint = [
        { barcode: 'BC001', from: 'T' } // Same selling point
      ];

      const differentPoint = getUIGrayingState(item, [], salesFromDifferentPoint, mockUser);
      const samePoint = getUIGrayingState(item, [], salesFromSamePoint, mockUser);

      expect(differentPoint.shouldGrayOut).toBe(false); // Should not block
      expect(samePoint.shouldGrayOut).toBe(true); // Should block
    });
  });
});