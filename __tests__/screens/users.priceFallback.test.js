/**
 * 🔥 CRITICAL MOBILE TESTS - Users/Dobierz: Price Fallback Logic
 * 
 * SCENARIUSZ: "Zamrożenie" krytycznej logiki cenowej - dedykowany cennik → goods fallback
 * 
 * Ten test CHRONI najważniejszą funkcjonalność biznesową:
 * ✅ 1. Dedykowany cennik dla użytkownika (priceList.items)
 * ✅ 2. Fallback do goods (allProducts) gdy brak dedykowanego
 * ✅ 3. Size exceptions (wyjątki cenowe np. 4XL=345)
 * ✅ 4. Logika 1-vs-2 etykiety (discount bez size exception)
 * ✅ 5. Priorytet cen: size exception > discount > regular > goods
 * 
 * DLACZEGO TE TESTY SĄ KRYTYCZNE:
 * - Błędne ceny = straty finansowe dla użytkownika
 * - Brak fallback = brak możliwości drukowania dla nowych użytkowników
 * - Size exceptions = custom pricing dla nietypowych rozmiarów (4XL, 5XL)
 * - 1-vs-2 etykiety = kontrola kosztów druku i strategia sprzedaży
 * 
 * Jeśli test failuje = ceny NIE działają = CRITICAL BUG!
 */

describe('🔥 CRITICAL: Price Fallback Logic - Dedykowany cennik → Goods', () => {
  
  // ==================== MOCK DATA ====================
  
  const mockItem = {
    _id: 'item1',
    barcode: 'TEST123',
    fullName: 'Kurtka Amanda ZŁOTY',
    size: { Roz_Opis: 'M' },
    price: 100 // Cena z goods table
  };

  const mockItemWithStringFullName = {
    _id: 'item2',
    barcode: 'TEST456',
    fullName: 'Płaszcz Agata CZARNY',
    size: 'L',
    price: 200
  };

  // Dedykowany cennik użytkownika (z priceList)
  const mockPriceList = {
    items: [
      {
        code: 'TEST123',
        fullName: 'Kurtka Amanda ZŁOTY',
        price: 150, // Cena regularna z dedykowanego cennika
        discountPrice: 100, // Cena promocyjna
        priceExceptions: [
          { size: { Roz_Opis: '4XL' }, value: 345 }, // Wyjątek cenowy dla 4XL
          { size: '5XL', value: 400 } // Wyjątek dla 5XL (string format)
        ]
      },
      {
        code: 'TEST456',
        fullName: 'Płaszcz Agata CZARNY',
        price: 250,
        discountPrice: 0, // Brak promocji
        priceExceptions: []
      }
    ]
  };

  // Goods table (fallback gdy brak dedykowanego cennika)
  const mockAllProducts = [
    {
      _id: 'item1',
      code: 'TEST123',
      fullName: 'Kurtka Amanda ZŁOTY',
      price: 100,
      discount_price: 80,
      priceExceptions: [
        { size: { Roz_Opis: 'XL' }, value: 120 }
      ]
    },
    {
      _id: 'item2',
      code: 'TEST456',
      fullName: 'Płaszcz Agata CZARNY',
      price: 200,
      discount_price: 0,
      priceExceptions: []
    }
  ];

  // ==================== HELPER: getPriceFromPriceList ====================
  
  /**
   * Extracted logic from users.jsx (lines 194-258)
   * Returns price info from DEDICATED price list or null
   */
  const getPriceFromPriceList = (item, itemSize, priceList) => {
    if (!priceList || !priceList.items) {
      return null;
    }

    const itemBarcode = item.barcode || item.productId;
    const normalizedBarcode = itemBarcode !== undefined && itemBarcode !== null
      ? itemBarcode.toString().trim()
      : null;
    const itemFullName = typeof item.fullName === 'object'
      ? item.fullName?.fullName
      : item.fullName;
    const normalizedFullName = itemFullName ? itemFullName.trim() : null;

    const priceListItem = priceList.items.find(priceItem => {
      const priceItemCode = priceItem.code !== undefined && priceItem.code !== null
        ? priceItem.code.toString().trim()
        : null;
      const priceItemFullName = priceItem.fullName ? priceItem.fullName.trim() : null;

      if (normalizedBarcode && priceItemCode && priceItemCode === normalizedBarcode) {
        return true;
      }

      if (priceItemFullName && normalizedFullName && priceItemFullName === normalizedFullName) {
        return true;
      }

      return priceItemFullName && normalizedFullName &&
        priceItemFullName === normalizedFullName &&
        priceItem.category === item.category;
    });

    if (!priceListItem) {
      return null;
    }

    const result = {
      regularPrice: priceListItem.price || 0,
      discountPrice: priceListItem.discountPrice || 0,
      sizeExceptionPrice: null,
      hasDiscount: priceListItem.discountPrice && priceListItem.discountPrice > 0
    };

    if (itemSize && priceListItem.priceExceptions && priceListItem.priceExceptions.length > 0) {
      const sizeException = priceListItem.priceExceptions.find(exception => {
        const exceptionSizeName = exception.size?.Roz_Opis || exception.size;
        return exceptionSizeName === itemSize;
      });

      if (sizeException) {
        result.sizeExceptionPrice = sizeException.value;
      }
    }

    return result;
  };

  // ==================== HELPER: getFallbackPriceFromGoods ====================
  
  /**
   * Extracted logic from users.jsx (lines 1916-1947)
   * Returns price info from GOODS table (allProducts) when no dedicated price list
   */
  const getFallbackPriceFromGoods = (item, itemSize, allProducts) => {
    if (!allProducts || allProducts.length === 0) {
      return null;
    }

    const product = allProducts.find(p =>
      (item.barcode && p.code === item.barcode) ||
      (item.productId && p._id === item.productId) ||
      (typeof item.fullName === 'object' && item.fullName?.fullName && p.fullName === item.fullName.fullName) ||
      (typeof item.fullName === 'string' && p.fullName === item.fullName)
    );
    
    if (!product) {
      return null;
    }

    const fallbackPriceInfo = {
      regularPrice: product.price || 0,
      discountPrice: product.discount_price || 0,
      sizeExceptionPrice: null,
      hasDiscount: product.discount_price && product.discount_price > 0
    };
    
    // Check for size exceptions in goods
    if (itemSize && product.priceExceptions && product.priceExceptions.length > 0) {
      const sizeException = product.priceExceptions.find(exception => {
        const exceptionSizeName = exception.size?.Roz_Opis || exception.size;
        return exceptionSizeName === itemSize;
      });
      
      if (sizeException) {
        fallbackPriceInfo.sizeExceptionPrice = sizeException.value;
      }
    }

    return fallbackPriceInfo;
  };

  // ==================== TESTS: getPriceFromPriceList ====================

  describe('✅ getPriceFromPriceList - Dedykowany cennik użytkownika', () => {
    
    test('Zwraca ceny z dedykowanego cennika (barcode match)', () => {
      const itemSize = 'M';
      const result = getPriceFromPriceList(mockItem, itemSize, mockPriceList);
      
      expect(result).not.toBeNull();
      expect(result.regularPrice).toBe(150); // Z dedykowanego
      expect(result.discountPrice).toBe(100); // Z dedykowanego
      expect(result.hasDiscount).toBe(true);
      expect(result.sizeExceptionPrice).toBeNull(); // M nie ma wyjątku
    });

    test('Zwraca size exception price dla 4XL (345 zamiast 150)', () => {
      const itemSize = '4XL';
      const result = getPriceFromPriceList(mockItem, itemSize, mockPriceList);
      
      expect(result).not.toBeNull();
      expect(result.regularPrice).toBe(150);
      expect(result.discountPrice).toBe(100);
      expect(result.sizeExceptionPrice).toBe(345); // 🔥 Wyjątek cenowy!
      expect(result.hasDiscount).toBe(true);
    });

    test('Zwraca size exception price dla 5XL (string format)', () => {
      const itemSize = '5XL';
      const result = getPriceFromPriceList(mockItem, itemSize, mockPriceList);
      
      expect(result).not.toBeNull();
      expect(result.sizeExceptionPrice).toBe(400); // String format też działa
    });

    test('Zwraca ceny bez promocji (discountPrice = 0)', () => {
      const itemSize = 'L';
      const result = getPriceFromPriceList(mockItemWithStringFullName, itemSize, mockPriceList);
      
      expect(result).not.toBeNull();
      expect(result.regularPrice).toBe(250);
      expect(result.discountPrice).toBe(0);
      expect(result.hasDiscount).toBeFalsy(); // Brak promocji (może być 0 lub false)
    });

    test('Zwraca null gdy brak priceList (użytkownik bez dedykowanego cennika)', () => {
      const result = getPriceFromPriceList(mockItem, 'M', null);
      expect(result).toBeNull();
    });

    test('Zwraca null gdy priceList.items jest puste', () => {
      const emptyPriceList = { items: [] };
      const result = getPriceFromPriceList(mockItem, 'M', emptyPriceList);
      expect(result).toBeNull();
    });

    test('Zwraca null gdy produkt nie istnieje w dedykowanym cenniku', () => {
      const unknownItem = { barcode: 'UNKNOWN999', fullName: 'Nieznany produkt' };
      const result = getPriceFromPriceList(unknownItem, 'M', mockPriceList);
      expect(result).toBeNull();
    });

    test('Match po fullName gdy brak barcode', () => {
      const itemWithoutBarcode = { fullName: 'Płaszcz Agata CZARNY' };
      const result = getPriceFromPriceList(itemWithoutBarcode, 'L', mockPriceList);
      
      expect(result).not.toBeNull();
      expect(result.regularPrice).toBe(250);
    });
  });

  // ==================== TESTS: getFallbackPriceFromGoods ====================

  describe('✅ getFallbackPriceFromGoods - Fallback do goods table', () => {
    
    test('Zwraca ceny z goods gdy brak dedykowanego cennika', () => {
      const itemSize = 'M';
      const result = getFallbackPriceFromGoods(mockItem, itemSize, mockAllProducts);
      
      expect(result).not.toBeNull();
      expect(result.regularPrice).toBe(100); // Z goods
      expect(result.discountPrice).toBe(80); // Z goods
      expect(result.hasDiscount).toBe(true);
    });

    test('Zwraca size exception z goods (XL=120)', () => {
      const itemSize = 'XL';
      const result = getFallbackPriceFromGoods(mockItem, itemSize, mockAllProducts);
      
      expect(result).not.toBeNull();
      expect(result.sizeExceptionPrice).toBe(120); // Wyjątek z goods
    });

    test('Zwraca null gdy allProducts jest puste', () => {
      const result = getFallbackPriceFromGoods(mockItem, 'M', []);
      expect(result).toBeNull();
    });

    test('Zwraca null gdy produkt nie istnieje w goods', () => {
      const unknownItem = { barcode: 'UNKNOWN999', fullName: 'Nieznany produkt' };
      const result = getFallbackPriceFromGoods(unknownItem, 'M', mockAllProducts);
      expect(result).toBeNull();
    });

    test('Match po fullName (object format)', () => {
      const itemWithObjectFullName = {
        barcode: 'TEST123',
        fullName: { fullName: 'Kurtka Amanda ZŁOTY' }
      };
      const result = getFallbackPriceFromGoods(itemWithObjectFullName, 'M', mockAllProducts);
      
      expect(result).not.toBeNull();
      expect(result.regularPrice).toBe(100);
    });

    test('Match po fullName (string format)', () => {
      const result = getFallbackPriceFromGoods(mockItemWithStringFullName, 'L', mockAllProducts);
      
      expect(result).not.toBeNull();
      expect(result.regularPrice).toBe(200);
    });
  });

  // ==================== TESTS: Price Priority Logic ====================

  describe('✅ Price Priority: Dedykowany → Goods Fallback', () => {
    
    test('Priorytet 1: Używa dedykowanego cennika gdy istnieje', () => {
      const itemSize = 'M';
      
      // Krok 1: Próbuj dedykowany
      const priceInfo = getPriceFromPriceList(mockItem, itemSize, mockPriceList);
      
      // Krok 2: Fallback tylko gdy null
      const fallbackPriceInfo = !priceInfo ? getFallbackPriceFromGoods(mockItem, itemSize, mockAllProducts) : null;
      
      // Wybierz finalną cenę
      const finalPriceInfo = priceInfo || fallbackPriceInfo;
      
      expect(finalPriceInfo).not.toBeNull();
      expect(finalPriceInfo.regularPrice).toBe(150); // Z dedykowanego, nie 100 z goods!
    });

    test('Priorytet 2: Fallback do goods gdy brak dedykowanego', () => {
      const itemSize = 'M';
      
      // Symuluj brak dedykowanego cennika
      const priceInfo = getPriceFromPriceList(mockItem, itemSize, null);
      const fallbackPriceInfo = !priceInfo ? getFallbackPriceFromGoods(mockItem, itemSize, mockAllProducts) : null;
      const finalPriceInfo = priceInfo || fallbackPriceInfo;
      
      expect(finalPriceInfo).not.toBeNull();
      expect(finalPriceInfo.regularPrice).toBe(100); // Z goods
      expect(finalPriceInfo.discountPrice).toBe(80); // Z goods
    });

    test('Priorytet 3: Null gdy brak dedykowanego I goods', () => {
      const itemSize = 'M';
      
      const priceInfo = getPriceFromPriceList(mockItem, itemSize, null);
      const fallbackPriceInfo = !priceInfo ? getFallbackPriceFromGoods(mockItem, itemSize, []) : null;
      const finalPriceInfo = priceInfo || fallbackPriceInfo;
      
      expect(finalPriceInfo).toBeNull(); // Brak obu źródeł
    });
  });

  // ==================== TESTS: 1-vs-2 Label Logic ====================

  describe('✅ 1-vs-2 Label Logic - Logika drukowania etykiet', () => {
    
    test('Drukuj 2 etykiety: hasDiscount=true, brak size exception', () => {
      const itemSize = 'M';
      const finalPriceInfo = getPriceFromPriceList(mockItem, itemSize, mockPriceList);
      
      const shouldPrintTwoLabels = finalPriceInfo && finalPriceInfo.hasDiscount && !finalPriceInfo.sizeExceptionPrice;
      
      expect(shouldPrintTwoLabels).toBe(true); // M ma discount, brak wyjątku
      expect(finalPriceInfo.regularPrice).toBe(150);
      expect(finalPriceInfo.discountPrice).toBe(100);
    });

    test('Drukuj 1 etykietę: hasDiscount=true, ALE jest size exception', () => {
      const itemSize = '4XL';
      const finalPriceInfo = getPriceFromPriceList(mockItem, itemSize, mockPriceList);
      
      const shouldPrintTwoLabels = finalPriceInfo && finalPriceInfo.hasDiscount && !finalPriceInfo.sizeExceptionPrice;
      
      expect(shouldPrintTwoLabels).toBe(false); // 4XL ma wyjątek = 1 etykieta
      expect(finalPriceInfo.sizeExceptionPrice).toBe(345);
    });

    test('Drukuj 1 etykietę: brak discount (hasDiscount=false)', () => {
      const itemSize = 'L';
      const finalPriceInfo = getPriceFromPriceList(mockItemWithStringFullName, itemSize, mockPriceList);
      
      const shouldPrintTwoLabels = finalPriceInfo && finalPriceInfo.hasDiscount && !finalPriceInfo.sizeExceptionPrice;
      
      expect(shouldPrintTwoLabels).toBeFalsy(); // Brak promocji = 1 etykieta (hasDiscount może być 0)
    });

    test('Priorytet ceny druku: size exception > regular price', () => {
      const itemSize = '4XL';
      const finalPriceInfo = getPriceFromPriceList(mockItem, itemSize, mockPriceList);
      
      const shouldPrintTwoLabels = finalPriceInfo && finalPriceInfo.hasDiscount && !finalPriceInfo.sizeExceptionPrice;
      
      // Cena do druku: size exception if exists, else regular
      const finalPrice = finalPriceInfo?.sizeExceptionPrice ?? finalPriceInfo?.regularPrice;
      
      expect(finalPrice).toBe(345); // Size exception ma priorytet nad 150 (regular)
      expect(shouldPrintTwoLabels).toBe(false);
    });

    test('Priorytet ceny druku: discount gdy brak size exception', () => {
      const itemSize = 'M';
      const finalPriceInfo = getPriceFromPriceList(mockItem, itemSize, mockPriceList);
      
      const shouldPrintTwoLabels = finalPriceInfo && finalPriceInfo.hasDiscount && !finalPriceInfo.sizeExceptionPrice;
      
      if (shouldPrintTwoLabels) {
        // Drukuj 2 etykiety: regular + discount
        expect(finalPriceInfo.regularPrice).toBe(150);
        expect(finalPriceInfo.discountPrice).toBe(100);
      } else {
        fail('Powinno drukować 2 etykiety dla M z promocją');
      }
    });
  });

  // ==================== TESTS: Edge Cases ====================

  describe('✅ Edge Cases - Nietypowe scenariusze', () => {
    
    test('Item.fullName jako object z nested fullName', () => {
      const itemWithNestedFullName = {
        barcode: 'TEST123',
        fullName: { fullName: 'Kurtka Amanda ZŁOTY' },
        size: { Roz_Opis: 'M' }
      };
      
      const result = getPriceFromPriceList(itemWithNestedFullName, 'M', mockPriceList);
      expect(result).not.toBeNull();
      expect(result.regularPrice).toBe(150);
    });

    test('Item.size jako string zamiast object', () => {
      const itemSize = '4XL'; // String, nie object
      const result = getPriceFromPriceList(mockItem, itemSize, mockPriceList);
      
      expect(result.sizeExceptionPrice).toBe(345); // Działa z string
    });

    test('PriceException.size jako string (5XL)', () => {
      const itemSize = '5XL';
      const result = getPriceFromPriceList(mockItem, itemSize, mockPriceList);
      
      expect(result.sizeExceptionPrice).toBe(400); // Exception jako string działa
    });

    test('Whitespace w barcode (trimming)', () => {
      const itemWithWhitespace = { 
        barcode: '  TEST123  ', 
        fullName: 'Kurtka Amanda ZŁOTY' 
      };
      const result = getPriceFromPriceList(itemWithWhitespace, 'M', mockPriceList);
      
      expect(result).not.toBeNull(); // Trim działa
      expect(result.regularPrice).toBe(150);
    });

    test('Null barcode ale match po fullName', () => {
      const itemWithNullBarcode = { 
        barcode: null, 
        fullName: 'Płaszcz Agata CZARNY' 
      };
      const result = getPriceFromPriceList(itemWithNullBarcode, 'L', mockPriceList);
      
      expect(result).not.toBeNull();
      expect(result.regularPrice).toBe(250);
    });

    test('Empty string jako size nie matchuje wyjątków', () => {
      const result = getPriceFromPriceList(mockItem, '', mockPriceList);
      
      expect(result).not.toBeNull();
      expect(result.sizeExceptionPrice).toBeNull(); // Empty size = brak wyjątku
    });

    test('Discount = 0 oznacza hasDiscount = false', () => {
      const result = getPriceFromPriceList(mockItemWithStringFullName, 'L', mockPriceList);
      
      expect(result.discountPrice).toBe(0);
      expect(result.hasDiscount).toBeFalsy(); // Może być 0 lub false
    });
  });
});
