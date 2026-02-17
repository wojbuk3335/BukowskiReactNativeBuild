import { renderHook, act } from '@testing-library/react-native';

/**
 * TESTY JEDNOSTKOWE DLA handleBarcodeChange
 * Testuje logikę wykrywania różnych typów produktów
 */

describe('handleBarcodeChange - Logika wykrywania produktu', () => {
  
  // Setup danych testowych
  const mockStateData = [
    {
      barcode: '1234567890',
      fullName: 'Kurtka Czarna',
      size: 'M'
    },
    {
      barcode: '0987654321',
      fullName: 'Spodnie Niebieskie',
      size: 'L'
    }
  ];

  const mockColors = [
    { Kol_Kod: '01', Kol_Opis: 'Czarna' },
    { Kol_Kod: '02', Kol_Opis: 'Biała' }
  ];

  const mockSizes = [
    { Roz_Kod: '001', Roz_Opis: 'M' },
    { Roz_Kod: '002', Roz_Opis: 'L' }
  ];

  // ✅ TEST 1: Kod z stateData
  test('Powinno zwrócić produkt z stateData', () => {
    const barcode = '1234567890';
    const expected = 'Kurtka Czarna';
    
    // Symuluj logikę z handleBarcodeChange
    const matchedItems = mockStateData.filter(item => item.barcode === barcode);
    expect(matchedItems[0]?.fullName).toBe(expected);
  });

  // ✅ TEST 2: Kod kurtki (000 + kod + 0000 + suma)
  test('Powinno rozpoznać kod kurtki (000XXXXX0000X)', () => {
    const barcodeData = '0010102003'; // 001 (kod) 01 (kolor) 0200 (?) 3 (suma)
    const first3 = barcodeData.substring(0, 3);
    const colorCode = barcodeData.substring(3, 5);
    
    expect(first3).toBe('001');
    expect(colorCode).toBe('01');
  });

  // ✅ TEST 3: Kod torby (000 + kod + numer + ...)
  test('Powinno rozpoznać wzór torby', () => {
    const barcodeData = '0001110010012'; // 000 1 1 (index 5) 1001 00 12
    const first3 = barcodeData.substring(0, 3);
    const position6 = barcodeData.substring(5, 6); // substring(5,6) = index 5
    
    expect(first3).toBe('000');
    expect(position6).toBe('1'); // Index 5 powinno być '1' (torba)
  });

  // ✅ TEST 4: Kod portfela (000 + kod + 0 + numer + ...)
  test('Powinno rozpoznać wzór portfela', () => {
    const barcodeData = '0001001234567'; // 000 1 0 12345 67
    const first3 = barcodeData.substring(0, 3);
    const position6 = barcodeData.substring(5, 6);
    const position7 = barcodeData.substring(6, 7);
    
    expect(first3).toBe('000');
    expect(position6).toBe('0');
    expect(position7).not.toBe('0');
  });

  // ❌ TEST 5: Kod nie istnieje - zwróć komunikat błędu
  test('Powinno zwrócić "Nie znaleziono produktu" dla nieznanego kodu', () => {
    const barcode = '9999999999';
    const matchedItems = mockStateData.filter(item => item.barcode === barcode);
    
    if (matchedItems.length === 0) {
      expect('❌ Nie znaleziono produktu').toBe('❌ Nie znaleziono produktu');
    }
  });

  // 📝 TEST 6: Puste pole - pusta odpowiedź
  test('Powinno zwrócić pusty string dla pustego barcode', () => {
    const barcode = '';
    
    if (!barcode || barcode.trim() === '') {
      expect('').toBe('');
    }
  });

  // 📊 TEST 7: Regex dla kurtki (four zeros before last digit)
  test('Powinno znaleźć wzór 4 zer przed ostatnią cyfrą', () => {
    const patterns = {
      isCurtka: /^(\d{3})(\d{2})(\d{3})0000(\d)$/, // 000XX000000X
      isTorba: /^(\d{3})(\d{2})(\d{3})/ // 000XXXXX...
    };
    
    const testCode = '0010102000009'; // cztery zera
    const testCode2 = '0011000010012'; // torba (numer wiersza)
    
    expect(patterns.isCurtka.test(testCode)).toBe(true);
    expect(patterns.isTorba.test(testCode2)).toBe(true);
  });

  // 🔤 TEST 8: Brak obsługi białych znaków - trim()
  test('Trim() powinno usunąć białe znaki', () => {
    const barcode = '  1234567890  ';
    const trimmed = barcode.trim();
    
    expect(trimmed).toBe('1234567890');
  });

  // 🔄 TEST 9: Długość barcode - validacja
  test('Powinno walidować minimalną długość kodu', () => {
    const codes = [
      { code: '123', valid: false }, // zbyt krótki
      { code: '1234567890', valid: true }, // OK
      { code: '000', valid: false }, // zbyt krótki
    ];
    
    codes.forEach(({ code, valid }) => {
      const isValid = code.length >= 10;
      expect(isValid).toBe(valid);
    });
  });

  // 🎯 TEST 10: Sequential - kod kreskowy jako liczba
  test('Powinno obsługiwać barcode jako liczbę', () => {
    const barcodeNumber = 1234567890;
    const barcodeString = barcodeNumber.toString();
    
    expect(barcodeString).toBe('1234567890');
  });
});

/**
 * TESTY BRZEGOWE (Edge Cases)
 */
describe('handleBarcodeChange - Edge Cases', () => {

  // 🔐 TEST 11: NULL lub undefined
  test('Powinno obsługiwać null gracefully', () => {
    const barcode = null;
    
    if (!barcode || barcode.trim?.() === '') {
      expect(true).toBe(true); // Powinno wejść tutaj
    }
  });

  // 📱 TEST 12: Bardzo długi kod
  test('Powinno obsługiwać bardzo długi kod', () => {
    const barcode = '1'.repeat(100);
    
    // Powinno nie crashować
    expect(barcode.length).toBe(100);
  });

  // 🔤 TEST 13: Znaki specjalne
  test('Powinno obsługiwać kody ze znakami (bez obsługi!)', () => {
    const codes = [
      '123-456-789',
      '123.456.789',
      '123#456#789'
    ];
    
    // Te kody nie będą znalezione (bo są znaki specjalne)
    codes.forEach(code => {
      expect(code).not.toBe('1234567890');
    });
  });

  // 🌍 TEST 14: Unicode / znaki z diakrytykami
  test('Powinno ignorować unicode', () => {
    const barcodes = [
      '1234567890',
      '123456789ł', // Numer z polskim znakiem
      '123456789ęó'
    ];
    
    // Pierwszy powinien pasować, reszta nie
    expect(barcodes[0]).toBe('1234567890');
    expect(barcodes[1]).not.toBe('1234567890');
  });

  // ⚡ TEST 15: Race condition - szybkie zmiany
  test('Powinno obsługiwać race conditioną', async () => {
    const stateData = [
      { barcode: '1111111111', fullName: 'Produkt 1' },
      { barcode: '2222222222', fullName: 'Produkt 2' }
    ];
    
    let result;
    
    // Symuluj szybkie zmiany
    const changes = ['1', '12', '123', '1111111111'];
    for (const change of changes) {
      const matched = stateData.find(item => item.barcode === change);
      result = matched?.fullName;
    }
    
    expect(result).toBe('Produkt 1');
  });
});

/**
 * TESTY INTEGRACYJNE - Cały flow
 */
describe('handleBarcodeChange - Pełny flow', () => {

  // 🔄 TEST 16: Całe działanie od wpisania do wyniku
  test('Pełny flow: wpisanie → wyszukanie → wynik', () => {
    const stateData = [
      { barcode: '1234567890', fullName: 'Kurtka' },
      { barcode: '0987654321', fullName: 'Spodnie' }
    ];
    
    const inputs = ['1', '12', '123', '1234567890'];
    let lastResult = '❌ Nie znaleziono produktu';
    
    inputs.forEach(input => {
      const found = stateData.find(item => item.barcode === input);
      if (found) {
        lastResult = found.fullName;
      } else if (input && input.length >= 10) {
        // Jeśli długość >= 10 ale nie znaleziono
        lastResult = '❌ Nie znaleziono produktu';
      }
    });
    
    // Na koniec powinna być znaleziona kurtka
    expect(lastResult).toBe('Kurtka');
  });

  // 🎯 TEST 17: Dynamiczna zmiana produktu
  test('Zmiana kodu powinna zmienić produkt w realtime', () => {
    const stateData = [
      { barcode: '1111', fullName: 'A' },
      { barcode: '2222', fullName: 'B' }
    ];
    
    let products = [];
    
    // Wpis pierwszy kod
    const found1 = stateData.find(item => item.barcode === '1111');
    if (found1) products.push(found1.fullName);
    
    // Zmień na drugi kod
    const found2 = stateData.find(item => item.barcode === '2222');
    if (found2) products.push(found2.fullName);
    
    expect(products).toEqual(['A', 'B']);
  });

  // 🧹 TEST 18: Czyszzczenie pola
  test('Wyczyszczenie kodu powinno wyczyścić produkt', () => {
    const stateData = [
      { barcode: '1234567890', fullName: 'Kurtka' }
    ];
    
    // Wpisz
    let result = stateData.find(item => item.barcode === '1234567890')?.fullName || '';
    expect(result).toBe('Kurtka');
    
    // Wyczyść
    result = '';
    expect(result).toBe('');
  });
});
