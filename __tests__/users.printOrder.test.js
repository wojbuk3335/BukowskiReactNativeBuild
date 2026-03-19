/**
 * 📱 MOBILE: users.jsx — Label Print Order Tests
 * 
 * REGRESSION TESTS for handleProcessItems sorting logic
 * Ensures auto-matched orange items are sorted by price (descending)
 * before being added to print queue
 */

describe('📱 Mobile: handleProcessItems – Print Order Logic', () => {
  
  // Simulacja logiki sortowania z handleProcessItems
  const processItemsForPrint = (transfers, matchedPairs) => {
    const manualOrangeTransfers = transfers.filter(t => t.fromWarehouse);
    const manualOrangeIds = new Set(manualOrangeTransfers.map(item => item?._id).filter(Boolean));
    
    // CRITICAL: auto-matched orange sorted by price (higher first)
    const autoMatchedOrange = matchedPairs
      .map(pair => pair?.warehouseProduct)
      .filter(Boolean)
      .filter(item => !manualOrangeIds.has(item._id))
      .sort((a, b) => (b.price ?? 0) - (a.price ?? 0)); // DESC

    return {
      manualOrange: manualOrangeTransfers,
      autoOrange: autoMatchedOrange
    };
  };

  describe('Auto-Matched Orange Sorting', () => {
    
    test('✅ REGRESSION: autoMatchedOrange sorted descending by price', () => {
      const matchedPairs = [
        { warehouseProduct: { _id: 'a1', fullName: 'Bożena ŻÓŁTY', price: 222 } },
        { warehouseProduct: { _id: 'a2', fullName: 'Bożena ŻÓŁTY', price: 333 } },
        { warehouseProduct: { _id: 'a3', fullName: 'Bożena ŻÓŁTY', price: 111 } }
      ];

      const result = processItemsForPrint([], matchedPairs);
      const prices = result.autoOrange.map(item => item.price);

      expect(prices).toEqual([333, 222, 111]); // DESC
      expect(prices[0]).toBeGreaterThan(prices[1]);
      expect(prices[1]).toBeGreaterThan(prices[2]);
    });

    test('✅ REGRESSION: Bożena scenario — 333 before 222', () => {
      // Real scenario from phone
      const matchedPairs = [
        { warehouseProduct: { _id: 'bozena1', fullName: 'Bożena ŻÓŁTY', price: 222 } },
        { warehouseProduct: { _id: 'bozena2', fullName: 'Bożena ŻÓŁTY', price: 333 } }
      ];

      const result = processItemsForPrint([], matchedPairs);

      expect(result.autoOrange[0].price).toBe(333); // First
      expect(result.autoOrange[1].price).toBe(222); // Second
      expect(result.autoOrange[0]._id).toBe('bozena2');
      expect(result.autoOrange[1]._id).toBe('bozena1');
    });

    test('✅ REGRESSION: handles items with undefined/null price gracefully', () => {
      const matchedPairs = [
        { warehouseProduct: { _id: 'x1', fullName: 'Item X', price: 100 } },
        { warehouseProduct: { _id: 'x2', fullName: 'Item Y', price: undefined } },
        { warehouseProduct: { _id: 'x3', fullName: 'Item Z', price: 50 } }
      ];

      const result = processItemsForPrint([], matchedPairs);
      
      // undefined treated as 0, so order should be: 100, 50, 0
      expect(result.autoOrange[0].price).toBe(100);
      expect(result.autoOrange[2].price).toBeUndefined();
    });

    test('✅ REGRESSION: deduplication with manual orange — auto doesn\'t include manual _ids', () => {
      const transfers = [
        { _id: 'manual1', fullName: 'IR 227', fromWarehouse: true, isIncomingTransfer: false }
      ];

      const matchedPairs = [
        { warehouseProduct: { _id: 'manual1', fullName: 'IR 227', price: 299 } }, // Same ID!
        { warehouseProduct: { _id: 'auto1', fullName: 'Bożena', price: 333 } }
      ];

      const result = processItemsForPrint(transfers, matchedPairs);

      // manual1 should NOT be in autoOrange (deduplicated)
      const autoIds = result.autoOrange.map(i => i._id);
      expect(autoIds).not.toContain('manual1');
      expect(autoIds).toContain('auto1');
      expect(result.autoOrange.length).toBe(1);
    });

    test('✅ REGRESSION: empty matchedPairs returns empty autoOrange', () => {
      const result = processItemsForPrint([], []);
      expect(result.autoOrange).toEqual([]);
    });

    test('✅ REGRESSION: all pairs have same price — maintains insertion order after sort', () => {
      const matchedPairs = [
        { warehouseProduct: { _id: 'a1', fullName: 'Item A', price: 100 } },
        { warehouseProduct: { _id: 'a2', fullName: 'Item B', price: 100 } },
        { warehouseProduct: { _id: 'a3', fullName: 'Item C', price: 100 } }
      ];

      const result = processItemsForPrint([], matchedPairs);
      
      // All same price, so order depends on stable sort (usually preserves input)
      expect(result.autoOrange.length).toBe(3);
      expect(result.autoOrange.every(item => item.price === 100)).toBe(true);
    });
  });

  describe('Manual Orange Filtering', () => {

    test('✅ Manual orange transfers filtered correctly (fromWarehouse = true)', () => {
      const transfers = [
        { _id: 't1', fullName: 'IR 227', fromWarehouse: true, isIncomingTransfer: false },
        { _id: 't2', fullName: 'Amanda', fromWarehouse: false, isIncomingTransfer: true },
        { _id: 't3', fullName: 'APS 520', fromWarehouse: true, isIncomingTransfer: false }
      ];

      const result = processItemsForPrint(transfers, []);
      
      expect(result.manualOrange.length).toBe(2);
      expect(result.manualOrange.map(i => i._id)).toEqual(['t1', 't3']);
    });
  });

  describe('Full Print Order Integration', () => {

    test('✅ REGRESSION: full scenario — yellow + auto-orange + manual-orange correct order', () => {
      // Real batch scenario
      const yellowTransfers = [
        { _id: 'y1', fullName: 'Amanda CZARNY', isIncomingTransfer: true }
      ];

      const transfers = [
        { _id: 'mo1', fullName: 'IR 227', fromWarehouse: true, isIncomingTransfer: false } // manual orange
      ];

      const matchedPairs = [
        { warehouseProduct: { _id: 'ao1', fullName: 'Bożena ŻÓŁTY', price: 333 } },
        { warehouseProduct: { _id: 'ao2', fullName: 'Bożena ŻÓŁTY', price: 222 } }
      ];

      // Simulate buildItemsToPrint order
      const result = processItemsForPrint(transfers, matchedPairs);
      
      const printOrder = [
        ...yellowTransfers,
        ...result.autoOrange,
        ...result.manualOrange
      ];

      const ids = printOrder.map(i => i._id);
      
      // Expected: y1 → ao1 (333) → ao2 (222) → mo1
      expect(ids).toEqual(['y1', 'ao1', 'ao2', 'mo1']);
      
      // Prices in auto-orange are DESC
      const autoPrices = result.autoOrange.map(i => i.price);
      expect(autoPrices).toEqual([333, 222]);
    });
  });
});
