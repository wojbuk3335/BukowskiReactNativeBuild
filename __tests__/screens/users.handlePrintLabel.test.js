/**
 * 🔥 CRITICAL MOBILE TESTS - Users/Dobierz: handlePrintLabel Integration
 * 
 * SCENARIUSZ: "Zamrożenie" funkcji handlePrintLabel - SERCE logiki drukowania etykiet
 * 
 * Ten test CHRONI najbardziej krytyczną funkcję w całej aplikacji mobilnej:
 * ✅ handlePrintLabel - decyduje czy drukować 1 czy 2 etykiety
 * ✅ Priorytet cen: size exception > discount vs regular > fallback
 * ✅ Integracja z getPriceFromPriceList + fallback do goods
 * ✅ Wywołanie generateZplCode + sendZplToPrinter
 * 
 * DLACZEGO TE TESTY SĄ KRYTYCZNE:
 * - handlePrintLabel używany przez 4 różne miejsca w aplikacji
 * - Błąd = złe ceny na etykietach = straty finansowe
 * - Błąd = brak etykiet lub podwójne etykiety = chaos w magazynie
 * - Funkcja łączy logikę cenową + drukowanie = most between data & hardware
 * 
 * UŻYWANA PRZEZ:
 * 1. handleProcessItems - przetwarzanie wszystkich elementów (główny flow)
 * 2. Żółta drukareczka - yellowTransfers (pojedynczy print)
 * 3. Pomarańczowa drukareczka - transfers (pojedynczy print)
 * 4. Pomarańczowa drukareczka - matchedPairs (pojedynczy print)
 * 
 * Jeśli test failuje = NIKT NIE MOŻE DRUKOWAĆ ETYKIET = CRITICAL OUTAGE!
 */

describe('🔥 CRITICAL: handlePrintLabel - Integracja Price Logic + Printing', () => {
  
  // ==================== MOCK SETUP ====================
  
  let mockPriceList;
  let mockAllProducts;
  let mockGenerateZplCode;
  let mockSendZplToPrinter;
  
  beforeEach(() => {
    // Mock price list (dedykowany cennik użytkownika)
    mockPriceList = {
      items: [
        {
          code: 'TEST123',
          fullName: 'Kurtka Amanda ZŁOTY',
          price: 150,
          discountPrice: 100,
          priceExceptions: [
            { size: { Roz_Opis: '4XL' }, value: 345 },
            { size: '5XL', value: 400 }
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

    // Mock goods table (fallback)
    mockAllProducts = [
      {
        _id: 'item1',
        code: 'TEST789',
        fullName: 'Torebka Bella BRĄZOWY',
        price: 300,
        discount_price: 250,
        priceExceptions: []
      }
    ];

    // Mock funkcji drukowania
    mockGenerateZplCode = jest.fn((item, price) => `ZPL_${price}`);
    mockSendZplToPrinter = jest.fn(() => Promise.resolve(true));
  });

  // ==================== HELPER: getPriceFromPriceList ====================
  
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

      return false;
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

  // ==================== HELPER: handlePrintLabel (extracted logic) ====================
  
  const handlePrintLabel = async (item, priceList, allProducts, generateZplCode, sendZplToPrinter) => {
    try {
      const itemSize = item.isFromSale
        ? item.size
        : (typeof item.size === 'object' ? item.size?.Roz_Opis : item.size);
      
      // Try to get price from dedicated price list first
      const priceInfo = getPriceFromPriceList(item, itemSize, priceList);
      
      // If no dedicated price list, get price from goods (fallback)
      let fallbackPriceInfo = null;
      if (!priceInfo && allProducts.length > 0) {
        const product = allProducts.find(p =>
          (item.barcode && p.code === item.barcode) ||
          (item.productId && p._id === item.productId) ||
          (typeof item.fullName === 'object' && item.fullName?.fullName && p.fullName === item.fullName.fullName) ||
          (typeof item.fullName === 'string' && p.fullName === item.fullName)
        );
        
        if (product) {
          fallbackPriceInfo = {
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
        }
      }
      
      const finalPriceInfo = priceInfo || fallbackPriceInfo;
      const shouldPrintTwoLabels = finalPriceInfo && finalPriceInfo.hasDiscount && !finalPriceInfo.sizeExceptionPrice;

      if (shouldPrintTwoLabels) {
        const regularZpl = generateZplCode(item, finalPriceInfo.regularPrice);
        const discountZpl = generateZplCode(item, finalPriceInfo.discountPrice);

        const regularResult = await sendZplToPrinter(regularZpl);
        const discountResult = await sendZplToPrinter(discountZpl);

        return regularResult && discountResult;
      }

      // Print single label
      const fallbackPrice = item.price ?? item.fullName?.price ?? null;
      const finalPrice = finalPriceInfo?.sizeExceptionPrice ?? finalPriceInfo?.regularPrice ?? fallbackPrice;
      
      const zplCode = generateZplCode(item, finalPrice);
      return await sendZplToPrinter(zplCode);
    } catch (error) {
      console.error('❌ Error in handlePrintLabel:', error);
      return false;
    }
  };

  // ==================== TESTS: Size Exception Priority ====================

  describe('✅ Size Exception Priority - Drukuj 1 etykietę z ceną wyjątkową', () => {
    
    test('4XL z dedykowanego cennika → 1 etykieta z ceną 345 (size exception)', async () => {
      const item = {
        barcode: 'TEST123',
        fullName: 'Kurtka Amanda ZŁOTY',
        size: { Roz_Opis: '4XL' }
      };

      const result = await handlePrintLabel(
        item, 
        mockPriceList, 
        mockAllProducts, 
        mockGenerateZplCode, 
        mockSendZplToPrinter
      );

      expect(result).toBe(true);
      expect(mockGenerateZplCode).toHaveBeenCalledTimes(1); // Tylko 1 etykieta
      expect(mockGenerateZplCode).toHaveBeenCalledWith(item, 345); // Size exception price
      expect(mockSendZplToPrinter).toHaveBeenCalledTimes(1);
      expect(mockSendZplToPrinter).toHaveBeenCalledWith('ZPL_345');
    });

    test('5XL (string format) → 1 etykieta z ceną 400', async () => {
      const item = {
        barcode: 'TEST123',
        fullName: 'Kurtka Amanda ZŁOTY',
        size: '5XL' // String, nie object
      };

      await handlePrintLabel(item, mockPriceList, mockAllProducts, mockGenerateZplCode, mockSendZplToPrinter);

      expect(mockGenerateZplCode).toHaveBeenCalledTimes(1);
      expect(mockGenerateZplCode).toHaveBeenCalledWith(item, 400);
    });

    test('Size exception IGNORUJE discount price (ma priorytet)', async () => {
      const item = {
        barcode: 'TEST123',
        fullName: 'Kurtka Amanda ZŁOTY',
        size: { Roz_Opis: '4XL' }
      };
      // Ten produkt MA discount (100) ale size exception ma priorytet

      await handlePrintLabel(item, mockPriceList, mockAllProducts, mockGenerateZplCode, mockSendZplToPrinter);

      // Sprawdź że NIE drukuje 2 etykiet (mimo że hasDiscount=true)
      expect(mockGenerateZplCode).toHaveBeenCalledTimes(1); // Nie 2!
      expect(mockGenerateZplCode).toHaveBeenCalledWith(item, 345); // Size exception, nie discount
    });
  });

  // ==================== TESTS: Discount WITHOUT Size Exception ====================

  describe('✅ Discount WITHOUT Size Exception - Drukuj 2 etykiety', () => {
    
    test('M z dedykowanego cennika → 2 etykiety (150 + 100)', async () => {
      const item = {
        barcode: 'TEST123',
        fullName: 'Kurtka Amanda ZŁOTY',
        size: { Roz_Opis: 'M' } // M nie ma size exception
      };

      const result = await handlePrintLabel(
        item, 
        mockPriceList, 
        mockAllProducts, 
        mockGenerateZplCode, 
        mockSendZplToPrinter
      );

      expect(result).toBe(true);
      expect(mockGenerateZplCode).toHaveBeenCalledTimes(2); // 🔥 DWA RAZY!
      expect(mockGenerateZplCode).toHaveBeenNthCalledWith(1, item, 150); // Regular
      expect(mockGenerateZplCode).toHaveBeenNthCalledWith(2, item, 100); // Discount
      expect(mockSendZplToPrinter).toHaveBeenCalledTimes(2);
      expect(mockSendZplToPrinter).toHaveBeenNthCalledWith(1, 'ZPL_150');
      expect(mockSendZplToPrinter).toHaveBeenNthCalledWith(2, 'ZPL_100');
    });

    test('L (string format) z promocją → 2 etykiety', async () => {
      const item = {
        barcode: 'TEST123',
        fullName: 'Kurtka Amanda ZŁOTY',
        size: 'L' // String format
      };

      await handlePrintLabel(item, mockPriceList, mockAllProducts, mockGenerateZplCode, mockSendZplToPrinter);

      expect(mockGenerateZplCode).toHaveBeenCalledTimes(2);
    });

    test('Fallback do goods z discount → 2 etykiety (300 + 250)', async () => {
      const item = {
        barcode: 'TEST789', // Nie ma w priceList, szuka w goods
        fullName: 'Torebka Bella BRĄZOWY',
        size: 'OneSize'
      };

      await handlePrintLabel(item, mockPriceList, mockAllProducts, mockGenerateZplCode, mockSendZplToPrinter);

      expect(mockGenerateZplCode).toHaveBeenCalledTimes(2);
      expect(mockGenerateZplCode).toHaveBeenNthCalledWith(1, item, 300); // Regular z goods
      expect(mockGenerateZplCode).toHaveBeenNthCalledWith(2, item, 250); // Discount z goods
    });
  });

  // ==================== TESTS: NO Discount - Single Label ====================

  describe('✅ NO Discount - Drukuj 1 etykietę z regular price', () => {
    
    test('Produkt bez promocji → 1 etykieta z ceną 250', async () => {
      const item = {
        barcode: 'TEST456',
        fullName: 'Płaszcz Agata CZARNY',
        size: 'L'
      };

      await handlePrintLabel(item, mockPriceList, mockAllProducts, mockGenerateZplCode, mockSendZplToPrinter);

      expect(mockGenerateZplCode).toHaveBeenCalledTimes(1); // Tylko 1 etykieta
      expect(mockGenerateZplCode).toHaveBeenCalledWith(item, 250); // Regular price
      expect(mockSendZplToPrinter).toHaveBeenCalledTimes(1);
    });
  });

  // ==================== TESTS: Fallback Logic ====================

  describe('✅ Fallback Logic - Dedykowany → Goods → item.price', () => {
    
    test('Brak dedykowanego cennika → fallback do goods', async () => {
      const item = {
        barcode: 'TEST789',
        fullName: 'Torebka Bella BRĄZOWY',
        size: 'OneSize'
      };

      await handlePrintLabel(item, mockPriceList, mockAllProducts, mockGenerateZplCode, mockSendZplToPrinter);

      // Cena pobrana z goods
      expect(mockGenerateZplCode).toHaveBeenCalledTimes(2);
      expect(mockGenerateZplCode).toHaveBeenNthCalledWith(1, item, 300); // Price z goods
    });

    test('Brak w priceList I goods → fallback do item.price', async () => {
      const item = {
        barcode: 'UNKNOWN999',
        fullName: 'Nieznany produkt',
        size: 'M',
        price: 999 // Fallback price
      };

      await handlePrintLabel(item, mockPriceList, mockAllProducts, mockGenerateZplCode, mockSendZplToPrinter);

      expect(mockGenerateZplCode).toHaveBeenCalledTimes(1);
      expect(mockGenerateZplCode).toHaveBeenCalledWith(item, 999); // item.price
    });

    test('Brak wszystkich źródeł cen → null', async () => {
      const item = {
        barcode: 'UNKNOWN999',
        fullName: 'Nieznany produkt',
        size: 'M'
        // Brak price!
      };

      await handlePrintLabel(item, mockPriceList, mockAllProducts, mockGenerateZplCode, mockSendZplToPrinter);

      expect(mockGenerateZplCode).toHaveBeenCalledTimes(1);
      expect(mockGenerateZplCode).toHaveBeenCalledWith(item, null); // Null fallback
    });

    test('item.fullName.price jako fallback (nested format)', async () => {
      const item = {
        barcode: 'UNKNOWN999',
        fullName: { fullName: 'Test', price: 888 }, // Nested price
        size: 'M'
      };

      await handlePrintLabel(item, mockPriceList, mockAllProducts, mockGenerateZplCode, mockSendZplToPrinter);

      expect(mockGenerateZplCode).toHaveBeenCalledWith(item, 888);
    });
  });

  // ==================== TESTS: Edge Cases ====================

  describe('✅ Edge Cases - Nietypowe scenariusze', () => {
    
    test('item.isFromSale=true → używa item.size bezpośrednio (nie .Roz_Opis)', async () => {
      const item = {
        barcode: 'TEST123',
        fullName: 'Kurtka Amanda ZŁOTY',
        size: '4XL', // String, nie object
        isFromSale: true // 🔥 Flag z sales
      };

      await handlePrintLabel(item, mockPriceList, mockAllProducts, mockGenerateZplCode, mockSendZplToPrinter);

      // Size "4XL" powinien zmatchować exception
      expect(mockGenerateZplCode).toHaveBeenCalledWith(item, 345);
    });

    test('item.fullName jako object → poprawnie extractuje fullName.fullName', async () => {
      const item = {
        barcode: 'TEST123',
        fullName: { fullName: 'Kurtka Amanda ZŁOTY' }, // Object format
        size: 'M'
      };

      await handlePrintLabel(item, mockPriceList, mockAllProducts, mockGenerateZplCode, mockSendZplToPrinter);

      // Powinno znaleźć w priceList po fullName
      expect(mockGenerateZplCode).toHaveBeenCalledTimes(2); // Ma discount
    });

    test('item.productId zamiast barcode → match po productId', async () => {
      const customAllProducts = [
        {
          _id: 'product123',
          code: 'CODE999',
          fullName: 'Test Product',
          price: 500,
          discount_price: 0,
          priceExceptions: []
        }
      ];

      const item = {
        productId: 'product123', // Zamiast barcode
        fullName: 'Test Product',
        size: 'M'
      };

      await handlePrintLabel(item, null, customAllProducts, mockGenerateZplCode, mockSendZplToPrinter);

      // Powinno znaleźć po productId
      expect(mockGenerateZplCode).toHaveBeenCalledWith(item, 500);
    });

    test('Printer error → return false', async () => {
      mockSendZplToPrinter.mockResolvedValueOnce(false); // Symuluj błąd drukarki

      const item = {
        barcode: 'TEST456',
        fullName: 'Płaszcz Agata CZARNY',
        size: 'L'
      };

      const result = await handlePrintLabel(
        item, 
        mockPriceList, 
        mockAllProducts, 
        mockGenerateZplCode, 
        mockSendZplToPrinter
      );

      expect(result).toBe(false); // Printer failed
    });

    test('Exception w funkcji → return false i log error', async () => {
      mockGenerateZplCode.mockImplementationOnce(() => {
        throw new Error('ZPL generation failed');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const item = {
        barcode: 'TEST456',
        fullName: 'Płaszcz Agata CZARNY',
        size: 'L'
      };

      const result = await handlePrintLabel(
        item, 
        mockPriceList, 
        mockAllProducts, 
        mockGenerateZplCode, 
        mockSendZplToPrinter
      );

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '❌ Error in handlePrintLabel:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    test('Null priceList + null allProducts → używa item.price', async () => {
      const item = {
        barcode: 'TEST999',
        fullName: 'Unknown',
        size: 'M',
        price: 777
      };

      await handlePrintLabel(item, null, [], mockGenerateZplCode, mockSendZplToPrinter);

      expect(mockGenerateZplCode).toHaveBeenCalledWith(item, 777);
    });
  });

  // ==================== TESTS: Print Order Verification ====================

  describe('✅ Print Order - Kolejność drukowania etykiet', () => {
    
    test('Discount: Drukuj NAJPIERW regular, POTEM discount', async () => {
      const item = {
        barcode: 'TEST123',
        fullName: 'Kurtka Amanda ZŁOTY',
        size: 'M'
      };

      await handlePrintLabel(item, mockPriceList, mockAllProducts, mockGenerateZplCode, mockSendZplToPrinter);

      // Sprawdź kolejność wywołań
      expect(mockGenerateZplCode).toHaveBeenNthCalledWith(1, item, 150); // 1. Regular
      expect(mockGenerateZplCode).toHaveBeenNthCalledWith(2, item, 100); // 2. Discount
      
      expect(mockSendZplToPrinter).toHaveBeenNthCalledWith(1, 'ZPL_150'); // 1. Regular
      expect(mockSendZplToPrinter).toHaveBeenNthCalledWith(2, 'ZPL_100'); // 2. Discount
    });

    test('Jedna drukarka failuje → return false (obie muszą się udać)', async () => {
      mockSendZplToPrinter
        .mockResolvedValueOnce(true)  // Pierwsza OK
        .mockResolvedValueOnce(false); // Druga FAIL

      const item = {
        barcode: 'TEST123',
        fullName: 'Kurtka Amanda ZŁOTY',
        size: 'M'
      };

      const result = await handlePrintLabel(
        item, 
        mockPriceList, 
        mockAllProducts, 
        mockGenerateZplCode, 
        mockSendZplToPrinter
      );

      expect(result).toBe(false); // true && false = false
    });

    test('Obie drukarki OK → return true', async () => {
      mockSendZplToPrinter
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);

      const item = {
        barcode: 'TEST123',
        fullName: 'Kurtka Amanda ZŁOTY',
        size: 'M'
      };

      const result = await handlePrintLabel(
        item, 
        mockPriceList, 
        mockAllProducts, 
        mockGenerateZplCode, 
        mockSendZplToPrinter
      );

      expect(result).toBe(true); // true && true = true
    });
  });
});
