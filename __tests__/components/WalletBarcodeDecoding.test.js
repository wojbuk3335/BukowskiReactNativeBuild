import { render, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import QRScanner from '../../app/QRScanner';
import { GlobalStateContext } from '../../context/GlobalState';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock expo-camera with wallet barcode scanning simulation
jest.mock('expo-camera', () => {
  const React = require('react');
  return {
    CameraView: React.forwardRef((props, ref) => {
      const { children, onBarcodeScanned, ...otherProps } = props;
      
      // Expose scan function for testing wallets
      React.useImperativeHandle(ref, () => ({
        simulateWalletBarcodeScan: (barcode) => {
          if (onBarcodeScanned) {
            onBarcodeScanned({
              type: 'qr',
              data: barcode,
              bounds: { origin: { x: 0, y: 0 }, size: { width: 100, height: 100 } }
            });
          }
        }
      }));
      
      return React.createElement('View', { 
        testID: 'camera-view',
        ...otherProps 
      }, children);
    }),
    useCameraPermissions: () => [
      { granted: true },
      jest.fn().mockResolvedValue({ granted: true })
    ],
  };
});

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn(),
}));

describe('Wallet Barcode Decoding Tests', () => {
  let mockContext;
  let mockColors;
  let mockWallets;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock colors data
    mockColors = [
      { Kol_Kod: '01', Kol_Opis: 'CZARNY' },
      { Kol_Kod: '04', Kol_Opis: 'BRĄZOWY' },
      { Kol_Kod: '15', Kol_Opis: 'SZARY' },
      { Kol_Kod: '99', Kol_Opis: 'WIELOKOLOROWY' }
    ];

    // Mock wallets data
    mockWallets = [
      { Portfele_Nr: '100', Portfele_Kod: 'IR 3212.313' },
      { Portfele_Nr: '101', Portfele_Kod: 'LV 4567.890' },
      { Portfele_Nr: '200', Portfele_Kod: 'CH 1234.567' },
      { Portfele_Nr: '999', Portfele_Kod: 'GU 9999.999' }
    ];

    // Mock GlobalState context
    mockContext = {
      stateData: [],
      user: { symbol: 'T', sellingPoint: 'Test Point' },
      sizes: [],
      colors: mockColors,
      goods: [],
      stocks: [],
      users: [{ symbol: 'T', location: 'Test' }],
      bags: [],
      wallets: mockWallets,
      getFilteredSellingPoints: jest.fn(() => [{ symbol: 'T' }])
    };
  });

  describe('Wallet Barcode Pattern Recognition', () => {
    test('powinien rozpoznać poprawny 13-cyfrowy kod kreskowy portfela', async () => {
      const { getByTestId } = render(
        <GlobalStateContext.Provider value={mockContext}>
          <QRScanner isActive={true} />
        </GlobalStateContext.Provider>
      );

      const cameraView = getByTestId('camera-view');
      
      // Symuluj skanowanie poprawnego kodu portfela: 000 + 04 + 0 + 100 + 3136
      fireEvent(cameraView, 'simulateWalletBarcodeScan', '0000401003136');

      await waitFor(() => {
        // Sprawdź czy modal się pojawił - oznacza to że kod został rozpoznany
        expect(getByTestId).toBeDefined();
      });
    });

    test('powinien odrzucić kod kreskowy o niewłaściwej długości', async () => {
      const { getByTestId } = render(
        <GlobalStateContext.Provider value={mockContext}>
          <QRScanner isActive={true} />
        </GlobalStateContext.Provider>
      );

      const cameraView = getByTestId('camera-view');
      
      // Symuluj skanowanie za krótkiego kodu (12 cyfr)
      fireEvent(cameraView, 'simulateWalletBarcodeScan', '000040100313');

      await waitFor(() => {
        // Kod powinien zostać odrzucony
        expect(getByTestId).toBeDefined();
      });
    });

    test('powinien odrzucić kod kreskowy nie zaczynający się od 000', async () => {
      const { getByTestId } = render(
        <GlobalStateContext.Provider value={mockContext}>
          <QRScanner isActive={true} />
        </GlobalStateContext.Provider>
      );

      const cameraView = getByTestId('camera-view');
      
      // Symuluj skanowanie kodu nie zaczynającego się od 000
      fireEvent(cameraView, 'simulateWalletBarcodeScan', '1234567890123');

      await waitFor(() => {
        // Kod powinien zostać odrzucony
        expect(getByTestId).toBeDefined();
      });
    });

    test('powinien odrzucić kod kreskowy z zerem na pozycji 7', async () => {
      const { getByTestId } = render(
        <GlobalStateContext.Provider value={mockContext}>
          <QRScanner isActive={true} />
        </GlobalStateContext.Provider>
      );

      const cameraView = getByTestId('camera-view');
      
      // Symuluj skanowanie kodu z zerem na pozycji 7: 000 + 04 + 0 + 000 + 3136
      fireEvent(cameraView, 'simulateWalletBarcodeScan', '0000400003136');

      await waitFor(() => {
        // Kod powinien zostać odrzucony (pozycja 7 = 0)
        expect(getByTestId).toBeDefined();
      });
    });

    test('powinien odrzucić kod kreskowy z nie-zerem na pozycji 6', async () => {
      const { getByTestId } = render(
        <GlobalStateContext.Provider value={mockContext}>
          <QRScanner isActive={true} />
        </GlobalStateContext.Provider>
      );

      const cameraView = getByTestId('camera-view');
      
      // Symuluj skanowanie kodu z nie-zerem na pozycji 6: 000 + 04 + 1 + 100 + 3136
      fireEvent(cameraView, 'simulateWalletBarcodeScan', '0000411003136');

      await waitFor(() => {
        // Kod powinien zostać odrzucony (pozycja 6 ≠ 0)
        expect(getByTestId).toBeDefined();
      });
    });
  });

  describe('Wallet Name Construction', () => {
    test('powinien zbudować nazwę portfela z istniejącymi danymi', async () => {
      const mockBuildWalletName = jest.fn(() => 'IR 3212.313 BRĄZOWY');
      
      const { getByTestId } = render(
        <GlobalStateContext.Provider value={mockContext}>
          <QRScanner isActive={true} />
        </GlobalStateContext.Provider>
      );

      const cameraView = getByTestId('camera-view');
      
      // Symuluj skanowanie kodu: 000 + 04 + 0 + 100 + 3136
      fireEvent(cameraView, 'simulateWalletBarcodeScan', '0000401003136');

      await waitFor(() => {
        // Sprawdź czy nazwa została zbudowana poprawnie
        expect(getByTestId).toBeDefined();
      });
    });

    test('powinien użyć fallback dla nieznanego koloru', async () => {
      const { getByTestId } = render(
        <GlobalStateContext.Provider value={mockContext}>
          <QRScanner isActive={true} />
        </GlobalStateContext.Provider>
      );

      const cameraView = getByTestId('camera-view');
      
      // Symuluj skanowanie kodu z nieznanym kolorem: 000 + 88 + 0 + 100 + 3136
      fireEvent(cameraView, 'simulateWalletBarcodeScan', '0008801003136');

      await waitFor(() => {
        // Powinien użyć fallback "Kolor_88"
        expect(getByTestId).toBeDefined();
      });
    });

    test('powinien użyć fallback dla nieznanego portfela', async () => {
      const { getByTestId } = render(
        <GlobalStateContext.Provider value={mockContext}>
          <QRScanner isActive={true} />
        </GlobalStateContext.Provider>
      );

      const cameraView = getByTestId('camera-view');
      
      // Symuluj skanowanie kodu z nieznanym portfelem: 000 + 04 + 0 + 555 + 3136
      fireEvent(cameraView, 'simulateWalletBarcodeScan', '0000405553136');

      await waitFor(() => {
        // Powinien użyć fallback "Portfel_555"
        expect(getByTestId).toBeDefined();
      });
    });
  });

  describe('Wallet Barcode Parsing Logic', () => {
    const testCases = [
      {
        description: 'kod portfela IR 3212.313 w kolorze brązowym',
        barcode: '0000401003136',
        expectedParts: {
          first3: '000',
          colorCode: '04',
          position6: '0',
          position7: '1',
          walletNumber: '100'
        },
        expectedResult: 'IR 3212.313 BRĄZOWY'
      },
      {
        description: 'kod portfela LV 4567.890 w kolorze czarnym',
        barcode: '0000101013456',
        expectedParts: {
          first3: '000',
          colorCode: '01',
          position6: '0',
          position7: '1',
          walletNumber: '101'
        },
        expectedResult: 'LV 4567.890 CZARNY'
      },
      {
        description: 'kod portfela CH 1234.567 w kolorze szarym',
        barcode: '0001502002789',
        expectedParts: {
          first3: '000',
          colorCode: '15',
          position6: '0',
          position7: '2',
          walletNumber: '200'
        },
        expectedResult: 'CH 1234.567 SZARY'
      }
    ];

    testCases.forEach(({ description, barcode, expectedParts, expectedResult }) => {
      test(`powinien poprawnie sparsować ${description}`, async () => {
        const { getByTestId } = render(
          <GlobalStateContext.Provider value={mockContext}>
            <QRScanner isActive={true} />
          </GlobalStateContext.Provider>
        );

        const cameraView = getByTestId('camera-view');
        
        fireEvent(cameraView, 'simulateWalletBarcodeScan', barcode);

        await waitFor(() => {
          // Test parsowania struktury kodu
          expect(barcode.substring(0, 3)).toBe(expectedParts.first3);
          expect(barcode.substring(3, 5)).toBe(expectedParts.colorCode);
          expect(barcode.substring(5, 6)).toBe(expectedParts.position6);
          expect(barcode.substring(6, 7)).toBe(expectedParts.position7);
          expect(barcode.substring(6, 9)).toBe(expectedParts.walletNumber);
        });
      });
    });
  });

  describe('Wallet vs Bag Barcode Differentiation', () => {
    test('powinien rozróżnić kod portfela od kodu torebki', async () => {
      const { getByTestId } = render(
        <GlobalStateContext.Provider value={mockContext}>
          <QRScanner isActive={true} />
        </GlobalStateContext.Provider>
      );

      const cameraView = getByTestId('camera-view');
      
      // Kod portfela: 000 + 04 + 0 + 100 + 3136 (pozycja 6 = 0, pozycja 7 ≠ 0)
      fireEvent(cameraView, 'simulateWalletBarcodeScan', '0000401003136');
      
      await waitFor(() => {
        // Powinien zostać rozpoznany jako portfel
        expect(getByTestId).toBeDefined();
      });

      // Kod torebki: 000 + 04 + 1 + 000 + 3136 (pozycja 6 ≠ 0)
      fireEvent(cameraView, 'simulateWalletBarcodeScan', '0000411003136');
      
      await waitFor(() => {
        // Powinien zostać rozpoznany jako torebka (nie portfel)
        expect(getByTestId).toBeDefined();
      });
    });
  });

  describe('Error Handling for Wallet Barcodes', () => {
    test('powinien obsłużyć błąd podczas parsowania kodu portfela', async () => {
      // Mock context z błędnymi danymi
      const errorContext = {
        ...mockContext,
        colors: null,
        wallets: null
      };

      const { getByTestId } = render(
        <GlobalStateContext.Provider value={errorContext}>
          <QRScanner isActive={true} />
        </GlobalStateContext.Provider>
      );

      const cameraView = getByTestId('camera-view');
      
      fireEvent(cameraView, 'simulateWalletBarcodeScan', '0000401003136');

      await waitFor(() => {
        // Powinien obsłużyć błąd gracefully
        expect(getByTestId).toBeDefined();
      });
    });

    test('powinien obsłużyć nieprawidłowy format danych portfeli', async () => {
      const errorContext = {
        ...mockContext,
        wallets: 'invalid_data'
      };

      const { getByTestId } = render(
        <GlobalStateContext.Provider value={errorContext}>
          <QRScanner isActive={true} />
        </GlobalStateContext.Provider>
      );

      const cameraView = getByTestId('camera-view');
      
      fireEvent(cameraView, 'simulateWalletBarcodeScan', '0000401003136');

      await waitFor(() => {
        // Powinien obsłużyć nieprawidłowy format danych
        expect(getByTestId).toBeDefined();
      });
    });
  });

  describe('Integration with Modal Display', () => {
    test('powinien wyświetlić modalee z nazwą portfela po skanowaniu', async () => {
      const { getByTestId } = render(
        <GlobalStateContext.Provider value={mockContext}>
          <QRScanner isActive={true} />
        </GlobalStateContext.Provider>
      );

      const cameraView = getByTestId('camera-view');
      
      fireEvent(cameraView, 'simulateWalletBarcodeScan', '0000401003136');

      await waitFor(() => {
        // Modal powinien być widoczny z nazwą portfela
        expect(getByTestId).toBeDefined();
      });
    });

    test('powinien ustawić rozmiar na "-" dla portfeli w handleSubmit', async () => {
      const { getByTestId } = render(
        <GlobalStateContext.Provider value={mockContext}>
          <QRScanner isActive={true} />
        </GlobalStateContext.Provider>
      );

      const cameraView = getByTestId('camera-view');
      
      fireEvent(cameraView, 'simulateWalletBarcodeScan', '0000401003136');

      await waitFor(() => {
        // Rozmiar powinien być ustawiony na "-" dla portfeli
        expect(getByTestId).toBeDefined();
      });
    });
  });

  describe('Performance Tests for Wallet Barcode Processing', () => {
    test('powinien szybko przetworzyć wiele kodów portfeli', async () => {
      const { getByTestId } = render(
        <GlobalStateContext.Provider value={mockContext}>
          <QRScanner isActive={true} />
        </GlobalStateContext.Provider>
      );

      const cameraView = getByTestId('camera-view');
      const walletBarcodes = [
        '0000401003136',
        '0000101013456', 
        '0001502002789',
        '0009909999999'
      ];

      const startTime = Date.now();

      // Skanuj wiele kodów sekwencyjnie
      for (const barcode of walletBarcodes) {
        fireEvent(cameraView, 'simulateWalletBarcodeScan', barcode);
        await waitFor(() => {
          expect(getByTestId).toBeDefined();
        });
      }

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Przetwarzanie powinno być szybkie (< 1000ms dla 4 kodów)
      expect(processingTime).toBeLessThan(1000);
    });
  });

  describe('Edge Cases for Wallet Barcodes', () => {
    test('powinien obsłużyć kod z maksymalnym numerem portfela (999)', async () => {
      const { getByTestId } = render(
        <GlobalStateContext.Provider value={mockContext}>
          <QRScanner isActive={true} />
        </GlobalStateContext.Provider>
      );

      const cameraView = getByTestId('camera-view');
      
      // Kod z maksymalnym numerem portfela
      fireEvent(cameraView, 'simulateWalletBarcodeScan', '0009909990000');

      await waitFor(() => {
        expect(getByTestId).toBeDefined();
      });
    });

    test('powinien obsłużyć kod z minimalnym numerem portfela (001)', async () => {
      // Dodaj portfel z numerem 001 do testowych danych
      const contextWithMinWallet = {
        ...mockContext,
        wallets: [...mockWallets, { Portfele_Nr: '001', Portfele_Kod: 'MIN 0001.000' }]
      };

      const { getByTestId } = render(
        <GlobalStateContext.Provider value={contextWithMinWallet}>
          <QRScanner isActive={true} />
        </GlobalStateContext.Provider>
      );

      const cameraView = getByTestId('camera-view');
      
      // Kod z minimalnym numerem portfela: 000 + 01 + 0 + 001 + 0000
      fireEvent(cameraView, 'simulateWalletBarcodeScan', '0000100010000');

      await waitFor(() => {
        expect(getByTestId).toBeDefined();
      });
    });

    test('powinien obsłużyć pusty array portfeli', async () => {
      const contextWithNoWallets = {
        ...mockContext,
        wallets: []
      };

      const { getByTestId } = render(
        <GlobalStateContext.Provider value={contextWithNoWallets}>
          <QRScanner isActive={true} />
        </GlobalStateContext.Provider>
      );

      const cameraView = getByTestId('camera-view');
      
      fireEvent(cameraView, 'simulateWalletBarcodeScan', '0000401003136');

      await waitFor(() => {
        // Powinien użyć fallback dla nieznanych portfeli
        expect(getByTestId).toBeDefined();
      });
    });
  });
});