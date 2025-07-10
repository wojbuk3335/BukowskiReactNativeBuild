# Testy API i Ładowania Danych

## Przegląd

Ten zestaw testów sprawdza czy przy każdym zalogowaniu i ładowaniu aplikacji wartości z API (stocks, colors, sizes) są ładowane poprawnie. Testy obejmują:

- **Testy jednostkowe** - Sprawdzają funkcjonalność GlobalState
- **Testy integracyjne** - Sprawdzają przepływ logowania i ładowania danych
- **Testy wydajności** - Sprawdzają wydajność API pod obciążeniem
- **Testy E2E** - Sprawdzają kompletny przepływ aplikacji

## Struktura Testów

```
__tests__/
├── config/
│   └── testConfig.js          # Konfiguracja testów i helpery
├── context/
│   └── GlobalState.test.js    # Testy jednostkowe GlobalState
├── integration/
│   └── SignInDataLoading.test.js  # Testy integracyjne logowania
├── performance/
│   └── APIPerformance.test.js     # Testy wydajności API
└── e2e/
    └── ApplicationFlow.test.js    # Testy end-to-end
```

## Uruchamianie Testów

### Wszystkie testy API
```bash
npm run test:api
```

### Poszczególne grupy testów
```bash
# Testy jednostkowe
npm run test:unit

# Testy integracyjne
npm run test:integration

# Testy wydajności
npm run test:performance

# Testy end-to-end
npm run test:e2e

# Wszystkie testy API z pokryciem
npm run test:all-api
```

### Tryb watch (automatyczne ponowne uruchamianie)
```bash
npm run test:watch
```

### Pokrycie kodu
```bash
npm run test:coverage
npm run test:api-coverage  # Tylko dla testów API
```

## Co Sprawdzają Testy

### 1. Testy Jednostkowe (GlobalState.test.js)

**Ładowanie początkowe aplikacji:**
- ✅ Sprawdza czy wszystkie API (stocks, colors, sizes, goods, state) są wywoływane przy starcie
- ✅ Weryfikuje poprawne ustawienie stanu po załadowaniu danych
- ✅ Testuje obsługę błędów API i ustawienie pustych tablic jako fallback

**Przepływ logowania:**
- ✅ Sprawdza czy login API jest wywoływane z poprawnymi danymi
- ✅ Weryfikuje aktualizację stanu użytkownika po udanym logowaniu
- ✅ Testuje obsługę błędów logowania

**Funkcje odświeżania danych:**
- ✅ Sprawdza ręczne odświeżanie stocks, colors, sizes
- ✅ Weryfikuje czy dane są aktualizowane w stanie globalnym

**Wylogowanie:**
- ✅ Sprawdza czy wszystkie dane są czyszczone przy wylogowaniu

### 2. Testy Integracyjne (SignInDataLoading.test.js)

**Kompletny przepływ logowania:**
- ✅ Sprawdza załadowanie stocks, colors, sizes po udanym logowaniu
- ✅ Weryfikuje zapisanie danych użytkownika w AsyncStorage
- ✅ Testuje przekierowanie do strony głównej

**Obsługa błędów:**
- ✅ Sprawdza obsługę błędów API podczas ładowania danych po logowaniu
- ✅ Testuje obsługę błędów sieciowych podczas logowania

**Sesja użytkownika:**
- ✅ Sprawdza przywracanie sesji z AsyncStorage
- ✅ Weryfikuje omijanie logowania gdy użytkownik jest już zalogowany

### 3. Testy Wydajności (APIPerformance.test.js)

**Wydajność i obciążenie:**
- ✅ Sprawdza obsługę dużych zbiorów danych (1000+ elementów)
- ✅ Testuje równoczesne żądania API bez konfliktów
- ✅ Weryfikuje czas odpowiedzi API (< 1 sekunda na żądanie)

**Scenariusze timeout:**
- ✅ Testuje obsługę powolnych odpowiedzi API
- ✅ Sprawdza graceful degradation przy błędach API

**Spójność danych:**
- ✅ Weryfikuje spójność danych podczas szybkich zmian stanu
- ✅ Testuje brak race conditions przy równoczesnych aktualizacjach

### 4. Testy E2E (ApplicationFlow.test.js)

**Kompletny przepływ aplikacji:**
- ✅ Start aplikacji → Załadowanie danych → Nieudane logowanie → Udane logowanie → Ładowanie danych po logowaniu → Nawigacja
- ✅ Przywracanie sesji przy ponownym uruchomieniu aplikacji
- ✅ Odzyskiwanie po awariach sieci

## Szczegóły Sprawdzanych API

### Endpointy API
- `GET /api/state` - Stan aplikacji
- `GET /api/excel/stock/get-all-stocks` - Lista stocks
- `GET /api/excel/color/get-all-colors` - Lista kolorów
- `GET /api/excel/size/get-all-sizes` - Lista rozmiarów
- `GET /api/excel/goods/get-all-goods` - Lista towarów
- `POST /api/user/login` - Logowanie użytkownika

### Sprawdzane Scenariusze

1. **Poprawne ładowanie danych:**
   - Wszystkie API są wywoływane przy starcie aplikacji
   - Dane są poprawnie parsowane i zapisywane w stanie globalnym
   - Post-login API calls są wykonywane po udanym logowaniu

2. **Obsługa błędów:**
   - API zwraca błąd HTTP (4xx, 5xx)
   - Błędy sieciowe (brak połączenia)
   - Timeouty API
   - Niepoprawne dane JSON

3. **Wydajność:**
   - Czas ładowania < 5 sekund dla kompletnego startu
   - Czas odpowiedzi API < 1 sekunda
   - Obsługa 10+ równoczesnych żądań

4. **Persystencja:**
   - Zapisywanie danych użytkownika w AsyncStorage
   - Przywracanie sesji przy ponownym uruchomieniu
   - Czyszczenie danych przy wylogowaniu

## Interpretacja Wyników

### ✅ Test Passed
Funkcjonalność działa poprawnie zgodnie z wymaganiami.

### ❌ Test Failed
Sprawdź:
1. Czy API endpoint jest dostępny
2. Czy struktura odpowiedzi API się nie zmieniła
3. Czy GlobalState poprawnie przetwarza dane
4. Czy AsyncStorage działa prawidłowo

### Typowe Problemy i Rozwiązania

**Problem:** Testy timeout
- **Rozwiązanie:** Sprawdź połączenie z API, zwiększ timeout w testach

**Problem:** Mock fetch nie działa
- **Rozwiązanie:** Sprawdź czy fetch jest poprawnie mockowany w setupFiles

**Problem:** AsyncStorage błędy
- **Rozwiązanie:** Sprawdź konfigurację mock AsyncStorage w jest-setup.js

## Uruchamianie w CI/CD

Testy można zintegrować z pipeline CI/CD:

```yaml
# GitHub Actions example
- name: Run API Tests
  run: |
    npm run test:api
    npm run test:coverage
```

## Rozszerzanie Testów

Aby dodać nowe testy:

1. Utwórz nowy plik w odpowiednim katalogu (`__tests__/`)
2. Użyj helperów z `testConfig.js`
3. Dodaj nowy skrypt do `package.json`
4. Zaktualizuj dokumentację

## Monitoring i Metryki

Testy generują następujące metryki:
- Czas wykonania każdego testu
- Pokrycie kodu
- Liczba wywołań API
- Czas odpowiedzi API
- Szczegóły błędów

Te metryki można wykorzystać do monitorowania wydajności i niezawodności aplikacji.
