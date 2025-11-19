# ❓ FAQ - CZĘSTO ZADAWANE PYTANIA

## 🔒 BEZPIECZEŃSTWO

### Q: Czy muszę naprawić wszystko naraz?
**A:** NIE! Priorytetyzuj:
1. **NAJPIERW** (Tydzień 1): HTTPS + SecureStore + .env + podstawowa walidacja
2. **POTEM** (Tydzień 2-3): Testy + Certificate Pinning + Biometria
3. **NA KOŃCU** (Tydzień 4+): Optymalizacje + Monitoring

### Q: Czy mogę wdrożyć aplikację bez tych poprawek?
**A:** Technicznie TAK, ale **ABSOLUTNIE NIE ZALECANE**:
- ❌ Tokeny mogą być przechwycone (brak HTTPS)
- ❌ Dane użytkowników zagrożone
- ❌ Potencjalne kary RODO
- ❌ Utrata zaufania klientów
- ❌ Wysokie koszty naprawy później

**Rekomendacja:** Poczekaj 1-2 tygodnie i zrób to DOBRZE.

### Q: Ile kosztuje naprawa po wycieku danych?
**A:** Średnio:
- Kara RODO: do 20 mln EUR lub 4% obrotu
- Koszt naprawy: 50,000 - 500,000 PLN
- Utrata reputacji: bezcenne
- **Zapobieganie:** ~2 tygodnie pracy = MUCH CHEAPER!

### Q: Czy SecureStore jest naprawdę bezpieczny?
**A:** TAK!
- ✅ Używa natywnego Keychain (iOS) / KeyStore (Android)
- ✅ Szyfrowanie hardware-backed
- ✅ Niedostępny dla innych aplikacji
- ✅ Biometric protection opcjonalnie
- ⚠️  JEŚLI urządzenie rooted/jailbreak - ryzyko niższe, ale istnieje

### Q: Co z HTTPS na localhost?
**A:** W development:
- ✅ HTTP na localhost OK
- ✅ Użyj `.env.development` dla HTTP
- ✅ Użyj `.env.production` dla HTTPS
- ❌ NIE commituj .env do git

### Q: Czy certificate pinning jest konieczny?
**A:** 
- **Must-have:** Dla aplikacji bankowych, medycznych
- **Highly recommended:** Dla aplikacji z danymi osobowymi (jak Twoja)
- **Nice-to-have:** Dla aplikacji publicznych
- **Twój case:** HIGHLY RECOMMENDED (wrażliwe dane finansowe)

---

## 🧪 TESTY

### Q: Muszę mieć 80% coverage?
**A:** Idealnie TAK, ale:
- **Minimum:** 60% ogólnie
- **Must be 100%:** Dla authentication, payments, financial operations
- **Can be lower:** Dla UI components, styling
- **Focus on:** Critical paths, security, business logic

### Q: Jak szybko mogę napisać wszystkie testy?
**A:** Realistycznie:
- Security tests: 2-3 dni
- QR Scanner tests: 2 dni
- Component tests: 3-4 dni
- Integration tests: 3-4 dni
- E2E tests: 2-3 dni
- **TOTAL:** 2-3 tygodnie (jeśli pełny etat na testach)

### Q: Czy mogę pominąć testy E2E?
**A:** 
- **Can skip:** Jeśli masz dobre integration tests
- **Should not skip:** Dla critical flows (login, payments)
- **Alternative:** Manual testing checklist
- **Recommendation:** Przynajmniej 3-5 E2E testów dla głównych ścieżek

### Q: Które testy są najważniejsze?
**A:** Priorytet:
1. **Security tests** (token, auth, validation) - CRITICAL
2. **QR Scanner tests** (core functionality) - CRITICAL
3. **Financial operations** (payments, deposits) - CRITICAL
4. **Login/Auth flow** - HIGH
5. **Error handling** - HIGH
6. **Performance** - MEDIUM
7. **UI/UX** - LOW (manual testing OK)

### Q: Czy powinienem używać Detox dla E2E?
**A:**
- **Pros:** Bardzo dobre dla complex flows, realistic
- **Cons:** Trudniejszy setup, wolniejsze testy
- **Alternative:** Testing Library + manual testing
- **Recommendation:** START z Testing Library, ADD Detox później jeśli potrzeba

---

## 🔧 IMPLEMENTACJA

### Q: Od czego zacząć?
**A:** Dokładnie w tej kolejności:
1. Przeczytaj `SECURITY_TESTING_SUMMARY.md`
2. Zrób backup: `git checkout -b security-improvements`
3. Stwórz pliki .env
4. Zainstaluj: `npm install yup expo-secure-store`
5. Follow `QUICK_START_GUIDE.md`

### Q: Czy mogę użyć innych bibliotek niż Yup?
**A:** TAK, alternatywy:
- **Joi** - Podobny do Yup, świetny
- **Zod** - TypeScript-first, nowoczesny
- **Validator.js** - Lightweight, tylko walidacja
- **Recommendation:** Yup (najlepsze wsparcie dla React)

### Q: Jak przetestować SecureStore lokalnie?
**A:**
```javascript
// Test script
import * as SecureStore from 'expo-secure-store';

async function testSecureStore() {
  await SecureStore.setItemAsync('test', 'value');
  const value = await SecureStore.getItemAsync('test');
  console.log('SecureStore works:', value === 'value');
  await SecureStore.deleteItemAsync('test');
}
```

### Q: Czy muszę usunąć stary tokenService?
**A:** 
- **Immediately:** NIE
- **After testing:** TAK
- **Process:** 
  1. Stwórz secureTokenService
  2. Testuj równolegle
  3. Przełącz importy
  4. Testuj production-like
  5. Usuń stary (keep backup)

### Q: Co z upgradem istniejących użytkowników?
**A:** Migration strategy:
```javascript
// W secureTokenService.js
async migrateFromAsyncStorage() {
  const AsyncStorage = require('@react-native-async-storage/async-storage').default;
  
  const oldAccessToken = await AsyncStorage.getItem('BukowskiAccessToken');
  const oldRefreshToken = await AsyncStorage.getItem('BukowskiRefreshToken');
  
  if (oldAccessToken && oldRefreshToken) {
    await this.setTokens(oldAccessToken, oldRefreshToken);
    await AsyncStorage.multiRemove(['BukowskiAccessToken', 'BukowskiRefreshToken']);
    console.log('✅ Migrated tokens to SecureStore');
  }
}
```

---

## 🐛 DEBUGGING

### Q: Testy failują po dodaniu SecureStore
**A:** Mock SecureStore:
```javascript
// jest-setup.js
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
```

### Q: "Cannot read property 'extra' of undefined"
**A:** Dodaj fallback w config:
```javascript
const ENV = {
  API_URL: Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || 
           process.env.EXPO_PUBLIC_API_URL || 
           'http://localhost:3000/api'
};
```

### Q: HTTPS nie działa w development
**A:** 
1. Sprawdź czy używasz `.env.development`
2. W dev można używać HTTP
3. Upewnij się że `config/api.js` czyta z .env
4. Restart: `npm start -- --clear`

### Q: Coverage pokazuje 0% dla nowego pliku
**A:**
1. Sprawdź czy plik jest w `transformIgnorePatterns`
2. Sprawdź czy import path jest poprawny
3. Uruchom: `npm test -- --clearCache`
4. Uruchom: `npm run test:coverage`

---

## 📱 DEPLOYMENT

### Q: Jak przełączyć się między env?
**A:**
```bash
# Development
cp .env.development .env
npm start

# Production build
cp .env.production .env
eas build --platform all
```

### Q: Czy .env powinien być w git?
**A:** 
- ❌ `.env` - NIE (dodaj do .gitignore)
- ❌ `.env.development` - NIE
- ❌ `.env.production` - NIE
- ✅ `.env.example` - TAK (bez secrets)

### Q: Jak zarządzać secrets w CI/CD?
**A:** Użyj environment variables w CI:
```yaml
# GitHub Actions
env:
  EXPO_PUBLIC_API_URL: ${{ secrets.API_URL }}
  EXPO_PUBLIC_JWT_SECRET: ${{ secrets.JWT_SECRET }}
```

### Q: Jak zbudować production build?
**A:**
```bash
# 1. Update .env.production
# 2. Build
eas build --profile production --platform all

# 3. Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## 🎯 PERFORMANCE

### Q: Czy SecureStore spowalnia aplikację?
**A:** 
- **Read/Write:** ~10-50ms (negligible)
- **Impact:** Minimal na user experience
- **Benefit:** WORTH IT dla security
- **Optimization:** Cache tokens in memory (already done in service)

### Q: Czy walidacja spowolni formularze?
**A:**
- **Impact:** 1-5ms per validation
- **User perception:** None
- **Optimization:** Debounce for real-time validation
- **Recommendation:** Validate on submit, optional on blur

### Q: Testy są wolne, jak przyspieszyć?
**A:**
```bash
# Tylko zmienione pliki
npm test -- --onlyChanged

# Parallel execution
npm test -- --maxWorkers=4

# Skip coverage
npm test -- --no-coverage

# Watch mode (fastest for development)
npm test -- --watch
```

---

## 💰 KOSZTY

### Q: Ile to będzie kosztować (czas)?
**A:** Estymacja dla 1 developera:
- **Minimum (security only):** 1-2 tygodnie
- **Recommended (security + tests):** 3-4 tygodnie
- **Complete (all features):** 2-3 miesiące
- **Maintenance:** ~5% monthly effort

### Q: Czy mogę outsource'ować?
**A:** TAK, opcje:
- **Security consultant:** $100-300/h
- **Junior dev (tests):** $20-50/h
- **Senior dev (architecture):** $50-150/h
- **Total cost estimate:** $5,000 - $20,000
- **DIY with these guides:** $0 (tylko Twój czas)

### Q: ROI (Return on Investment)?
**A:**
- **Investment:** 2-4 tygodnie pracy
- **Prevented costs:** 
  - Data breach: $50k - $500k
  - GDPR fine: up to 20M EUR
  - Lost customers: Priceless
- **ROI:** INFINITE (jeśli zapobiegnie breach)

---

## 🎓 LEARNING

### Q: Nie znam TypeScript, mogę użyć?
**A:** TAK!
- Wszystkie przykłady działają w JS
- TypeScript opcjonalny (recommended dla later)
- Start z JS, migrate do TS później

### Q: Gdzie mogę nauczyć się więcej?
**A:** Resources:
- **Security:** [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)
- **Testing:** [Jest Docs](https://jestjs.io/), [Testing Library](https://testing-library.com/)
- **React Native:** [Official Docs](https://reactnative.dev/)
- **Expo:** [Expo Docs](https://docs.expo.dev/)

### Q: Czy są kursy online?
**A:** Polecane:
- Udemy: "React Native Security Best Practices"
- Pluralsight: "React Native Testing"
- YouTube: "Coding with Curry" (security)
- egghead.io: "Testing React Native Apps"

---

## 🤝 WSPARCIE

### Q: Gdzie szukać pomocy?
**A:**
1. **Dokumentacja w tym repo** (START HERE)
2. **Expo Discord:** https://chat.expo.dev/
3. **Stack Overflow:** tag `react-native` + `expo`
4. **GitHub Issues:** dla specific libraries
5. **Reddit:** r/reactnative

### Q: Jak zadać dobre pytanie?
**A:** Include:
1. Co próbujesz zrobić?
2. Co się dzieje (error message)?
3. Co próbowałeś?
4. Minimal reproducible example
5. Environment (iOS/Android/Expo version)

### Q: Czy mogę hire konsultanta?
**A:** TAK, opcje:
- **Expo consultants:** https://expo.dev/consultants
- **Toptal:** https://www.toptal.com/
- **Upwork:** https://www.upwork.com/
- **Local:** Polskie firmy React Native

---

## ✅ QUICK ANSWERS

### "Czy to jest konieczne?"
**A:** TAK dla produkcji, NIE dla hobby project.

### "Ile czasu to zajmie?"
**A:** Minimum 1-2 tygodnie, recommended 3-4 tygodnie.

### "Czy mogę pominąć X?"
**A:** Sprawdź priorytet w `ACTION_PLAN.md`.

### "Nie wiem od czego zacząć"
**A:** `QUICK_START_GUIDE.md` krok po kroku.

### "Mam błąd X"
**A:** Sprawdź "TROUBLESHOOTING" w `QUICK_START_GUIDE.md`.

### "Czy to zadziała z moją wersją?"
**A:** Sprawdź compatibility w `package.json`.

---

## 🚨 EMERGENCY

### "Odkryłem lukę bezpieczeństwa w produkcji!"
**A:** 
1. ❌ **NIE panikuj**
2. ✅ **Assess:** Jak poważne?
3. ✅ **Hotfix:** Jeśli critical, deploy fix ASAP
4. ✅ **Inform:** Users jeśli data breach
5. ✅ **Audit:** Przejrzyj wszystkie luki
6. ✅ **Implement:** Security measures z tego guide

### "Aplikacja nie działa po zmianach!"
**A:**
1. Git revert do working version
2. Deploy working version
3. Fix changes locally
4. Test thoroughly
5. Deploy again

### "Użytkownicy się nie mogą zalogować!"
**A:**
1. Check if SecureStore migration completed
2. Add fallback to AsyncStorage temporarily
3. Force re-login for all users
4. Monitor error logs

---

**Nie znalazłeś odpowiedzi?**
- Przeczytaj dokumentację ponownie
- Sprawdź przykłady w `IMPLEMENTATION_EXAMPLES.md`
- Zobacz troubleshooting w `QUICK_START_GUIDE.md`
- Zapytaj na Expo Discord

**Good luck! 🍀**
