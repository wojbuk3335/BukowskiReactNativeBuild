# Testy WriteOff - Filtrowanie Użytkowników

## Przegląd

Ten zestaw testów sprawdza funkcjonalność filtrowania użytkowników w komponencie WriteOff oraz funkcji `getFilteredSellingPoints` w Global State. Testy obejmują:

- **Testy jednostkowe** - Sprawdzają logikę filtrowania w Global State
- **Testy komponentów** - Sprawdzają renderowanie i podstawową funkcjonalność WriteOff
- **Testy integracyjne** - Sprawdzają kompletny przepływ transferu między użytkownikami

## Struktura Testów

```
__tests__/
├── unit/
│   └── UserFiltering.test.js          # Testy logiki filtrowania w Global State
├── components/
│   └── WriteOff.test.js               # Testy komponenetu WriteOff
└── integration/
    └── WriteOffUserTransfer.test.js   # Testy integracyjne przepływu transferu
```

## Uruchamianie Testów

### Wszystkie testy WriteOff
```bash
npm run test:writeoff
```

### Poszczególne grupy testów
```bash
# Testy jednostkowe (logika filtrowania)
npm run test:user-filtering

# Testy komponentów
npm run test:components

# Testy integracyjne
npm run test:integration

# Testy jednostkowe
npm run test:unit
```

### Tryb watch (automatyczne ponowne uruchamianie)
```bash
npm run test:watch
```

### Pokrycie kodu
```bash
npm run test:coverage
```

## Co Sprawdzają Testy

### 1. Testy Jednostkowe (UserFiltering.test.js)

**Logika filtrowania w getFilteredSellingPoints:**
- ✅ Sprawdza filtrowanie użytkowników według lokalizacji (Zakopane)
- ✅ Weryfikuje wykluczanie adminów (role: 'admin')
- ✅ Weryfikuje wykluczanie magazynu (role: 'magazyn')
- ✅ Testuje obsługę różnic w spacji i wielkości liter w lokalizacji
- ✅ Sprawdza wykluczanie użytkowników bez sellingPoint
- ✅ Testuje obsługę przypadków brzegowych (brak użytkownika, brak lokalizacji)

**Scenariusz rzeczywisty z API:**
- ✅ Sprawdza filtrowanie z dokładnymi danymi z API `/api/user`
- ✅ Weryfikuje że dla użytkownika "most" (Zakopane) zwraca: T, K, M, P, S

### 2. Testy Komponentów (WriteOff.test.js)

**Renderowanie komponentu:**
- ✅ Sprawdza czy komponent się renderuje poprawnie
- ✅ Weryfikuje wyświetlanie produktów użytkownika
- ✅ Testuje obsługę błędów API

**Podstawowa funkcjonalność:**
- ✅ Sprawdza wyświetlanie modalów opcji
- ✅ Weryfikuje ładowanie danych z Global State

### 3. Testy Integracyjne (WriteOffUserTransfer.test.js)

**Kompletny przepływ transferu:**
- ✅ Sprawdza kompletny przepływ od wyboru produktu do sukcesu transferu
- ✅ Weryfikuje że lista transferu zawiera tylko odpowiednich użytkowników
- ✅ Testuje wykluczenie zalogowanego użytkownika z listy transferu
- ✅ Sprawdza poprawne wywołania API transferu

**Anulowanie transferu:**
- ✅ Sprawdza anulowanie istniejącego transferu
- ✅ Weryfikuje różne opcje w menu dla przeniesionego produktu

**Obsługa błędów:**
- ✅ Testuje obsługę błędów transferu
- ✅ Sprawdza obsługę błędów sieciowych
- ✅ Weryfikuje wyświetlanie odpowiednich komunikatów błędów

**Przypadki brzegowe:**
- ✅ Testuje pusty lista użytkowników
- ✅ Sprawdza funkcjonalność pull-to-refresh
- ✅ Testuje obsługę użytkownika bez lokalizacji

## Scenariusze Testowe

### Scenariusz 1: Filtrowanie dla użytkownika "most" z Zakopanego

**Dane wejściowe:**
- Zalogowany użytkownik: `most@wp.pl` (symbol: M, lokalizacja: "Zakopane ")
- Lista użytkowników z API (8 użytkowników)

**Oczekiwany rezultat:**
```javascript
// Powinni być w liście transferu (bez zalogowanego użytkownika):
['T', 'K', 'P', 'S'] // 4 użytkowników

// NIE powinni być w liście:
- 'M' (zalogowany użytkownik)
- 'Admin' (role: admin)  
- 'MAGAZYN' (role: magazyn)
- 'Kar' (inna lokalizacja: Karpacz)
```

### Scenariusz 2: Porównywanie lokalizacji z tolerancją

**Dane wejściowe:**
- Użytkownik: lokalizacja = "zakopane" (lowercase, bez spacji)
- Inni użytkownicy: "ZAKOPANE ", " Zakopane " (różne przypadki i spacje)

**Oczekiwany rezultat:**
- Wszyscy użytkownicy z wariantami "Zakopane" powinni być dopasowani

### Scenariusz 3: Kompletny przepływ transferu

**Kroki:**
1. Otwarcie WriteOff
2. Kliknięcie menu produktu (⋮)
3. Wybór "Przepisz do"
4. Wybór użytkownika z listy
5. Potwierdzenie transferu

**Oczekiwany rezultat:**
- API transfer wywołane z poprawnymi danymi
- Modal zamknięty po sukcesie
- Dane odświeżone

## Dane Testowe

Testy używają rzeczywistych danych z API `/api/user`:

```javascript
const testUsers = [
  { symbol: 'Admin', role: 'admin', location: null },           // Wykluczony
  { symbol: 'T', role: 'user', location: 'Zakopane' },         // Uwzględniony  
  { symbol: 'K', role: 'user', location: 'Zakopane ' },        // Uwzględniony
  { symbol: 'M', role: 'user', location: 'Zakopane ' },        // Uwzględniony (ale wykluczony jako obecny)
  { symbol: 'P', role: 'user', location: 'Zakopane ' },        // Uwzględniony
  { symbol: 'MAGAZYN', role: 'magazyn', location: null },      // Wykluczony
  { symbol: 'S', role: 'user', location: 'Zakopane ' },        // Uwzględniony
  { symbol: 'Kar', role: 'user', location: 'Karpacz' }         // Wykluczony (inna lokalizacja)
];
```

## Mockowanie

### API Calls
- `fetch` - Mock dla wszystkich wywołań API
- Odpowiedzi transferu, błędy sieciowe

### React Navigation
- `useFocusEffect` - Mock dla lifecycle hooks

### Komponenty natywne
- `Alert.alert` - Mock dla alertów
- `AsyncStorage` - Mock dla trwałego przechowywania

### Context
- `GlobalStateContext` - Pełny mock z realistycznymi danymi

## Uruchamianie w CI/CD

Testy można zintegrować z pipeline CI/CD:

```yaml
# GitHub Actions example
- name: Run WriteOff Tests  
  run: |
    npm run test:writeoff
    npm run test:coverage
```

## Interpretacja Wyników

### ✅ Test Passed
Funkcjonalność filtrowania działa poprawnie zgodnie z wymaganiami.

### ❌ Test Failed  
Sprawdź:
1. Czy API endpoint `/api/user` jest dostępny
2. Czy struktura odpowiedzi API się nie zmieniła
3. Czy funkcja `getFilteredSellingPoints` poprawnie filtruje dane
4. Czy WriteOff komponent poprawnie używa Global State

### Typowe Problemy i Rozwiązania

**Problem:** Testy filtrowania nie przechodzą
- **Rozwiązanie:** Sprawdź czy `getFilteredSellingPoints` w Global State jest poprawnie zaimplementowana

**Problem:** Testy transferu timeout
- **Rozwiązanie:** Sprawdź czy mock fetch jest poprawnie skonfigurowany

**Problem:** Testy komponentów nie znajdują elementów
- **Rozwiązanie:** Sprawdź czy Global State mock ma wszystkie wymagane funkcje

## Rozszerzanie Testów

Aby dodać nowe testy:

1. Utwórz nowy plik w odpowiednim katalogu
2. Użyj istniejących mocków z `testConfig.js`
3. Dodaj nowy skrypt do `package.json`
4. Zaktualizuj dokumentację

## Monitoring i Metryki

Testy generują następujące metryki:
- Pokrycie kodu funkcji filtrowania
- Czas wykonania testów
- Liczba scenariuszy testowych
- Sprawdzenie wszystkich przypadków brzegowych
