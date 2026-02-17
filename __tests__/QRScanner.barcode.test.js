import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock expo-camera
jest.mock('expo-camera', () => ({
  CameraView: () => null,
  useCameraPermissions: () => [{ granted: true }, jest.fn()]
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 })
}));

// Mock tokenService
jest.mock('../services/tokenService', () => ({
  authenticatedFetch: jest.fn()
}));

// Mock logger
jest.mock('../services/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
}));

// Mock api config
jest.mock('../config/api', () => ({
  getApiUrl: (endpoint) => `http://localhost:3000${endpoint}`,
  API_CONFIG: { BASE_URL: 'http://localhost:3000' }
}));

import QRScanner from '../app/QRScanner';

/**
 * TESTY DLA SKANOWANIA KODÓW KRESKOWYCH
 * Testuje dynamiczną zmianę pola "Sprzedano produkt" podczas wpisywania kodu
 */

describe('QRScanner - Dynamiczne aktualizowanie produktu', () => {
  const mockProps = {
    stateData: [
      {
        _id: '1',
        barcode: '1234567890',
        fullName: 'Kurtka Czarna',
        size: 'M',
        symbol: 'PUNKT1'
      },
      {
        _id: '2',
        barcode: '9876543210',
        fullName: 'Spodnie Niebieskie',
        size: 'L',
        symbol: 'PUNKT2'
      }
    ],
    user: { sellingPoint: 'PUNKT1', symbol: 'PUNKT1', email: 'test@test.com' },
    sizes: [{ Roz_Kod: '001', Roz_Opis: 'M' }],
    colors: [{ Kol_Kod: '01', Kol_Opis: 'Czarna' }],
    goods: [{ Tow_Kod: '001', Tow_Opis: 'Kurtka' }],
    stocks: [],
    users: [],
    bags: [],
    wallets: [],
    getFilteredSellingPoints: () => [],
    isActive: true
  };

  // ✅ TEST 1: Znalezienie produktu w stateData
  test('Powinno wyświetlić nazwę produktu gdy kod istnieje w stateData', async () => {
    const { getByDisplayValue, queryByText } = render(<QRScanner {...mockProps} />);
    
    // Symuluj wpisanie kodu kreskowego
    const barcodeInput = getByDisplayValue('Wpisz lub zeskanuj kod kreskowy');
    fireEvent.changeText(barcodeInput, '1234567890');
    
    await waitFor(() => {
      // Sprawdź czy pole "Sprzedano produkt" zawiera nazwę produktu
      expect(queryByText('Kurtka Czarna')).toBeTruthy();
    });
  });

  // ❌ TEST 2: Nie znaleziono produktu
  test('Powinno wyświetlić "Nie znaleziono produktu" gdy kod nie istnieje', async () => {
    const { getByDisplayValue, queryByText } = render(<QRScanner {...mockProps} />);
    
    const barcodeInput = getByDisplayValue('Wpisz lub zeskanuj kod kreskowy');
    fireEvent.changeText(barcodeInput, '0000000000'); // Kod który nie istnieje
    
    await waitFor(() => {
      expect(queryByText('❌ Nie znaleziono produktu')).toBeTruthy();
    });
  });

  // 📝 TEST 3: Puste pole - puste produktu
  test('Powinno wyczyścić "Sprzedano produkt" gdy pole kodu jest puste', async () => {
    const { getByDisplayValue, queryByText } = render(<QRScanner {...mockProps} />);
    
    const barcodeInput = getByDisplayValue('Wpisz lub zeskanuj kod kreskowy');
    fireEvent.changeText(barcodeInput, '1234567890');
    
    // Najpierw sprawdź że pojawiła się nazwa
    await waitFor(() => {
      expect(queryByText('Kurtka Czarna')).toBeTruthy();
    });
    
    // Potem wyczyść
    fireEvent.changeText(barcodeInput, '');
    
    await waitFor(() => {
      expect(queryByText('Kurtka Czarna')).toBeFalsy();
    });
  });

  // 🔄 TEST 4: Dynamiczna zmiana produktu
  test('Powinno zmienić produkt gdy wpiszesz inny kod', async () => {
    const { getByDisplayValue, queryByText } = render(<QRScanner {...mockProps} />);
    
    const barcodeInput = getByDisplayValue('Wpisz lub zeskanuj kod kreskowy');
    
    // Pierwszy kod
    fireEvent.changeText(barcodeInput, '1234567890');
    await waitFor(() => {
      expect(queryByText('Kurtka Czarna')).toBeTruthy();
    });
    
    // Zmień na drugi kod
    fireEvent.changeText(barcodeInput, '9876543210');
    await waitFor(() => {
      expect(queryByText('Spodnie Niebieskie')).toBeTruthy();
      expect(queryByText('Kurtka Czarna')).toBeFalsy();
    });
  });

  // ⚠️ TEST 5: Częściowy kod kreskowy
  test('Powinno pokazać "Nie znaleziono" dla niekompletnego kodu', async () => {
    const { getByDisplayValue, queryByText } = render(<QRScanner {...mockProps} />);
    
    const barcodeInput = getByDisplayValue('Wpisz lub zeskanuj kod kreskowy');
    fireEvent.changeText(barcodeInput, '12345'); // Za krótki kod
    
    await waitFor(() => {
      expect(queryByText('❌ Nie znaleziono produktu')).toBeTruthy();
    });
  });

  // 🔤 TEST 6: Kod z białymi znakami
  test('Powinno obsługiwać kod z białymi znakami na początku/końcu', async () => {
    const { getByDisplayValue, queryByText } = render(<QRScanner {...mockProps} />);
    
    const barcodeInput = getByDisplayValue('Wpisz lub zeskanuj kod kreskowy');
    fireEvent.changeText(barcodeInput, '  1234567890  '); // Spacje dookoła
    
    await waitFor(() => {
      expect(queryByText('Kurtka Czarna')).toBeTruthy();
    });
  });

  // 🚀 TEST 7: Wielokrotne zmiany (szybkie wpisywanie)
  test('Powinno obsługiwać szybkie zmiany kodu bez błędów', async () => {
    const { getByDisplayValue, queryByText } = render(<QRScanner {...mockProps} />);
    
    const barcodeInput = getByDisplayValue('Wpisz lub zeskanuj kod kreskowy');
    
    // Symuluj szybkie wpisywanie
    fireEvent.changeText(barcodeInput, '1');
    fireEvent.changeText(barcodeInput, '12');
    fireEvent.changeText(barcodeInput, '123');
    fireEvent.changeText(barcodeInput, '1234567890');
    
    await waitFor(() => {
      expect(queryByText('Kurtka Czarna')).toBeTruthy();
    });
  });

  // 🔐 TEST 8: Brak danych w stateData
  test('Powinno obsługiwać sytuację gdy brak stateData', () => {
    const propsWithoutStateData = {
      ...mockProps,
      stateData: null
    };
    
    const { getByDisplayValue } = render(<QRScanner {...propsWithoutStateData} />);
    const barcodeInput = getByDisplayValue('Wpisz lub zeskanuj kod kreskowy');
    
    // Powinno nie crashować
    fireEvent.changeText(barcodeInput, '1234567890');
    expect(barcodeInput).toBeTruthy();
  });

  // 🎯 TEST 9: Autofocus na polu kodu kreskowego
  test('Pole kodu kreskowego powinno mieć autofocus', () => {
    const { getByDisplayValue } = render(<QRScanner {...mockProps} />);
    
    const barcodeInput = getByDisplayValue('Wpisz lub zeskanuj kod kreskowy');
    // Sprawdzenie że inputa ma autoFocus attribute
    expect(barcodeInput.props.autoFocus).toBe(true);
  });

  // 📌 TEST 10: Dwa produkty znalezione
  test('Powinno zwrócić pierwszy produkt gdy jest duplikat', async () => {
    const propsWithDuplicate = {
      ...mockProps,
      stateData: [
        ...mockProps.stateData,
        {
          _id: '3',
          barcode: '1234567890', // Duplikat
          fullName: 'Kurtka Inna',
          size: 'L',
          symbol: 'PUNKT3'
        }
      ]
    };
    
    const { getByDisplayValue, queryByText } = render(<QRScanner {...propsWithDuplicate} />);
    
    const barcodeInput = getByDisplayValue('Wpisz lub zeskanuj kod kreskowy');
    fireEvent.changeText(barcodeInput, '1234567890');
    
    await waitFor(() => {
      // Powinno zwrócić pierwszy znaleziony
      expect(queryByText('Kurtka Czarna')).toBeTruthy();
    });
  });
});
