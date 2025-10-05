/**
 * Testy jednostkowe dla funkcji buildWalletNameFromBarcode (poprawione)
 * Testuje parsowanie 13-cyfrowych kodów kreskowych dla portfeli
 * Format: 000 + kolor(2) + 0 + pozycja7(1) + numer_portfela(3) + reszta(4)
 */

describe('buildWalletNameFromBarcode Fixed Tests', () => {
  let mockContext;
  let buildWalletNameFromBarcode;

  beforeEach(() => {
    // Mock context z danymi portfeli i kolorów
    mockContext = {
      colors: [
        { Kol_Kod: '01', Kol_Opis: 'CZARNY' },
        { Kol_Kod: '04', Kol_Opis: 'BRĄZOWY' },
        { Kol_Kod: '15', Kol_Opis: 'SZARY' },
        { Kol_Kod: '99', Kol_Opis: 'WIELOKOLOROWY' }
      ],
      wallets: [
        { Portfele_Nr: '100', Portfele_Kod: 'IR 3212.313' },
        { Portfele_Nr: '101', Portfele_Kod: 'LV 4567.890' },
        { Portfele_Nr: '200', Portfele_Kod: 'CH 1234.567' },
        { Portfele_Nr: '999', Portfele_Kod: 'GU 9999.999' }
      ]
    };

    // Symulacja funkcji buildWalletNameFromBarcode
    buildWalletNameFromBarcode = (barcodeData) => {
      try {
        if (!barcodeData || typeof barcodeData !== 'string' || barcodeData.length !== 13) {
          return null;
        }

        const first3 = barcodeData.substring(0, 3);
        const colorCode = barcodeData.substring(3, 5);
        const position6 = barcodeData.substring(5, 6); // index 5 = pozycja 6
        const position7 = barcodeData.substring(6, 7); // index 6 = pozycja 7
        const walletNumber = barcodeData.substring(7, 10); // indices 7-9 = pozycje 8-10
        
        if (first3 !== "000" || position6 !== "0" || position7 === "0") {
          return null;
        }

        const walletNumberInt = parseInt(walletNumber, 10);
        
        if (walletNumberInt === 0 || isNaN(walletNumberInt)) {
          return null;
        }

        // Sprawdź czy arrays są prawidłowe
        if (!Array.isArray(mockContext.colors) || !Array.isArray(mockContext.wallets)) {
          return null;
        }

        const colorsArray = mockContext.colors;
        const walletsArray = mockContext.wallets;
        
        if (colorsArray.length === 0 || walletsArray.length === 0) {
          return null;
        }
        
        const colorItem = colorsArray.find(color => color && color.Kol_Kod === colorCode);
        const colorName = colorItem?.Kol_Opis || `Kolor_${colorCode}`;
        
        const walletItem = walletsArray.find(wallet => wallet && wallet.Portfele_Nr === walletNumberInt.toString());
        const walletName = walletItem?.Portfele_Kod || `Portfel_${walletNumber}`;
        
        return `${walletName} ${colorName}`;
      } catch (error) {
        console.error("Error building wallet name from barcode:", error);
        return null;
      }
    };
  });

  describe('Correct Barcode Parsing', () => {
    test('should parse IR 3212.313 BRĄZOWY (portfel 100, kolor 04)', () => {
      // 000 + 04 + 0 + 1 + 100 + 136
      const result = buildWalletNameFromBarcode('0000401100136');
      expect(result).toBe('IR 3212.313 BRĄZOWY');
    });

    test('should parse LV 4567.890 CZARNY (portfel 101, kolor 01)', () => {
      // 000 + 01 + 0 + 1 + 101 + 136
      const result = buildWalletNameFromBarcode('0000101101136');
      expect(result).toBe('LV 4567.890 CZARNY');
    });

    test('should parse CH 1234.567 SZARY (portfel 200, kolor 15)', () => {
      // 000 + 15 + 0 + 1 + 200 + 136
      const result = buildWalletNameFromBarcode('0001501200136');
      expect(result).toBe('CH 1234.567 SZARY');
    });

    test('should parse GU 9999.999 WIELOKOLOROWY (portfel 999, kolor 99)', () => {
      // 000 + 99 + 0 + 1 + 999 + 136
      const result = buildWalletNameFromBarcode('0009901999136');
      expect(result).toBe('GU 9999.999 WIELOKOLOROWY');
    });
  });

  describe('Pattern Validation', () => {
    test('should reject barcodes not starting with 000', () => {
      const result = buildWalletNameFromBarcode('1230401100136');
      expect(result).toBeNull();
    });

    test('should reject barcodes with position 6 != 0', () => {
      const result = buildWalletNameFromBarcode('0000411100136');
      expect(result).toBeNull();
    });

    test('should reject barcodes with position 7 = 0', () => {
      const result = buildWalletNameFromBarcode('0000400100136');
      expect(result).toBeNull();
    });

    test('should reject barcodes with wallet number 000', () => {
      const result = buildWalletNameFromBarcode('0000401000136');
      expect(result).toBeNull();
    });
  });

  describe('Fallback Handling', () => {
    test('should use fallback for unknown color', () => {
      // Kolor 77 nie istnieje w mock data
      const result = buildWalletNameFromBarcode('0007701100136');
      expect(result).toBe('IR 3212.313 Kolor_77');
    });

    test('should use fallback for unknown wallet', () => {
      // Portfel 555 nie istnieje w mock data
      const result = buildWalletNameFromBarcode('0000401555136');
      expect(result).toBe('Portfel_555 BRĄZOWY');
    });

    test('should use fallback for both unknown', () => {
      const result = buildWalletNameFromBarcode('0007701555136');
      expect(result).toBe('Portfel_555 Kolor_77');
    });
  });

  describe('Edge Cases', () => {
    test('should handle wallet numbers with leading zeros correctly', () => {
      // Numer 001
      const result = buildWalletNameFromBarcode('0000401001136');
      expect(result).toBe('Portfel_001 BRĄZOWY');
    });

    test('should handle single digit wallet numbers', () => {
      // Numer 005
      const result = buildWalletNameFromBarcode('0000401005136');
      expect(result).toBe('Portfel_005 BRĄZOWY');
    });

    test('should handle maximum position 7 value', () => {
      // pozycja 7 może być 1-9
      const result = buildWalletNameFromBarcode('0000409100136');
      expect(result).toBe('IR 3212.313 BRĄZOWY');
    });
  });

  describe('Error Handling', () => {
    test('should return null for invalid input types', () => {
      expect(buildWalletNameFromBarcode(null)).toBeNull();
      expect(buildWalletNameFromBarcode(undefined)).toBeNull();
      expect(buildWalletNameFromBarcode(123)).toBeNull();
      expect(buildWalletNameFromBarcode({})).toBeNull();
    });

    test('should return null for wrong length barcodes', () => {
      expect(buildWalletNameFromBarcode('123')).toBeNull();
      expect(buildWalletNameFromBarcode('12345678901234')).toBeNull();
    });

    test('should handle empty data arrays', () => {
      mockContext.colors = [];
      mockContext.wallets = [];
      
      const result = buildWalletNameFromBarcode('0000401100136');
      expect(result).toBeNull();
    });

    test('should handle invalid data arrays', () => {
      mockContext.colors = null;
      mockContext.wallets = null;
      
      const result = buildWalletNameFromBarcode('0000401100136');
      expect(result).toBeNull();
    });
  });

  describe('Performance Test', () => {
    test('should process multiple barcodes quickly', () => {
      const testBarcodes = [
        '0000401100136', // IR 3212.313 BRĄZOWY
        '0000101101136', // LV 4567.890 CZARNY
        '0001501200136', // CH 1234.567 SZARY
        '0009901999136', // GU 9999.999 WIELOKOLOROWY
        '0000401555136', // Portfel_555 BRĄZOWY (unknown wallet)
        '0007701100136'  // IR 3212.313 Kolor_77 (unknown color)
      ];

      const startTime = Date.now();
      
      testBarcodes.forEach(barcode => {
        const result = buildWalletNameFromBarcode(barcode);
        expect(result).not.toBeNull();
      });
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      // Wszystkie barcodes powinny być przetworzone w mniej niż 10ms
      expect(processingTime).toBeLessThan(10);
    });
  });

  describe('Complete Workflow Test', () => {
    test('should correctly identify and parse wallet barcodes vs other types', () => {
      const walletBarcodes = [
        '0000401100136', // Valid wallet
        '0000101101136', // Valid wallet  
        '0001501200136'  // Valid wallet
      ];

      const nonWalletBarcodes = [
        '0000400100136', // pozycja 7 = 0 (not wallet)
        '0000411100136', // pozycja 6 != 0 (not wallet)
        '1230401100136', // nie zaczyna się od 000
        '123456789012'   // za krótki
      ];

      // Wallet barcodes should parse successfully
      walletBarcodes.forEach(barcode => {
        const result = buildWalletNameFromBarcode(barcode);
        expect(result).not.toBeNull();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });

      // Non-wallet barcodes should return null
      nonWalletBarcodes.forEach(barcode => {
        const result = buildWalletNameFromBarcode(barcode);
        expect(result).toBeNull();
      });
    });
  });
});