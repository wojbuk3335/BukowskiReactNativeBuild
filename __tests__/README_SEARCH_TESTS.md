# Search Component Tests Documentation

## 📋 Przegląd

Ten dokument opisuje zestaw testów dla komponentu Search w aplikacji mobilnej React Native, skupiając się na funkcjonalności sortowania alfabetycznego.

## 🔍 Zakres testów

### 1. Search.test.js - Testy komponentu
**Lokalizacja**: `__tests__/components/Search.test.js`

#### Funkcjonalności testowane:
- ✅ Renderowanie komponentu z modalem
- ✅ Przełączanie między trybami wyszukiwania (QR vs. wyszukiwarka)
- ✅ Funkcjonalność paska wyszukiwania
- ✅ **Sortowanie alfabetyczne** - główny fokus
- ✅ Filtrowanie z zachowaniem sortowania
- ✅ Obsługa polskich znaków i stemming kolorów
- ✅ Odświeżanie listy (pull-to-refresh)
- ✅ Obsługa edge case'ów (puste dane, null values)

#### Kluczowe testy sortowania:
```javascript
it('should sort items alphabetically by fullName', async () => {
  // Oczekiwana kolejność: Alpha Coat, Beta Vest, Charlie Blazer, Delta Sweater, echo shirt, GAMMA hoodie, Zebra Jacket
});

it('should handle case-insensitive sorting', async () => {
  // Test sortowania niezależnie od wielkości liter
});

it('should handle Polish locale sorting', async () => {
  // Test polskich znaków: Ąść, Ćma, Łódź, Żółta
});
```

### 2. SearchSorting.test.js - Testy jednostkowe sortowania
**Lokalizacja**: `__tests__/unit/SearchSorting.test.js`

#### Funkcjonalności testowane:
- ✅ Podstawowe sortowanie alfabetyczne
- ✅ Sortowanie case-insensitive
- ✅ Obsługa polskich znaków (ą, ć, ę, ł, ń, ó, ś, ź, ż)
- ✅ Edge cases (empty strings, null, undefined)
- ✅ Znaki specjalne i numeryczne
- ✅ Wydajność dla dużych zbiorów danych
- ✅ Stabilność sortowania
- ✅ Scenariusze real-world (marki, nazwy ubrań)

#### Kluczowe testy:
```javascript
const alphabeticalSort = (items) => {
  return items.sort((a, b) => {
    const nameA = (a.fullName || '').toLowerCase();
    const nameB = (b.fullName || '').toLowerCase();
    return nameA.localeCompare(nameB, 'pl', { sensitivity: 'base' });
  });
};
```

### 3. SearchIntegration.test.js - Testy integracyjne
**Lokalizacja**: `__tests__/integration/SearchIntegration.test.js`

#### Funkcjonalności testowane:
- ✅ Kompletny workflow: modal → search → filter → sort
- ✅ Wyszukiwanie po różnych kryteriach (nazwa, kolor, rozmiar, kod kreskowy)
- ✅ Wyszukiwanie wielowyrazowe
- ✅ Integracja z polskim stemming kolorów
- ✅ Testy wydajnościowe dla dużych zbiorów
- ✅ Zarządzanie stanem i odświeżanie danych
- ✅ Nawigacja między trybami

## 🧪 Struktura danych testowych

### Przykładowe dane testowe:
```javascript
const mockStateData = [
  {
    id: '1',
    fullName: 'Zimowa kurtka puchowa damska',
    size: 'M',
    symbol: 'MAGAZYN',
    barcode: '1234567890001',
    color: 'czarny',
    qty: 2
  },
  {
    id: '2',
    fullName: 'Adidas Ultraboost męskie',
    size: '42',
    symbol: 'SKLEP_A',
    barcode: '1234567890002',
    color: 'biały',
    qty: 1
  },
  // ... więcej danych
];
```

## 🏃‍♂️ Uruchamianie testów

### Wszystkie testy Search:
```bash
npm run test Search
```

### Konkretne zestawy:
```bash
# Testy komponentu
npm test __tests__/components/Search.test.js

# Testy jednostkowe sortowania
npm test __tests__/unit/SearchSorting.test.js

# Testy integracyjne
npm test __tests__/integration/SearchIntegration.test.js
```

### Testy z coverage:
```bash
npm run test:coverage -- --testPathPattern=Search
```

## ✅ Kryteria akceptacji

### Sortowanie alfabetyczne musi:
1. **Działać poprawnie dla polskich znaków** - ą, ć, ę, ł, ń, ó, ś, ź, ż
2. **Być case-insensitive** - ignorować wielkość liter
3. **Obsługiwać edge cases** - null, undefined, empty strings
4. **Zachowywać stabilność** - dla identycznych wartości
5. **Działać wydajnie** - dla min. 1000 elementów w <100ms
6. **Integrować z filtrowaniem** - zachować sortowanie po filtrowaniu

### Funkcjonalność wyszukiwania musi:
1. **Filtrować poprawnie** według wszystkich pól (nazwa, rozmiar, symbol, kod, kolor)
2. **Obsługiwać stemming** polskich kolorów
3. **Wyszukiwać wielowyrazowo** - wszystkie słowa muszą się zgadzać
4. **Pokazywać "Brak wyników"** gdy nie ma pasujących elementów
5. **Odświeżać dane** przez pull-to-refresh

## 🔍 Monitorowanie jakości

### Metryki testów:
- **Coverage**: min. 90% dla komponentu Search
- **Czas wykonania**: wszystkie testy <5 sekund
- **Stabilność**: 0% flaky tests

### Automatyczne sprawdzenia:
```javascript
// W każdym teście sortowania sprawdzamy:
for (let i = 1; i < sorted.length; i++) {
  const nameA = (sorted[i - 1].fullName || '').toLowerCase();
  const nameB = (sorted[i].fullName || '').toLowerCase();
  expect(nameA.localeCompare(nameB, 'pl', { sensitivity: 'base' })).toBeLessThanOrEqual(0);
}
```

## 🐛 Typowe problemy i rozwiązania

### Problem: Polskie znaki nie sortują się poprawnie
```javascript
// ❌ Błędne
items.sort((a, b) => a.fullName.localeCompare(b.fullName));

// ✅ Poprawne
items.sort((a, b) => 
  (a.fullName || '').toLowerCase().localeCompare(
    (b.fullName || '').toLowerCase(), 
    'pl', 
    { sensitivity: 'base' }
  )
);
```

### Problem: Wydajność dla dużych list
```javascript
// ✅ Optymalizacja - sortuj tylko raz po filtrowaniu
const filteredData = stateData?.filter(/* filtrowanie */)
  ?.sort((a, b) => /* sortowanie */) || [];
```

### Problem: Edge cases (null/undefined)
```javascript
// ✅ Bezpieczne obsługiwanie
const nameA = (a.fullName || '').toLowerCase();
const nameB = (b.fullName || '').toLowerCase();
```

## 📊 Raporty testów

### Struktura raportów:
```
Test Results:
├── Search.test.js (Component Tests)
│   ├── ✅ Component Rendering Tests (5/5)
│   ├── ✅ Search Bar Functionality Tests (2/2)
│   ├── ✅ Alphabetical Sorting Tests (3/3)
│   ├── ✅ Search Filtering with Sorting Tests (3/3)
│   └── ✅ Edge Cases Tests (3/3)
├── SearchSorting.test.js (Unit Tests)
│   ├── ✅ Basic Alphabetical Sorting (3/3)
│   ├── ✅ Polish Locale Sorting (2/2)
│   ├── ✅ Edge Cases Handling (6/6)
│   └── ✅ Performance Tests (3/3)
└── SearchIntegration.test.js (Integration Tests)
    ├── ✅ Complete Search Workflow Tests (5/5)
    ├── ✅ Multi-word Search Tests (2/2)
    ├── ✅ Polish Language Integration Tests (2/2)
    └── ✅ Performance Integration Tests (1/1)
```

## 🎯 Następne kroki

1. **Rozszerzenie testów** o testy E2E z Detox
2. **Performance benchmarks** dla różnych rozmiarów danych
3. **A11y tests** dla dostępności
4. **Visual regression tests** dla UI
5. **API integration tests** z rzeczywistym backendem

---

**Autor**: GitHub Copilot  
**Data utworzenia**: 8 sierpnia 2025  
**Wersja**: 1.0  
**Status**: ✅ Kompletne
