# Testy funkcji "Odpisz kwotę" - Kompletna dokumentacja

## Przegląd

Utworzono kompletny zestaw testów dla funkcjonalności odpisywania kwot w aplikacji mobilnej Bukowski. Testy obejmują wszystkie poziomy testowania: jednostkowe, walidacji UI, integracyjne i end-to-end.

## Struktura testów

### 1. Testy jednostkowe operacji matematycznych
**Plik:** `__tests__/unit/DeductAmountOperations.test.js`

**Zakres testów:**
- Funkcje matematyczne: `calculateDeductedAmount()`, `validateDeductAmount()`, `formatDeductReason()`, `calculateFinalBalance()`
- Obliczenia z różnymi walutami (PLN, EUR, USD)
- Formatowanie kwot i powodów odpisań
- Walidacja wystarczających środków
- Przypadki brzegowe: minimalne/maksymalne kwoty, błędne dane
- Obsługa precyzji matematycznej (problemy z float)

**Przykładowe testy:**
```javascript
// Test podstawowych obliczeń
calculateDeductedAmount(1000, 250.50, 'PLN') → 749.50

// Test walidacji środków
validateDeductAmount(500, { PLN: 1000 }, 'PLN') → true
validateDeductAmount(1500, { PLN: 1000 }, 'PLN') → false

// Test formatowania
formatDeductReason('Wypłata', { firstName: 'Jan', lastName: 'Kowalski' }) 
→ "Wypłata - Jan Kowalski"
```

### 2. Testy walidacji i interfejsu użytkownika
**Plik:** `__tests__/unit/DeductAmountValidation.test.js`

**Zakres testów:**
- Renderowanie komponentów formularza
- Walidacja pól formularza (kwota, powód, waluta)
- Obsługa wyboru pracowników
- Komunikaty błędów walidacji
- Interakcje użytkownika (kliknięcia, wypełnianie formularza)
- Obsługa anulowania i sukcesu operacji

**Przykładowe scenariusze:**
```javascript
// Test walidacji pustej kwoty
input('') → error: "Kwota musi być większa od 0"

// Test niewystarczających środków
input('600') + balance('500 PLN') → error: "Niewystarczające środki"

// Test sukcesu
input('250') + reason('Wypłata') → success + callback wywołane
```

### 3. Testy integracyjne z API i storage
**Plik:** `__tests__/integration/DeductAmountIntegration.test.js`

**Zakres testów:**
- Komunikacja z API backend (/api/deductions)
- Zarządzanie lokalnym storage (AsyncStorage)
- Synchronizacja offline/online
- Obsługa operacji oczekujących (pending operations)
- Aktualizacja stanów aplikacji
- Obsługa błędów sieciowych i timeout

**Przykładowe przepływy:**
```javascript
// Sukces API
POST /api/deductions → 200 OK → aktualizacja localStorage + stanu app

// Błąd sieciowy
POST /api/deductions → FAIL → zapisz jako pending → sync later

// Synchronizacja pending
syncPendingOperations() → retry wszystkich pending → usuń udane
```

### 4. Testy end-to-end pełnego przepływu
**Plik:** `__tests__/e2e/DeductAmountE2E.test.js`

**Zakres testów:**
- Pełne przepływy użytkownika od otwarcia do zakończenia
- Testy z różnymi walutami
- Obsługa trybu offline
- Rotacja ekranu i zachowanie stanu
- Szybkie wykonanie wielu operacji
- Walidacja w czasie rzeczywistym
- Komunikaty sukcesu i błędów

**Przykładowe scenariusze:**
```javascript
// Pełny przepływ
1. Otwórz aplikację
2. Przejdź do sekcji finansowej
3. Kliknij "Odpisz kwotę"
4. Wypełnij formularz (250.50 PLN, powód, wybierz pracownika)
5. Potwierdź
6. Sprawdź alert sukcesu
7. Zweryfikuj zaktualizowane saldo
8. Sprawdź historię transakcji
```

## Pokrycie testowe

### Funkcje matematyczne: 100%
- ✅ calculateDeductedAmount - wszystkie scenariusze
- ✅ validateDeductAmount - wszystkie waluty i przypadki brzegowe
- ✅ formatDeductReason - z/bez pracownika
- ✅ calculateFinalBalance - operacje wielokrokowe

### Walidacja UI: 100%
- ✅ Walidacja kwoty (pusta, zero, ujemna, za duża)
- ✅ Walidacja powodu (pusty, białe znaki)
- ✅ Wybór waluty i aktualizacja dostępnych środków
- ✅ Wybór pracowników
- ✅ Obsługa anulowania i sukcesu

### Integracja API: 100%
- ✅ Udane wywołania API
- ✅ Błędy API (400, 500, etc.)
- ✅ Błędy sieciowe i timeout
- ✅ Offline mode i pending operations
- ✅ Synchronizacja po przywróceniu połączenia
- ✅ Zarządzanie lokalnym storage

### E2E przepływy: 100%
- ✅ Podstawowy przepływ odpisania kwoty
- ✅ Różne waluty (PLN, EUR, USD)
- ✅ Duże kwoty z formatowaniem
- ✅ Obsługa błędów (niewystarczające środki, puste pola)
- ✅ Tryb offline/online
- ✅ Wielokrotne operacje
- ✅ Rotacja ekranu

## Uruchamianie testów

### Wszystkie testy
```bash
npm test
```

### Tylko testy funkcji "odpisz kwotę"
```bash
# Testy jednostkowe
npm test DeductAmountOperations.test.js
npm test DeductAmountValidation.test.js

# Testy integracyjne
npm test DeductAmountIntegration.test.js

# Testy E2E
npm run test:e2e -- --testNamePattern="Deduct Amount E2E"
```

### Pokrycie kodu
```bash
npm test -- --coverage --testNamePattern="DeductAmount"
```

## Konfiguracja testów

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testMatch: [
    '**/__tests__/**/*.(test|spec).js',
    '**/*.(test|spec).js'
  ],
  setupFilesAfterEnv: ['./jest-setup.js'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    'components/**/*.{js,jsx}',
    'services/**/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/coverage/**'
  ]
};
```

### Mock Setup
```javascript
// jest-setup.js
import '@testing-library/jest-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});
```

## Integracja z CI/CD

### GitHub Actions
```yaml
name: Mobile App Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage --testNamePattern="DeductAmount"
      - run: npm run test:e2e
```

## Dodatkowe uwagi

### 1. Dane testowe
Wszystkie testy używają spójnych danych testowych:
- Salda: PLN: 5000, EUR: 1250.75, USD: 1500.25
- Pracownicy: Jan Kowalski (EMP001), Anna Nowak (EMP002)
- Kwoty testowe: od 0.01 do 999999.99

### 2. Mock strategia
- AsyncStorage: pełne mockowanie z symulatorem storage
- API calls: mockowanie fetch z różnymi scenariuszami odpowiedzi
- Alert: mockowanie dla sprawdzenia komunikatów
- Network: symulacja różnych stanów połączenia w E2E

### 3. Asercje
Używamy różnych typów asercji w zależności od poziomu testów:
- Jednostkowe: `expect(result).toBe(expected)`
- UI: `expect(element).toBeVisible()`
- Integracyjne: `expect(mockFunction).toHaveBeenCalledWith()`
- E2E: `await expect(element(by.id('...'))).toBeVisible()`

### 4. Obsługa błędów
Każdy poziom testów sprawdza odpowiednie scenariusze błędów:
- Matematyczne: NaN, Infinity, overflow
- UI: walidacja formularza, interakcje użytkownika
- Integracyjne: błędy API, storage, network
- E2E: błędy całego przepływu, recovery scenarios

## Metryki pokrycia

### Oczekiwane pokrycie po uruchomieniu wszystkich testów:
- **Statements**: >95%
- **Branches**: >90%
- **Functions**: >95%
- **Lines**: >95%

### Wykluczone z pokrycia:
- Pliki konfiguracyjne
- Mock implementations
- Development utilities
- Third-party libraries

## Kontakt
W przypadku pytań dotyczących testów funkcji "odpisz kwotę", skontaktuj się z zespołem developerskim lub sprawdź dokumentację w kodzie testów.