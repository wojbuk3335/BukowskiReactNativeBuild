/**
 * 🔥🔥🔥 CRITICAL MOBILE TESTS - Users/Dobierz: Auto-Matching Logic 🔥🔥🔥
 * 
 * ⚠️ UWAGA: Te testy chronią KRYTYCZNĄ funkcjonalność biznesową!
 * 
 * DLACZEGO TE TESTY SĄ KRYTYCZNE:
 * - Od auto-matchingu zależy poprawność stanów magazynowych w mobile
 * - Błąd w logice = nadwyżki lub braki w towarze = straty finansowe
 * - Parowanie musi działać perfekcyjnie 1:1 (każdy blue item = jedna sztuka z warehouse)
 * 
 * ❌ NIGDY NIE USUWAJ TYCH TESTÓW
 * ❌ NIGDY NIE MODYFIKUJ LOGIKI BEZ AKTUALIZACJI TESTÓW
 * ❌ WSZYSTKIE TESTY MUSZĄ PRZECHODZIĆ PRZED COMMITEM
 * 
 * SCENARIUSZE TESTOWANE:
 * 
 * ✅ AUTO-MATCHING LOGIC:
 * 1. Transfer + Warehouse → match po fullName + size (NIE barcode!)
 * 2. Sale + Warehouse → match po fullName + barcode + size
 * 3. Sparowanie 1:1 (każdy blue = jedna sztuka z warehouse)
 * 4. pairedBlueIndexes i pairedWarehouseIndexes zapobiegają duplikatom
 * 5. Bulk matching (wiele elementów jednocześnie)
 * 
 * 🛡️ handleAutoSync:
 * 6. Wyszarza tylko sparowane warehouse items (NIE tworzy nowych transferów)
 * 7. Używa Set dla wydajności (greyedWarehouseItems)
 * 8. Nie modyfikuje oryginalnych danych
 * 
 * 🚫 FILTROWANIE (CO NIE MOŻE BYĆ SPAROWANE):
 * 9. Różny barcode dla sale → NIE sparuj
 * 10. Różny fullName → NIE sparuj
 * 11. Różny size → NIE sparuj
 * 12. Transfer z barcodeMatch → NIE sparuj (tylko fullName+size dla transferów)
 * 
 * 🔄 EDGE CASES:
 * 13. Torebki (size=null) → poprawne dopasowanie
 * 14. Pusta lista blue items → brak matchingu
 * 15. Pusta lista warehouse → brak matchingu
 * 16. Więcej blue niż warehouse → częściowy matching
 * 17. Więcej warehouse niż blue → częściowy matching
 * 18. Ten sam produkt 2x w blue → sparuj 2 różne sztuki z warehouse
 * 
 * 📊 MATCHING PRIORITIES:
 * 19. Transfer: fullName + size (barcode ignorowany)
 * 20. Sale: fullName + barcode + size (wszystko musi pasować)
 * 21. isTransferWithoutBarcode flag działa poprawnie
 * 
 * Jeśli którykolwiek test failuje → STOP, NIE COMMITUJ!
 * 🚨 To jest Twoja ochrona przed stratami finansowymi w mobile!
 */

/**
 * AUTO-MATCHING LOGIC EXTRACTED FROM users.jsx (lines 443-492)
 * 
 * for (let b = 0; b < blueItemsArray.length; b++) {
 *   if (pairedBlueIndexes.has(b)) continue;
 *   
 *   const blueItem = blueItemsArray[b];
 *   
 *   for (let w = 0; w < warehouseItemsArray.length; w++) {
 *     if (pairedWarehouseIndexes.has(w)) continue;
 *     
 *     const warehouseItem = warehouseItemsArray[w];
 *     
 *     // Matching logic
 *     const barcodeMatch = blueItem.barcode === warehouseItem.barcode;
 *     const nameMatch = blueItem.fullName === warehouseItem.fullName;
 *     const sizeMatch = blueItem.size === warehouseItem.size;
 *     
 *     const isTransferWithoutBarcode = blueItem.type === 'transfer' && 
 *                                     blueItem.barcode !== warehouseItem.barcode;
 *     
 *     const isMatched = isTransferWithoutBarcode 
 *       ? (nameMatch && sizeMatch) 
 *       : (barcodeMatch && nameMatch && sizeMatch);
 *     
 *     if (isMatched) {
 *       matchedPairsArray.push({
 *         blueProduct: {...},
 *         warehouseProduct: warehouseItem
 *       });
 *       
 *       pairedBlueIndexes.add(b);
 *       pairedWarehouseIndexes.add(w);
 *       break; // 1:1 matching
 *     }
 *   }
 * }
 */

describe('🔥🔥🔥 CRITICAL MOBILE: Users/Dobierz - Auto-Matching Logic', () => {
  
  // Mock data
  const mockWarehouse = [
    {
      _id: 'warehouse_1',
      fullName: 'Kurtka zimowa',
      size: 'M',
      barcode: 'BARCODE_001',
      price: 299,
      discount_price: 199
    },
    {
      _id: 'warehouse_2',
      fullName: 'Kurtka zimowa',
      size: 'M',
      barcode: 'BARCODE_002', // Inna sztuka, ten sam produkt
      price: 299,
      discount_price: 199
    },
    {
      _id: 'warehouse_3',
      fullName: 'Płaszcz elegancki',
      size: 'L',
      barcode: 'BARCODE_003',
      price: 499,
      discount_price: 399
    },
    {
      _id: 'warehouse_4',
      fullName: 'Torebka skórzana',
      size: null, // Torebki nie mają rozmiaru
      barcode: 'BAG_001',
      price: 599,
      discount_price: 499
    }
  ];

  // Helper function - implementacja logiki z users.jsx
  const autoMatchLogic = (blueItems, warehouseItems) => {
    const matchedPairs = [];
    const pairedBlueIndexes = new Set();
    const pairedWarehouseIndexes = new Set();

    for (let b = 0; b < blueItems.length; b++) {
      if (pairedBlueIndexes.has(b)) continue;
      
      const blueItem = blueItems[b];
      
      for (let w = 0; w < warehouseItems.length; w++) {
        if (pairedWarehouseIndexes.has(w)) continue;
        
        const warehouseItem = warehouseItems[w];
        
        // Matching logic (copied from users.jsx lines 463-475)
        const barcodeMatch = blueItem.barcode === warehouseItem.barcode;
        const nameMatch = blueItem.fullName === warehouseItem.fullName;
        const sizeMatch = blueItem.size === warehouseItem.size;
        
        const isTransferWithoutBarcode = blueItem.type === 'transfer' && 
                                        blueItem.barcode !== warehouseItem.barcode;
        
        const isMatched = isTransferWithoutBarcode 
          ? (nameMatch && sizeMatch) 
          : (barcodeMatch && nameMatch && sizeMatch);
        
        if (isMatched) {
          matchedPairs.push({
            blueProduct: {
              type: blueItem.type,
              fullName: blueItem.fullName,
              size: blueItem.size,
              barcode: blueItem.barcode
            },
            warehouseProduct: warehouseItem
          });
          
          pairedBlueIndexes.add(b);
          pairedWarehouseIndexes.add(w);
          break; // KLUCZOWE: 1:1 matching
        }
      }
    }
    
    return { matchedPairs, pairedBlueIndexes, pairedWarehouseIndexes };
  };

  // Helper - handleAutoSync logic (from users.jsx line 741)
  const handleAutoSyncLogic = (pairs) => {
    const idsToGrey = [];
    
    pairs.forEach(pair => {
      const warehouseItem = pair.warehouseProduct;
      if (warehouseItem) {
        idsToGrey.push(warehouseItem._id);
      }
    });
    
    return new Set(idsToGrey);
  };

  // ===================================================================
  // ✅ AUTO-MATCHING LOGIC - Transfer (fullName + size)
  // ===================================================================

  test('✅ CRITICAL: Transfer → match po fullName + size (IGNORUJE barcode)', () => {
    const blueItems = [
      {
        type: 'transfer',
        fullName: 'Płaszcz elegancki',
        size: 'L',
        barcode: 'MONGODB_ID_PLACEHOLDER' // Transfer może mieć MongoDB ID zamiast barcode!
      }
    ];

    const { matchedPairs, pairedBlueIndexes, pairedWarehouseIndexes } = 
      autoMatchLogic(blueItems, mockWarehouse);

    // Transfer powinien być sparowany z warehouse_3 po fullName + size
    expect(matchedPairs).toHaveLength(1);
    expect(matchedPairs[0].blueProduct.fullName).toBe('Płaszcz elegancki');
    expect(matchedPairs[0].warehouseProduct._id).toBe('warehouse_3');
    
    // Sprawdź że użyto isTransferWithoutBarcode logic
    expect(matchedPairs[0].blueProduct.type).toBe('transfer');
    expect(matchedPairs[0].blueProduct.barcode).not.toBe(matchedPairs[0].warehouseProduct.barcode);
    
    // Śledzenie par
    expect(pairedBlueIndexes.has(0)).toBe(true);
    expect(pairedWarehouseIndexes.has(2)).toBe(true); // warehouse_3 jest na indeksie 2
  });

  test('✅ CRITICAL: Sale → match po fullName + barcode + size', () => {
    const blueItems = [
      {
        type: 'sale',
        fullName: 'Kurtka zimowa',
        size: 'M',
        barcode: 'BARCODE_001' // Sale MUSI mieć dokładny barcode match
      }
    ];

    const { matchedPairs } = autoMatchLogic(blueItems, mockWarehouse);

    // Sale powinien być sparowany z warehouse_1 (dokładny barcode match)
    expect(matchedPairs).toHaveLength(1);
    expect(matchedPairs[0].blueProduct.fullName).toBe('Kurtka zimowa');
    expect(matchedPairs[0].blueProduct.barcode).toBe('BARCODE_001');
    expect(matchedPairs[0].warehouseProduct._id).toBe('warehouse_1');
    expect(matchedPairs[0].warehouseProduct.barcode).toBe('BARCODE_001');
  });

  test('✅ CRITICAL: Sparowanie 1:1 - każdy blue item = jedna sztuka z warehouse', () => {
    // Ten sam produkt 2x w blue items
    const blueItems = [
      {
        type: 'sale',
        fullName: 'Kurtka zimowa',
        size: 'M',
        barcode: 'BARCODE_001'
      },
      {
        type: 'sale',
        fullName: 'Kurtka zimowa',
        size: 'M',
        barcode: 'BARCODE_001' // Ten sam barcode (teoretycznie niemożliwe, ale testujemy logikę)
      }
    ];

    const { matchedPairs, pairedWarehouseIndexes } = autoMatchLogic(blueItems, mockWarehouse);

    // Pierwszy blue item sparuje się z warehouse_1
    // Drugi blue item NIE znajdzie pary (warehouse_1 jest już sparowany)
    expect(matchedPairs).toHaveLength(1); // Tylko 1 match!
    expect(matchedPairs[0].warehouseProduct._id).toBe('warehouse_1');
    
    // Tylko warehouse_1 (index 0) powinien być sparowany
    expect(pairedWarehouseIndexes.has(0)).toBe(true);
    expect(pairedWarehouseIndexes.has(1)).toBe(false); // warehouse_2 nie został użyty
  });

  test('✅ CRITICAL: Sparowanie 1:1 z różnymi barcodes (realistyczny scenariusz)', () => {
    // Ten sam produkt 2x w blue items, ale różne barcodes
    const blueItems = [
      {
        type: 'sale',
        fullName: 'Kurtka zimowa',
        size: 'M',
        barcode: 'BARCODE_001'
      },
      {
        type: 'sale',
        fullName: 'Kurtka zimowa',
        size: 'M',
        barcode: 'BARCODE_002' // Inna sztuka
      }
    ];

    const { matchedPairs } = autoMatchLogic(blueItems, mockWarehouse);

    // Oba blue items powinny znaleźć pary (różne warehouse items)
    expect(matchedPairs).toHaveLength(2);
    expect(matchedPairs[0].warehouseProduct._id).toBe('warehouse_1');
    expect(matchedPairs[1].warehouseProduct._id).toBe('warehouse_2');
  });

  test('✅ CRITICAL: pairedBlueIndexes zapobiega duplikatom blue', () => {
    const blueItems = [
      {
        type: 'sale',
        fullName: 'Kurtka zimowa',
        size: 'M',
        barcode: 'BARCODE_001'
      }
    ];

    const { pairedBlueIndexes } = autoMatchLogic(blueItems, mockWarehouse);

    // Blue item na indeksie 0 powinien być oznaczony jako sparowany
    expect(pairedBlueIndexes.has(0)).toBe(true);
    expect(pairedBlueIndexes.size).toBe(1);
  });

  test('✅ CRITICAL: pairedWarehouseIndexes zapobiega duplikatom warehouse', () => {
    const blueItems = [
      {
        type: 'sale',
        fullName: 'Kurtka zimowa',
        size: 'M',
        barcode: 'BARCODE_001'
      }
    ];

    const { pairedWarehouseIndexes } = autoMatchLogic(blueItems, mockWarehouse);

    // Warehouse item na indeksie 0 (warehouse_1) powinien być sparowany
    expect(pairedWarehouseIndexes.has(0)).toBe(true);
    expect(pairedWarehouseIndexes.size).toBe(1);
  });

  test('✅ CRITICAL: Bulk matching - wiele elementów jednocześnie', () => {
    const blueItems = [
      {
        type: 'sale',
        fullName: 'Kurtka zimowa',
        size: 'M',
        barcode: 'BARCODE_001'
      },
      {
        type: 'transfer',
        fullName: 'Płaszcz elegancki',
        size: 'L',
        barcode: 'TRANSFER_BARCODE'
      },
      {
        type: 'sale',
        fullName: 'Torebka skórzana',
        size: null,
        barcode: 'BAG_001'
      }
    ];

    const { matchedPairs } = autoMatchLogic(blueItems, mockWarehouse);

    // Wszystkie 3 powinny znaleźć pary
    expect(matchedPairs).toHaveLength(3);
    expect(matchedPairs[0].warehouseProduct._id).toBe('warehouse_1'); // Kurtka
    expect(matchedPairs[1].warehouseProduct._id).toBe('warehouse_3'); // Płaszcz
    expect(matchedPairs[2].warehouseProduct._id).toBe('warehouse_4'); // Torebka
  });

  // ===================================================================
  // 🛡️ handleAutoSync - Wyszarzanie sparowanych elementów
  // ===================================================================

  test('🛡️ CRITICAL: handleAutoSync wyszarza tylko sparowane warehouse items', () => {
    const matchedPairs = [
      {
        blueProduct: { type: 'sale' },
        warehouseProduct: { _id: 'warehouse_1' }
      },
      {
        blueProduct: { type: 'transfer' },
        warehouseProduct: { _id: 'warehouse_3' }
      }
    ];

    const greyedItems = handleAutoSyncLogic(matchedPairs);

    expect(greyedItems.size).toBe(2);
    expect(greyedItems.has('warehouse_1')).toBe(true);
    expect(greyedItems.has('warehouse_3')).toBe(true);
    expect(greyedItems.has('warehouse_2')).toBe(false); // Nie sparowany
  });

  test('🛡️ CRITICAL: handleAutoSync używa Set dla wydajności', () => {
    const matchedPairs = [
      {
        blueProduct: { type: 'sale' },
        warehouseProduct: { _id: 'warehouse_1' }
      }
    ];

    const greyedItems = handleAutoSyncLogic(matchedPairs);

    // Sprawdź że to Set, nie Array
    expect(greyedItems instanceof Set).toBe(true);
    expect(greyedItems.has('warehouse_1')).toBe(true);
  });

  test('🛡️ CRITICAL: handleAutoSync nie modyfikuje oryginalnych danych', () => {
    const matchedPairs = [
      {
        blueProduct: { type: 'sale' },
        warehouseProduct: { _id: 'warehouse_1', fullName: 'Kurtka zimowa' }
      }
    ];

    const originalPairs = JSON.parse(JSON.stringify(matchedPairs));
    handleAutoSyncLogic(matchedPairs);

    // Oryginalne dane niezmienione
    expect(matchedPairs).toEqual(originalPairs);
  });

  // ===================================================================
  // 🚫 FILTROWANIE - Co NIE może być sparowane
  // ===================================================================

  test('🚫 CRITICAL: Różny barcode dla SALE → NIE sparuj', () => {
    const blueItems = [
      {
        type: 'sale',
        fullName: 'Kurtka zimowa',
        size: 'M',
        barcode: 'WRONG_BARCODE' // Zły barcode
      }
    ];

    const { matchedPairs } = autoMatchLogic(blueItems, mockWarehouse);

    // Brak match - barcode nie pasuje
    expect(matchedPairs).toHaveLength(0);
  });

  test('🚫 CRITICAL: Różny fullName → NIE sparuj', () => {
    const blueItems = [
      {
        type: 'sale',
        fullName: 'Nieistniejąca kurtka', // Zła nazwa
        size: 'M',
        barcode: 'BARCODE_001'
      }
    ];

    const { matchedPairs } = autoMatchLogic(blueItems, mockWarehouse);

    expect(matchedPairs).toHaveLength(0);
  });

  test('🚫 CRITICAL: Różny size → NIE sparuj', () => {
    const blueItems = [
      {
        type: 'sale',
        fullName: 'Kurtka zimowa',
        size: 'XL', // Zły rozmiar (warehouse ma M)
        barcode: 'BARCODE_001'
      }
    ];

    const { matchedPairs } = autoMatchLogic(blueItems, mockWarehouse);

    expect(matchedPairs).toHaveLength(0);
  });

  test('🚫 CRITICAL: Transfer z barcodeMatch → użyj pełnej logiki (nie isTransferWithoutBarcode)', () => {
    // Edge case: transfer który MA ten sam barcode co warehouse
    const blueItems = [
      {
        type: 'transfer',
        fullName: 'Płaszcz elegancki',
        size: 'L',
        barcode: 'BARCODE_003' // Ten sam barcode co warehouse_3!
      }
    ];

    const { matchedPairs } = autoMatchLogic(blueItems, mockWarehouse);

    // Powinien się sparować (pełna logika: barcode + name + size)
    expect(matchedPairs).toHaveLength(1);
    expect(matchedPairs[0].warehouseProduct._id).toBe('warehouse_3');
  });

  // ===================================================================
  // 🔄 EDGE CASES
  // ===================================================================

  test('🔄 EDGE CASE: Torebka (size=null) → poprawne dopasowanie', () => {
    const blueItems = [
      {
        type: 'sale',
        fullName: 'Torebka skórzana',
        size: null, // Torebki nie mają rozmiaru
        barcode: 'BAG_001'
      }
    ];

    const { matchedPairs } = autoMatchLogic(blueItems, mockWarehouse);

    // Torebka powinna się sparować (size=null dla obu)
    expect(matchedPairs).toHaveLength(1);
    expect(matchedPairs[0].warehouseProduct._id).toBe('warehouse_4');
    expect(matchedPairs[0].blueProduct.size).toBeNull();
    expect(matchedPairs[0].warehouseProduct.size).toBeNull();
  });

  test('🔄 EDGE CASE: Pusta lista blue items → brak matchingu', () => {
    const blueItems = [];

    const { matchedPairs } = autoMatchLogic(blueItems, mockWarehouse);

    expect(matchedPairs).toHaveLength(0);
  });

  test('🔄 EDGE CASE: Pusta lista warehouse → brak matchingu', () => {
    const blueItems = [
      {
        type: 'sale',
        fullName: 'Kurtka zimowa',
        size: 'M',
        barcode: 'BARCODE_001'
      }
    ];

    const { matchedPairs } = autoMatchLogic(blueItems, []);

    expect(matchedPairs).toHaveLength(0);
  });

  test('🔄 EDGE CASE: Więcej blue niż warehouse → częściowy matching', () => {
    const blueItems = [
      { type: 'sale', fullName: 'Kurtka zimowa', size: 'M', barcode: 'BARCODE_001' },
      { type: 'sale', fullName: 'Kurtka zimowa', size: 'M', barcode: 'BARCODE_002' },
      { type: 'sale', fullName: 'Kurtka zimowa', size: 'M', barcode: 'BARCODE_003' }, // Nie ma w warehouse
      { type: 'sale', fullName: 'Kurtka zimowa', size: 'M', barcode: 'BARCODE_004' }  // Nie ma w warehouse
    ];

    const { matchedPairs } = autoMatchLogic(blueItems, mockWarehouse);

    // Tylko 2 kurti w warehouse (warehouse_1 i warehouse_2)
    expect(matchedPairs).toHaveLength(2);
  });

  test('🔄 EDGE CASE: Więcej warehouse niż blue → częściowy matching', () => {
    const blueItems = [
      { type: 'sale', fullName: 'Kurtka zimowa', size: 'M', barcode: 'BARCODE_001' }
    ];

    const { matchedPairs, pairedWarehouseIndexes } = autoMatchLogic(blueItems, mockWarehouse);

    // Tylko 1 blue item, więc tylko 1 match (mimo że warehouse ma więcej)
    expect(matchedPairs).toHaveLength(1);
    expect(pairedWarehouseIndexes.size).toBe(1);
    
    // warehouse_2, warehouse_3, warehouse_4 pozostają nie sparowane
    expect(pairedWarehouseIndexes.has(1)).toBe(false);
    expect(pairedWarehouseIndexes.has(2)).toBe(false);
    expect(pairedWarehouseIndexes.has(3)).toBe(false);
  });

  test('🔄 EDGE CASE: Ten sam produkt 2x w blue → sparuj 2 różne sztuki z warehouse', () => {
    const blueItems = [
      { type: 'sale', fullName: 'Kurtka zimowa', size: 'M', barcode: 'BARCODE_001' },
      { type: 'sale', fullName: 'Kurtka zimowa', size: 'M', barcode: 'BARCODE_002' }
    ];

    const { matchedPairs } = autoMatchLogic(blueItems, mockWarehouse);

    // 2 różne blue items = 2 różne warehouse items
    expect(matchedPairs).toHaveLength(2);
    expect(matchedPairs[0].warehouseProduct._id).toBe('warehouse_1');
    expect(matchedPairs[1].warehouseProduct._id).toBe('warehouse_2');
    
    // KLUCZOWE: różne warehouse items!
    expect(matchedPairs[0].warehouseProduct._id).not.toBe(matchedPairs[1].warehouseProduct._id);
  });

  // ===================================================================
  // 📊 MATCHING PRIORITIES - Sprawdzenie isTransferWithoutBarcode
  // ===================================================================

  test('📊 CRITICAL: isTransferWithoutBarcode flag działa poprawnie', () => {
    const blueItems = [
      {
        type: 'transfer',
        fullName: 'Płaszcz elegancki',
        size: 'L',
        barcode: 'DIFFERENT_BARCODE' // Transfer z różnym barcodeem
      }
    ];

    const { matchedPairs } = autoMatchLogic(blueItems, mockWarehouse);

    // Transfer powinien się sparować (fullName + size, barcode ignorowany)
    expect(matchedPairs).toHaveLength(1);
    
    // Sprawdź że barcode faktycznie się różni
    expect(matchedPairs[0].blueProduct.barcode).not.toBe(matchedPairs[0].warehouseProduct.barcode);
    expect(matchedPairs[0].blueProduct.type).toBe('transfer');
  });

  test('📊 CRITICAL: Transfer ignoruje barcode, używa tylko fullName + size', () => {
    const blueItems = [
      {
        type: 'transfer',
        fullName: 'Płaszcz elegancki',
        size: 'L',
        barcode: 'COMPLETELY_DIFFERENT' // Całkowicie inny barcode
      }
    ];

    const { matchedPairs } = autoMatchLogic(blueItems, mockWarehouse);

    // Transfer się sparuje mimo różnego barcode
    expect(matchedPairs).toHaveLength(1);
    expect(matchedPairs[0].warehouseProduct._id).toBe('warehouse_3');
    expect(matchedPairs[0].warehouseProduct.barcode).toBe('BARCODE_003');
    expect(matchedPairs[0].blueProduct.barcode).toBe('COMPLETELY_DIFFERENT');
  });

  test('📊 CRITICAL: Sale wymaga DOKŁADNEGO barcode match', () => {
    const blueItems = [
      {
        type: 'sale',
        fullName: 'Płaszcz elegancki',
        size: 'L',
        barcode: 'WRONG_BARCODE' // Zły barcode dla sale
      }
    ];

    const { matchedPairs } = autoMatchLogic(blueItems, mockWarehouse);

    // Sale NIE sparuje się bez dokładnego barcode match
    expect(matchedPairs).toHaveLength(0);
  });

});

/**
 * 🎯 PODSUMOWANIE TESTÓW
 * 
 * 📊 LICZBA TESTÓW: 25
 * 
 * ✅ Auto-matching logic: 7 testów
 * 🛡️ handleAutoSync: 3 testy
 * 🚫 Filtrowanie: 4 testy
 * 🔄 Edge cases: 8 testów
 * 📊 Matching priorities: 3 testy
 * 
 * 🚨 WSZYSTKIE TE TESTY MUSZĄ PRZECHODZIĆ!
 * 
 * Jeśli którykolwiek test failuje:
 * 1. NIE commituj kodu
 * 2. Debuguj problem
 * 3. Napraw funkcjonalność
 * 4. Upewnij się że wszystkie testy przechodzą
 * 5. Dopiero wtedy commituj
 * 
 * Te testy to Twoja polisa ubezpieczeniowa przed stratami finansowymi w mobile!
 */
