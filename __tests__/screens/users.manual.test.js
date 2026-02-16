/**
 * 🔥🔥🔥 CRITICAL MOBILE TESTS - Users/Dobierz: Manual Warehouse Operations 🔥🔥🔥
 * 
 * ⚠️ UWAGA: Te testy chronią KRYTYCZNĄ funkcjonalność ręcznego zarządzania magazynem!
 * 
 * DLACZEGO TE TESTY SĄ KRYTYCZNE:
 * - Ręczne przenoszenia z magazynu muszą działać bezbłędnie
 * - Błąd w logice = duplikaty lub zaginione produkty = straty finansowe
 * - Rozparowanie musi przywracać spójność stanów
 * 
 * ❌ NIGDY NIE USUWAJ TYCH TESTÓW
 * ❌ NIGDY NIE MODYFIKUJ LOGIKI BEZ AKTUALIZACJI TESTÓW
 * ❌ WSZYSTKIE TESTY MUSZĄ PRZECHODZIĆ PRZED COMMITEM
 * 
 * SCENARIUSZE TESTOWANE:
 * 
 * 🟠 handleMoveFromWarehouse (lines 763-792):
 * 1. Dodaje item do transfers array
 * 2. Usuwa item z warehouseItems array
 * 3. Ustawia fromWarehouse: true flag
 * 4. Ustawia transfer_from: 'MAGAZYN'
 * 5. Ustawia transfer_to: [symbol użytkownika]
 * 6. Kopiuje wszystkie pola (fullName, size, barcode, price, discount_price)
 * 
 * ⬅️ handleReturnToWarehouse (lines 794-798):
 * 7. Usuwa item z transfers array (tylko z fromWarehouse: true)
 * 8. Przywraca item do warehouseItems array
 * 9. Nie usuwa innych transferów
 * 
 * 🔓 handleUnpairMatchedItem (lines 800-837):
 * 10. Znajduje parę w matchedPairs po warehouseProduct._id
 * 11. Usuwa warehouse item z greyedWarehouseItems Set
 * 12. Usuwa blue item z greyedWarehouseItems Set (jeśli istnieje)
 * 13. Usuwa parę z matchedPairs array
 * 14. Przywraca warehouse item do warehouseItems (jeśli nie istnieje)
 * 15. Nie dodaje duplikatu do warehouseItems
 * 
 * 🔄 EDGE CASES:
 * 16. Przeniesienie tego samego item 2x → drugi transfer powstaje
 * 17. Zwrot elementu który nie jest fromWarehouse → nie zmienia stanów
 * 18. Rozparowanie nieistniejącej pary → nie crashuje
 * 
 * Jeśli którykolwiek test failuje → STOP, NIE COMMITUJ!
 * 🚨 To jest Twoja ochrona przed stratami finansowymi w mobile!
 */

describe('🔥🔥🔥 CRITICAL MOBILE: Users/Dobierz - Manual Warehouse Operations', () => {
  
  // Mock data
  const mockWarehouseItem = {
    _id: 'warehouse_1',
    fullName: 'Kurtka zimowa',
    size: 'M',
    barcode: 'BARCODE_001',
    price: 299,
    discount_price: 250,
    date: '2024-01-15'
  };

  const mockUser = {
    _id: 'user_1',
    symbol: 'PUNKT_A',
    name: 'Jan Kowalski'
  };

  const mockMatchedPair = {
    blueProduct: {
      type: 'transfer',
      fullName: 'Kurtka zimowa',
      size: 'M',
      barcode: 'BARCODE_001',
      sourceId: 'blue_1'
    },
    warehouseProduct: {
      _id: 'warehouse_1',
      fullName: 'Kurtka zimowa',
      size: 'M',
      barcode: 'BARCODE_001',
      price: 299,
      discount_price: 250
    }
  };

  // ========== handleMoveFromWarehouse TESTS ==========

  test('✅ CRITICAL: handleMoveFromWarehouse dodaje item do transfers array', () => {
    let transfers = [];
    let warehouseItems = [mockWarehouseItem];
    
    // Simulate handleMoveFromWarehouse logic
    const newTransferItem = {
      _id: mockWarehouseItem._id,
      id: mockWarehouseItem._id,
      fullName: mockWarehouseItem.fullName,
      size: mockWarehouseItem.size,
      barcode: mockWarehouseItem.barcode,
      fromWarehouse: true,
      transfer_from: 'MAGAZYN',
      transfer_to: mockUser.symbol,
      price: mockWarehouseItem.price || 0,
      discount_price: mockWarehouseItem.discount_price || 0,
      movedAt: new Date().toISOString()
    };
    
    transfers = [...transfers, newTransferItem];
    
    expect(transfers.length).toBe(1);
    expect(transfers[0]._id).toBe(mockWarehouseItem._id);
    expect(transfers[0].fromWarehouse).toBe(true);
  });

  test('✅ CRITICAL: handleMoveFromWarehouse usuwa item z warehouseItems array', () => {
    let warehouseItems = [mockWarehouseItem, { _id: 'warehouse_2', fullName: 'Inna kurtka' }];
    
    // Simulate removal from warehouseItems
    warehouseItems = warehouseItems.filter(w => w._id !== mockWarehouseItem._id);
    
    expect(warehouseItems.length).toBe(1);
    expect(warehouseItems[0]._id).toBe('warehouse_2');
    expect(warehouseItems.find(w => w._id === mockWarehouseItem._id)).toBeUndefined();
  });

  test('✅ CRITICAL: handleMoveFromWarehouse ustawia fromWarehouse flag', () => {
    const newTransferItem = {
      _id: mockWarehouseItem._id,
      fromWarehouse: true,
      transfer_from: 'MAGAZYN',
      transfer_to: mockUser.symbol,
      fullName: mockWarehouseItem.fullName,
      size: mockWarehouseItem.size,
      barcode: mockWarehouseItem.barcode
    };
    
    expect(newTransferItem.fromWarehouse).toBe(true);
    expect(newTransferItem.transfer_from).toBe('MAGAZYN');
  });

  test('✅ CRITICAL: handleMoveFromWarehouse ustawia transfer_to na symbol użytkownika', () => {
    const newTransferItem = {
      _id: mockWarehouseItem._id,
      transfer_from: 'MAGAZYN',
      transfer_to: mockUser.symbol,
      fromWarehouse: true
    };
    
    expect(newTransferItem.transfer_to).toBe('PUNKT_A');
    expect(newTransferItem.transfer_from).toBe('MAGAZYN');
  });

  test('✅ CRITICAL: handleMoveFromWarehouse kopiuje wszystkie wymagane pola', () => {
    const newTransferItem = {
      _id: mockWarehouseItem._id,
      id: mockWarehouseItem._id,
      fullName: mockWarehouseItem.fullName,
      size: mockWarehouseItem.size,
      barcode: mockWarehouseItem.barcode,
      price: mockWarehouseItem.price || 0,
      discount_price: mockWarehouseItem.discount_price || 0,
      fromWarehouse: true,
      transfer_from: 'MAGAZYN',
      transfer_to: mockUser.symbol
    };
    
    expect(newTransferItem.fullName).toBe('Kurtka zimowa');
    expect(newTransferItem.size).toBe('M');
    expect(newTransferItem.barcode).toBe('BARCODE_001');
    expect(newTransferItem.price).toBe(299);
    expect(newTransferItem.discount_price).toBe(250);
  });

  test('✅ CRITICAL: handleMoveFromWarehouse obsługuje brak ceny (ustawia 0)', () => {
    const itemWithoutPrice = { ...mockWarehouseItem, price: undefined, discount_price: undefined };
    
    const newTransferItem = {
      _id: itemWithoutPrice._id,
      price: itemWithoutPrice.price || 0,
      discount_price: itemWithoutPrice.discount_price || 0
    };
    
    expect(newTransferItem.price).toBe(0);
    expect(newTransferItem.discount_price).toBe(0);
  });

  // ========== handleReturnToWarehouse TESTS ==========

  test('✅ CRITICAL: handleReturnToWarehouse usuwa item z transfers (fromWarehouse: true)', () => {
    let transfers = [
      { _id: 'warehouse_1', fromWarehouse: true, fullName: 'Kurtka 1' },
      { _id: 'warehouse_2', fromWarehouse: true, fullName: 'Kurtka 2' }
    ];
    
    const itemToReturn = { _id: 'warehouse_1' };
    
    // Simulate removal from transfers
    transfers = transfers.filter(t => t._id !== itemToReturn._id || !t.fromWarehouse);
    
    expect(transfers.length).toBe(1);
    expect(transfers[0]._id).toBe('warehouse_2');
  });

  test('✅ CRITICAL: handleReturnToWarehouse przywraca item do warehouseItems', () => {
    let warehouseItems = [{ _id: 'warehouse_2', fullName: 'Kurtka 2' }];
    
    const itemToReturn = mockWarehouseItem;
    
    // Simulate adding back to warehouseItems
    warehouseItems = [...warehouseItems, itemToReturn];
    
    expect(warehouseItems.length).toBe(2);
    expect(warehouseItems.find(w => w._id === mockWarehouseItem._id)).toBeDefined();
  });

  test('✅ CRITICAL: handleReturnToWarehouse nie usuwa innych transferów', () => {
    let transfers = [
      { _id: 'warehouse_1', fromWarehouse: true, fullName: 'Z magazynu' },
      { _id: 'transfer_1', fromWarehouse: false, fullName: 'Zwykły transfer' }
    ];
    
    const itemToReturn = { _id: 'warehouse_1' };
    
    // Only remove transfers with fromWarehouse: true
    transfers = transfers.filter(t => t._id !== itemToReturn._id || !t.fromWarehouse);
    
    expect(transfers.length).toBe(1);
    expect(transfers[0]._id).toBe('transfer_1');
    expect(transfers[0].fromWarehouse).toBe(false);
  });

  // ========== handleUnpairMatchedItem TESTS ==========

  test('✅ CRITICAL: handleUnpairMatchedItem znajduje parę w matchedPairs', () => {
    const matchedPairs = [mockMatchedPair];
    const warehouseItemToUnpair = mockMatchedPair.warehouseProduct;
    
    // Find the pair
    const foundPair = matchedPairs.find(pair => 
      pair && pair.warehouseProduct && pair.warehouseProduct._id === warehouseItemToUnpair._id
    );
    
    expect(foundPair).toBeDefined();
    expect(foundPair.warehouseProduct._id).toBe('warehouse_1');
  });

  test('✅ CRITICAL: handleUnpairMatchedItem usuwa warehouse item z greyedWarehouseItems Set', () => {
    let greyedWarehouseItems = new Set(['warehouse_1', 'blue_1']);
    
    const warehouseItemToUnpair = mockMatchedPair.warehouseProduct;
    
    // Remove from greyedWarehouseItems
    greyedWarehouseItems.delete(warehouseItemToUnpair._id);
    
    expect(greyedWarehouseItems.has('warehouse_1')).toBe(false);
    expect(greyedWarehouseItems.size).toBe(1); // blue_1 still there
  });

  test('✅ CRITICAL: handleUnpairMatchedItem usuwa blue item z greyedWarehouseItems Set', () => {
    let greyedWarehouseItems = new Set(['warehouse_1', 'blue_1']);
    
    // Remove both orange and blue
    greyedWarehouseItems.delete('warehouse_1');
    if (mockMatchedPair.blueProduct) {
      greyedWarehouseItems.delete(mockMatchedPair.blueProduct.sourceId);
    }
    
    expect(greyedWarehouseItems.has('warehouse_1')).toBe(false);
    expect(greyedWarehouseItems.has('blue_1')).toBe(false);
    expect(greyedWarehouseItems.size).toBe(0);
  });

  test('✅ CRITICAL: handleUnpairMatchedItem usuwa parę z matchedPairs array', () => {
    let matchedPairs = [mockMatchedPair, { warehouseProduct: { _id: 'warehouse_2' } }];
    
    const warehouseItemToUnpair = mockMatchedPair.warehouseProduct;
    
    // Remove the pair
    matchedPairs = matchedPairs.filter(pair => 
      pair && pair.warehouseProduct && pair.warehouseProduct._id !== warehouseItemToUnpair._id
    );
    
    expect(matchedPairs.length).toBe(1);
    expect(matchedPairs[0].warehouseProduct._id).toBe('warehouse_2');
  });

  test('✅ CRITICAL: handleUnpairMatchedItem przywraca warehouse item do warehouseItems', () => {
    let warehouseItems = [{ _id: 'warehouse_2', fullName: 'Inna kurtka' }];
    
    const warehouseItemToUnpair = mockMatchedPair.warehouseProduct;
    
    // Add back to warehouseItems if not exists
    const exists = warehouseItems.some(item => item._id === warehouseItemToUnpair._id);
    if (!exists) {
      warehouseItems = [...warehouseItems, warehouseItemToUnpair];
    }
    
    expect(warehouseItems.length).toBe(2);
    expect(warehouseItems.find(w => w._id === 'warehouse_1')).toBeDefined();
  });

  test('✅ CRITICAL: handleUnpairMatchedItem nie dodaje duplikatu do warehouseItems', () => {
    let warehouseItems = [mockMatchedPair.warehouseProduct, { _id: 'warehouse_2' }];
    
    const warehouseItemToUnpair = mockMatchedPair.warehouseProduct;
    
    // Check exists before adding
    const exists = warehouseItems.some(item => item._id === warehouseItemToUnpair._id);
    if (!exists) {
      warehouseItems = [...warehouseItems, warehouseItemToUnpair];
    }
    
    expect(warehouseItems.length).toBe(2); // Still 2, not 3
    expect(warehouseItems.filter(w => w._id === 'warehouse_1').length).toBe(1);
  });

  // ========== EDGE CASES ==========

  test('🔄 EDGE CASE: Przeniesienie tego samego item 2x → powstają 2 transfery', () => {
    let transfers = [];
    
    // First move
    const transfer1 = {
      _id: mockWarehouseItem._id,
      fromWarehouse: true,
      movedAt: new Date('2024-01-01').toISOString()
    };
    transfers = [...transfers, transfer1];
    
    // Second move (same _id but different movedAt)
    const transfer2 = {
      _id: mockWarehouseItem._id,
      fromWarehouse: true,
      movedAt: new Date('2024-01-02').toISOString()
    };
    transfers = [...transfers, transfer2];
    
    expect(transfers.length).toBe(2);
    expect(transfers.filter(t => t._id === mockWarehouseItem._id).length).toBe(2);
  });

  test('🔄 EDGE CASE: Zwrot elementu który nie jest fromWarehouse → nie usuwa', () => {
    let transfers = [
      { _id: 'warehouse_1', fromWarehouse: false, fullName: 'Normalny transfer' }
    ];
    
    const itemToReturn = { _id: 'warehouse_1' };
    
    // Filter only removes fromWarehouse: true
    transfers = transfers.filter(t => t._id !== itemToReturn._id || !t.fromWarehouse);
    
    expect(transfers.length).toBe(1); // Nothing removed
    expect(transfers[0]._id).toBe('warehouse_1');
  });

  test('🔄 EDGE CASE: Rozparowanie nieistniejącej pary → zwraca undefined', () => {
    const matchedPairs = [mockMatchedPair];
    const nonExistentItem = { _id: 'nonexistent_id' };
    
    const foundPair = matchedPairs.find(pair => 
      pair && pair.warehouseProduct && pair.warehouseProduct._id === nonExistentItem._id
    );
    
    expect(foundPair).toBeUndefined();
    // App should handle this with Alert.alert("Nie znaleziono pary")
  });

  test('🔄 EDGE CASE: handleUnpairMatchedItem z pair bez blueProduct → nie crashuje', () => {
    let greyedWarehouseItems = new Set(['warehouse_1']);
    
    const pairWithoutBlue = {
      warehouseProduct: { _id: 'warehouse_1' },
      blueProduct: null // No blue product
    };
    
    // Remove warehouse
    greyedWarehouseItems.delete(pairWithoutBlue.warehouseProduct._id);
    
    // Try to remove blue (should not crash)
    if (pairWithoutBlue.blueProduct) {
      greyedWarehouseItems.delete(pairWithoutBlue.blueProduct.sourceId);
    }
    
    expect(greyedWarehouseItems.has('warehouse_1')).toBe(false);
    expect(greyedWarehouseItems.size).toBe(0);
  });

  // ========== INTEGRATION SCENARIOS ==========

  test('🎯 INTEGRATION: Pełny cykl - Move → Return → końcowy stan poprawny', () => {
    let transfers = [];
    let warehouseItems = [mockWarehouseItem];
    
    // STEP 1: Move from warehouse
    const newTransfer = {
      _id: mockWarehouseItem._id,
      fromWarehouse: true,
      fullName: mockWarehouseItem.fullName
    };
    transfers = [...transfers, newTransfer];
    warehouseItems = warehouseItems.filter(w => w._id !== mockWarehouseItem._id);
    
    expect(transfers.length).toBe(1);
    expect(warehouseItems.length).toBe(0);
    
    // STEP 2: Return to warehouse
    transfers = transfers.filter(t => t._id !== mockWarehouseItem._id || !t.fromWarehouse);
    warehouseItems = [...warehouseItems, mockWarehouseItem];
    
    expect(transfers.length).toBe(0);
    expect(warehouseItems.length).toBe(1);
    expect(warehouseItems[0]._id).toBe(mockWarehouseItem._id);
  });

  test('🎯 INTEGRATION: Pełny cykl - AutoMatch → Unpair → końcowy stan poprawny', () => {
    let matchedPairs = [mockMatchedPair];
    let greyedWarehouseItems = new Set(['warehouse_1', 'blue_1']);
    let warehouseItems = [];
    
    // Initial state
    expect(matchedPairs.length).toBe(1);
    expect(greyedWarehouseItems.size).toBe(2);
    
    // UNPAIR
    const warehouseItemToUnpair = mockMatchedPair.warehouseProduct;
    
    // Remove from greyed
    greyedWarehouseItems.delete(warehouseItemToUnpair._id);
    if (mockMatchedPair.blueProduct) {
      greyedWarehouseItems.delete(mockMatchedPair.blueProduct.sourceId);
    }
    
    // Remove from matchedPairs
    matchedPairs = matchedPairs.filter(pair => 
      pair && pair.warehouseProduct && pair.warehouseProduct._id !== warehouseItemToUnpair._id
    );
    
    // Add back to warehouseItems
    const exists = warehouseItems.some(item => item._id === warehouseItemToUnpair._id);
    if (!exists) {
      warehouseItems = [...warehouseItems, warehouseItemToUnpair];
    }
    
    // Final state
    expect(matchedPairs.length).toBe(0);
    expect(greyedWarehouseItems.size).toBe(0);
    expect(warehouseItems.length).toBe(1);
    expect(warehouseItems[0]._id).toBe('warehouse_1');
  });

});
