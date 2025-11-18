# Testy Remanentów (Inventory Tests)

## Przegląd

Kompleksowe testy dla funkcjonalności remanentów (inwentaryzacji) w aplikacji mobilnej Bukowski. Testy obejmują logikę biznesową parsowania nazw produktów, grupowania według kodów kreskowych, porównywania stanu z oczekiwanym oraz wysyłania korekt.

## Status Testów

✅ **Testy jednostkowe**: 32/32 passing
⚠️ **Testy komponentów**: 11/22 passing (wymagają dopasowania do UI)
⚠️ **Testy integracyjne**: 6/19 passing (wymagają dopasowania do UI)

## Uruchomienie Testów

### Wszystkie testy remanentów
```bash
npm test -- Remanent
```

### Tylko testy jednostkowe (zalecane)
```bash
npm test -- __tests__/unit/Remanent.test.js
```

### Tylko testy komponentów
```bash
npm test -- __tests__/components/Remanent.test.js
```

### Tylko testy integracyjne
```bash
npm test -- __tests__/integration/Remanent.test.js
```

### Tryb watch (ciągłe uruchamianie)
```bash
npm test -- Remanent --watch
```

## Struktura Testów

### 1. Testy Jednostkowe (`__tests__/unit/Remanent.test.js`)

#### Ekstrakcja rozmiaru z nazwy produktu
```javascript
// Testuje logikę parsowania: "Amanda ZŁOTY 3XL" -> { name: "Amanda ZŁOTY", size: "3XL" }
✅ should extract size from product name with color and size
✅ should extract standard sizes (XS, S, M, L, XL, XXL)
✅ should extract numeric sizes
✅ should handle single word names
✅ should handle names with multiple spaces
✅ should handle names with leading/trailing spaces
✅ should return original name if only one word
✅ should handle empty strings
```

**Przykład implementacji:**
```javascript
const extractSizeFromName = (productName) => {
  const nameParts = productName.trim().split(' ');
  const extractedSize = nameParts[nameParts.length - 1];
  const nameWithoutSize = nameParts.slice(0, -1).join(' ');
  
  return {
    name: nameWithoutSize || productName,
    size: extractedSize || 'Nieznany'
  };
};

// Test
const result = extractSizeFromName('Amanda ZŁOTY 3XL');
// Oczekiwane: { name: 'Amanda ZŁOTY', size: '3XL' }
```

#### Grupowanie produktów według kodu kreskowego
```javascript
✅ should group products by barcode
✅ should extract size and clean name for grouped products
✅ should use existing size field if available
✅ should handle products with same barcode but different scans
✅ should preserve price from first product
```

**Przykład:**
```javascript
const products = [
  { code: 'BAR001', name: 'Amanda ZŁOTY XL', size: '', value: 100 },
  { code: 'BAR001', name: 'Amanda ZŁOTY XL', size: '', value: 100 },
  { code: 'BAR002', name: 'Kurtka CZARNA M', size: '', value: 150 }
];

const groups = groupProductsByBarcode(products);
// Wynik:
// {
//   'BAR001': { name: 'Amanda ZŁOTY', size: 'XL', count: 2, price: 100 },
//   'BAR002': { name: 'Kurtka CZARNA', size: 'M', count: 1, price: 150 }
// }
```

#### Logika porównywania - brakujące i nadmiarowe produkty
```javascript
✅ should detect missing items (in state but not scanned)
✅ should detect extra items (scanned more than once)
✅ should not flag items with correct count
✅ should handle multiple missing and extra items
✅ should handle empty scanned groups
✅ should handle empty state items
```

**Przykład:**
```javascript
const scannedGroups = {
  'BAR001': { name: 'Product A', count: 3 } // Scanned 3 times!
};
const stateItems = [
  { barcode: 'BAR001' }, // Expected once
  { barcode: 'BAR002' }  // Missing - not scanned
];

const { missingItems, extraItems } = compareWithState(scannedGroups, stateItems);
// missingItems: [{ code: 'BAR002', actualCount: 0, expectedCount: 1 }]
// extraItems: [{ code: 'BAR001', actualCount: 3, expectedCount: 1, excessCount: 2 }]
```

#### Logika filtrowania
```javascript
✅ should filter by assortment
✅ should filter by color
✅ should filter by size
✅ should apply multiple filters
✅ should return all items when no filters applied
✅ should return empty array when no matches
```

**Przykład:**
```javascript
const data = [
  { name: 'Amanda ZŁOTY XL' },
  { name: 'Amanda SREBRNY M' },
  { name: 'Kurtka CZARNA L' }
];

filterRemanentData(data, { assortment: 'Amanda', size: 'XL' });
// Wynik: [{ name: 'Amanda ZŁOTY XL' }]
```

#### Śledzenie korekt
```javascript
✅ should track corrections by unique key
✅ should handle multiple corrections
✅ should not duplicate corrections
```

**Implementacja:**
```javascript
const sentCorrections = new Set();
const item = { code: 'BAR001' };
const errorType = 'EXTRA_IN_REMANENT';

const key = `${item.code}-${errorType}`;
sentCorrections.add(key); // Dodaj do Set

// Sprawdź czy już wysłano
if (sentCorrections.has('BAR001-EXTRA_IN_REMANENT')) {
  // Nie wysyłaj ponownie!
}
```

#### Obsługa przypadków brzegowych
```javascript
✅ should handle null/undefined product names
✅ should handle products without barcodes
✅ should handle products with special characters in names
✅ should handle very long product names
```

### 2. Testy Komponentów (`__tests__/components/Remanent.test.js`)

Testują renderowanie UI i podstawowe interakcje użytkownika:
- Renderowanie bez błędów
- Wyświetlanie wskaźnika ładowania
- Wyświetlanie przycisków (Skanuj kurtki, Sprawdź, Filtry)
- Otwieranie modali
- Obsługa błędów API
- Pull-to-refresh

### 3. Testy Integracyjne (`__tests__/integration/Remanent.test.js`)

Testują pełne przepływy biznesowe:
- Skanowanie → Zapis → Wyświetlanie
- Porównanie stanu → Wykrywanie błędów → Wysyłanie korekt
- Filtrowanie danych
- Persystencja w AsyncStorage
- Scenariusze rzeczywiste (wszystkie produkty poprawne, brakujące, nadmiarowe)

## Kluczowe Funkcjonalności Testowane

### 1. Ekstrakcja rozmiaru z nazwy produktu
```javascript
// Przed zmianą:
"Amanda ZŁOTY 3XL" → name: "Amanda ZŁOTY 3XL", size: "Nieznany"

// Po zmianie:
"Amanda ZŁOTY 3XL" → name: "Amanda ZŁOTY", size: "3XL"
```

### 2. Wykrywanie nadwyżek i braków

**Nadwyżka (EXTRA_IN_REMANENT):**
- Produkt zeskanowany więcej niż raz
- Przykład: Kod BAR001 zeskanowany 3 razy zamiast 1
- Typ korekty: `EXTRA_IN_REMANENT`

**Brak (MISSING_IN_REMANENT):**
- Produkt w stanie magazynowym ale nie zeskanowany
- Przykład: Kod BAR002 w stanie, ale nie w remancie
- Typ korekty: `MISSING_IN_REMANENT`

### 3. Śledzenie wysłanych korekt
```javascript
// Zapobiega duplikowaniu korekt
const sentCorrections = new Set();

function isCorrectionSent(item, errorType) {
  return sentCorrections.has(`${item.code}-${errorType}`);
}

function sendToCorrections(item, errorType) {
  if (!isCorrectionSent(item, errorType)) {
    // Wyślij korektę
    sentCorrections.add(`${item.code}-${errorType}`);
  }
}
```

## Przykłady Użycia

### Uruchom testy przed commitem
```bash
npm test -- __tests__/unit/Remanent.test.js
```

### Uruchom testy z pokryciem kodu
```bash
npm test -- __tests__/unit/Remanent.test.js --coverage
```

### Uruchom konkretny test
```bash
npm test -- __tests__/unit/Remanent.test.js -t "should extract size from product name"
```

### Debugowanie testów
```bash
npm test -- __tests__/unit/Remanent.test.js --verbose --no-coverage
```

## Typowe Scenariusze Testowane

### Scenariusz 1: Remanent bez błędów
```javascript
// Wszystkie produkty zeskanowane dokładnie raz
State: [BAR001, BAR002, BAR003]
Scanned: [BAR001, BAR002, BAR003]
Result: missingItems = [], extraItems = []
```

### Scenariusz 2: Brakujący produkt
```javascript
// Produkt w stanie ale nie zeskanowany
State: [BAR001, BAR002, BAR003]
Scanned: [BAR001, BAR002]
Result: missingItems = [BAR003], extraItems = []
```

### Scenariusz 3: Nadmiarowy produkt
```javascript
// Produkt zeskanowany wielokrotnie
State: [BAR001, BAR002]
Scanned: [BAR001, BAR001, BAR001, BAR002]
Result: missingItems = [], extraItems = [BAR001 (count=3, excess=2)]
```

### Scenariusz 4: Mix błędów
```javascript
// Kombinacja braków i nadwyżek
State: [BAR001, BAR002, BAR003, BAR004]
Scanned: [BAR001, BAR001, BAR003, BAR003, BAR003]
Result: 
  missingItems = [BAR002, BAR004]
  extraItems = [BAR001 (excess=1), BAR003 (excess=2)]
```

## Najlepsze Praktyki

### 1. Testuj logikę biznesową, nie UI
✅ DO: Testuj funkcje parsowania, grupowania, porównywania
❌ DON'T: Testuj dokładne pozycje przycisków czy kolory

### 2. Użyj opisowych nazw testów
```javascript
// ✅ DOBRE
it('should extract size from product name with color and size')

// ❌ ZŁE
it('test1')
```

### 3. Testuj przypadki brzegowe
```javascript
✅ Puste ciągi
✅ null/undefined
✅ Bardzo długie nazwy
✅ Znaki specjalne
✅ Puste listy
```

### 4. Używaj arrange-act-assert
```javascript
it('should group products by barcode', () => {
  // Arrange
  const products = [...];
  
  // Act
  const groups = groupProductsByBarcode(products);
  
  // Assert
  expect(groups['BAR001'].count).toBe(2);
});
```

## Troubleshooting

### Problem: Testy komponentów nie przechodzą
**Rozwiązanie:** Testy komponentów wymagają dokładnych nazw przycisków. Sprawdź faktyczne teksty w UI.

### Problem: Testy integracyjne timeout
**Rozwiązanie:** Użyj `waitFor` z wyższym timeout: `waitFor(() => {...}, { timeout: 5000 })`

### Problem: Mock nie działa
**Rozwiązanie:** Upewnij się że mock jest przed importem:
```javascript
jest.mock('../../services/tokenService');
// POTEM
import tokenService from '../../services/tokenService';
```

## Dalsze Kroki

- [ ] Dodać testy E2E dla pełnego flow remantu
- [ ] Zwiększyć pokrycie testów integracyjnych
- [ ] Dodać testy wydajnościowe dla dużych zestawów danych
- [ ] Dodać testy snapshot dla renderowania UI
- [ ] Zintegrować z CI/CD pipeline

## Kontakt

W razie pytań dot. testów remanentów, skontaktuj się z zespołem dev.

---
**Ostatnia aktualizacja:** 18 listopada 2025
**Wersja:** 1.0.0
**Status:** ✅ Testy jednostkowe w pełni funkcjonalne
