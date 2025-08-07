// __tests__/unit/AvailableJacketBlocking.test.js

/**
 * Comprehensive tests for the new jacket blocking logic:
 * - Transfers block by exact product ID
 * - Sales block only the first AVAILABLE jacket with same barcode
 * - Sales skip already transferred jackets and block the next available one
 */

describe('Available Jacket Blocking Logic', () => {
  // Mock data structures
  const mockFilteredData = [
    { id: '1', fullName: 'Ada czerwona 2xl', barcode: '0010702300001', size: '2XL' },
    { id: '2', fullName: 'Ada czerwona 2xl', barcode: '0010702300001', size: '2XL' },
    { id: '3', fullName: 'Ada czerwona 2xl', barcode: '0010702300001', size: '2XL' },
    { id: '4', fullName: 'Inna kurtka', barcode: '0010702300002', size: 'L' }
  ];

  // Replicated logic from writeoff.jsx - isTransferred function
  const isTransferred = (item, transfers, salesData, filteredData) => {
    if (!Array.isArray(transfers)) return false;
    
    // Check if THIS SPECIFIC jacket (by ID) was transferred today
    const hasTransferWithSameId = transfers.some((t) => t.productId === item.id);
    
    // Check if THIS SPECIFIC jacket was sold today (by barcode match)
    const hasSaleWithSameBarcode = salesData.some((sale) => {
      return sale.barcode && item.barcode && sale.barcode === item.barcode;
    });
    
    // If there's a sale with same barcode, block only the FIRST AVAILABLE jacket with that barcode
    let hasSaleWithSameItem = false;
    if (hasSaleWithSameBarcode) {
      // Find first AVAILABLE jacket with this barcode (not already blocked by transfer)
      const firstAvailableItemWithThisBarcode = filteredData.find(dataItem => {
        const sameBarcode = dataItem.barcode === item.barcode;
        if (!sameBarcode) return false;
        
        // Check if this item is already blocked by transfer (not sale)
        const isBlockedByTransfer = transfers.some(t => t.productId === dataItem.id);
        
        return !isBlockedByTransfer; // Return first item that is NOT blocked by transfer
      });
      
      hasSaleWithSameItem = firstAvailableItemWithThisBarcode && firstAvailableItemWithThisBarcode.id === item.id;
    }
    
    return hasTransferWithSameId || hasSaleWithSameItem;
  };

  // Replicated logic from writeoff.jsx - hasActiveTransfer function
  const hasActiveTransfer = (item, allTransfers, salesData, filteredData) => {
    if (!Array.isArray(allTransfers)) return false;
    
    // Check transfers by exact product ID
    const hasTransferWithSameId = allTransfers.some((t) => t.productId === item.id);
    
    // Check sales by barcode - block only if THIS specific item (first available with this barcode) was sold
    const hasSaleWithSameBarcode = salesData.some((sale) => {
      return sale.barcode && item.barcode && sale.barcode === item.barcode;
    });
    
    // If there's a sale with same barcode, block only the FIRST AVAILABLE jacket with that barcode
    let hasSaleWithSameItem = false;
    if (hasSaleWithSameBarcode) {
      // Find first AVAILABLE jacket with this barcode (not already blocked by transfer)
      const firstAvailableItemWithThisBarcode = filteredData.find(dataItem => {
        const sameBarcode = dataItem.barcode === item.barcode;
        if (!sameBarcode) return false;
        
        // Check if this item is already blocked by transfer (not sale)
        const isBlockedByTransfer = allTransfers.some(t => t.productId === dataItem.id);
        
        return !isBlockedByTransfer; // Return first item that is NOT blocked by transfer
      });
      
      hasSaleWithSameItem = firstAvailableItemWithThisBarcode && firstAvailableItemWithThisBarcode.id === item.id;
    }
    
    return hasTransferWithSameId || hasSaleWithSameItem;
  };

  describe('Transfer blocking by exact ID', () => {
    test('should block jacket by exact product ID', () => {
      const transfers = [
        { productId: '2', transfer_to: 'USER', date: '2025-08-07T10:00:00.000Z' }
      ];
      const salesData = [];

      // Only jacket with ID '2' should be blocked
      expect(isTransferred(mockFilteredData[0], transfers, salesData, mockFilteredData)).toBe(false); // ID '1'
      expect(isTransferred(mockFilteredData[1], transfers, salesData, mockFilteredData)).toBe(true);  // ID '2' - blocked
      expect(isTransferred(mockFilteredData[2], transfers, salesData, mockFilteredData)).toBe(false); // ID '3'
    });

    test('should allow multiple different jackets to be transferred individually', () => {
      const transfers = [
        { productId: '1', transfer_to: 'USER', date: '2025-08-07T10:00:00.000Z' },
        { productId: '3', transfer_to: 'DOM', date: '2025-08-07T11:00:00.000Z' }
      ];
      const salesData = [];

      expect(isTransferred(mockFilteredData[0], transfers, salesData, mockFilteredData)).toBe(true);  // ID '1' - blocked
      expect(isTransferred(mockFilteredData[1], transfers, salesData, mockFilteredData)).toBe(false); // ID '2'
      expect(isTransferred(mockFilteredData[2], transfers, salesData, mockFilteredData)).toBe(true);  // ID '3' - blocked
    });
  });

  describe('Sales blocking by first available jacket with same barcode', () => {
    test('should block first jacket when sale exists for same barcode', () => {
      const transfers = [];
      const salesData = [
        { barcode: '0010702300001', fullName: 'Ada czerwona 2xl', size: '2XL', date: '2025-08-07T12:00:00.000Z' }
      ];

      // First jacket (ID '1') should be blocked for sales
      expect(isTransferred(mockFilteredData[0], transfers, salesData, mockFilteredData)).toBe(true);  // ID '1' - blocked by sale
      expect(isTransferred(mockFilteredData[1], transfers, salesData, mockFilteredData)).toBe(false); // ID '2'
      expect(isTransferred(mockFilteredData[2], transfers, salesData, mockFilteredData)).toBe(false); // ID '3'
    });

    test('should block first AVAILABLE jacket when some are already transferred', () => {
      // First jacket is transferred, second should be blocked by sale
      const transfers = [
        { productId: '1', transfer_to: 'USER', date: '2025-08-07T10:00:00.000Z' }
      ];
      const salesData = [
        { barcode: '0010702300001', fullName: 'Ada czerwona 2xl', size: '2XL', date: '2025-08-07T12:00:00.000Z' }
      ];

      expect(isTransferred(mockFilteredData[0], transfers, salesData, mockFilteredData)).toBe(true);  // ID '1' - blocked by transfer
      expect(isTransferred(mockFilteredData[1], transfers, salesData, mockFilteredData)).toBe(true);  // ID '2' - blocked by sale (first available)
      expect(isTransferred(mockFilteredData[2], transfers, salesData, mockFilteredData)).toBe(false); // ID '3' - available
    });

    test('should skip already transferred jackets and block next available', () => {
      // First two jackets transferred, third should be blocked by sale
      const transfers = [
        { productId: '1', transfer_to: 'USER', date: '2025-08-07T10:00:00.000Z' },
        { productId: '2', transfer_to: 'DOM', date: '2025-08-07T11:00:00.000Z' }
      ];
      const salesData = [
        { barcode: '0010702300001', fullName: 'Ada czerwona 2xl', size: '2XL', date: '2025-08-07T12:00:00.000Z' }
      ];

      expect(isTransferred(mockFilteredData[0], transfers, salesData, mockFilteredData)).toBe(true);  // ID '1' - blocked by transfer
      expect(isTransferred(mockFilteredData[1], transfers, salesData, mockFilteredData)).toBe(true);  // ID '2' - blocked by transfer  
      expect(isTransferred(mockFilteredData[2], transfers, salesData, mockFilteredData)).toBe(true);  // ID '3' - blocked by sale (first available)
    });

    test('should not block any jacket when all are already transferred', () => {
      // All jackets with same barcode are transferred
      const transfers = [
        { productId: '1', transfer_to: 'USER', date: '2025-08-07T10:00:00.000Z' },
        { productId: '2', transfer_to: 'DOM', date: '2025-08-07T11:00:00.000Z' },
        { productId: '3', transfer_to: 'USER', date: '2025-08-07T12:00:00.000Z' }
      ];
      const salesData = [
        { barcode: '0010702300001', fullName: 'Ada czerwona 2xl', size: '2XL', date: '2025-08-07T13:00:00.000Z' }
      ];

      // All already blocked by transfers, sale shouldn't block any additional
      expect(isTransferred(mockFilteredData[0], transfers, salesData, mockFilteredData)).toBe(true);  // ID '1' - blocked by transfer
      expect(isTransferred(mockFilteredData[1], transfers, salesData, mockFilteredData)).toBe(true);  // ID '2' - blocked by transfer
      expect(isTransferred(mockFilteredData[2], transfers, salesData, mockFilteredData)).toBe(true);  // ID '3' - blocked by transfer
    });
  });

  describe('hasActiveTransfer validation function', () => {
    test('should prevent transfer of already transferred jacket', () => {
      const allTransfers = [
        { productId: '2', transfer_to: 'USER', date: '2025-08-07T10:00:00.000Z' }
      ];
      const salesData = [];

      expect(hasActiveTransfer(mockFilteredData[1], allTransfers, salesData, mockFilteredData)).toBe(true);  // Should prevent transfer
      expect(hasActiveTransfer(mockFilteredData[0], allTransfers, salesData, mockFilteredData)).toBe(false); // Should allow transfer
    });

    test('should prevent transfer of jacket blocked by sale', () => {
      const allTransfers = [];
      const salesData = [
        { barcode: '0010702300001', fullName: 'Ada czerwona 2xl', size: '2XL', date: '2025-08-07T12:00:00.000Z' }
      ];

      expect(hasActiveTransfer(mockFilteredData[0], allTransfers, salesData, mockFilteredData)).toBe(true);  // First jacket blocked by sale
      expect(hasActiveTransfer(mockFilteredData[1], allTransfers, salesData, mockFilteredData)).toBe(false); // Others should be transferable
      expect(hasActiveTransfer(mockFilteredData[2], allTransfers, salesData, mockFilteredData)).toBe(false);
    });

    test('should validate complex scenario with transfers and sales', () => {
      const allTransfers = [
        { productId: '1', transfer_to: 'USER', date: '2025-08-07T10:00:00.000Z' }
      ];
      const salesData = [
        { barcode: '0010702300001', fullName: 'Ada czerwona 2xl', size: '2XL', date: '2025-08-07T12:00:00.000Z' }
      ];

      expect(hasActiveTransfer(mockFilteredData[0], allTransfers, salesData, mockFilteredData)).toBe(true);  // ID '1' - blocked by transfer
      expect(hasActiveTransfer(mockFilteredData[1], allTransfers, salesData, mockFilteredData)).toBe(true);  // ID '2' - blocked by sale (first available)
      expect(hasActiveTransfer(mockFilteredData[2], allTransfers, salesData, mockFilteredData)).toBe(false); // ID '3' - should be transferable
    });
  });

  describe('Edge cases', () => {
    test('should handle missing barcode gracefully', () => {
      const itemWithoutBarcode = { id: '5', fullName: 'Kurtka bez kodu', size: 'M' };
      const transfers = [];
      const salesData = [
        { barcode: '0010702300001', fullName: 'Ada czerwona 2xl', size: '2XL' }
      ];

      expect(isTransferred(itemWithoutBarcode, transfers, salesData, [itemWithoutBarcode])).toBe(false);
    });

    test('should handle sale without barcode gracefully', () => {
      const transfers = [];
      const salesData = [
        { fullName: 'Ada czerwona 2xl', size: '2XL' } // No barcode
      ];

      expect(isTransferred(mockFilteredData[0], transfers, salesData, mockFilteredData)).toBe(false);
    });

    test('should handle empty arrays', () => {
      expect(isTransferred(mockFilteredData[0], [], [], mockFilteredData)).toBe(false);
      expect(hasActiveTransfer(mockFilteredData[0], [], [], mockFilteredData)).toBe(false);
    });

    test('should handle null/undefined inputs', () => {
      expect(isTransferred(mockFilteredData[0], null, null, mockFilteredData)).toBe(false);
      expect(hasActiveTransfer(mockFilteredData[0], null, null, mockFilteredData)).toBe(false);
    });
  });

  describe('Real-world scenarios from user reports', () => {
    test('User scenario: 3 Ada czerwona 2xl, transfer 2, sell 1 - should block correctly', () => {
      // Starting with 3 identical jackets
      const transfers = [
        { productId: '1', transfer_to: 'USER1', date: '2025-08-07T10:00:00.000Z' },
        { productId: '2', transfer_to: 'USER2', date: '2025-08-07T11:00:00.000Z' }
      ];
      const salesData = [
        { barcode: '0010702300001', fullName: 'Ada czerwona 2xl', size: '2XL', date: '2025-08-07T12:00:00.000Z' }
      ];

      // Expected result: first two blocked by transfers, third blocked by sale
      expect(isTransferred(mockFilteredData[0], transfers, salesData, mockFilteredData)).toBe(true);  // ID '1' - transfer
      expect(isTransferred(mockFilteredData[1], transfers, salesData, mockFilteredData)).toBe(true);  // ID '2' - transfer
      expect(isTransferred(mockFilteredData[2], transfers, salesData, mockFilteredData)).toBe(true);  // ID '3' - sale (first available)

      // All should be prevented from further transfers
      expect(hasActiveTransfer(mockFilteredData[0], transfers, salesData, mockFilteredData)).toBe(true);
      expect(hasActiveTransfer(mockFilteredData[1], transfers, salesData, mockFilteredData)).toBe(true);
      expect(hasActiveTransfer(mockFilteredData[2], transfers, salesData, mockFilteredData)).toBe(true);
    });

    test('User scenario: Sell 1, then transfer should work on remaining jackets', () => {
      // Sell first jacket
      const transfers = [];
      const salesData = [
        { barcode: '0010702300001', fullName: 'Ada czerwona 2xl', size: '2XL', date: '2025-08-07T12:00:00.000Z' }
      ];

      // First jacket blocked by sale, others should be transferable
      expect(isTransferred(mockFilteredData[0], transfers, salesData, mockFilteredData)).toBe(true);  // ID '1' - blocked by sale
      expect(isTransferred(mockFilteredData[1], transfers, salesData, mockFilteredData)).toBe(false); // ID '2' - available
      expect(isTransferred(mockFilteredData[2], transfers, salesData, mockFilteredData)).toBe(false); // ID '3' - available

      expect(hasActiveTransfer(mockFilteredData[0], transfers, salesData, mockFilteredData)).toBe(true);  // Can't transfer
      expect(hasActiveTransfer(mockFilteredData[1], transfers, salesData, mockFilteredData)).toBe(false); // Can transfer
      expect(hasActiveTransfer(mockFilteredData[2], transfers, salesData, mockFilteredData)).toBe(false); // Can transfer
    });
  });
});
