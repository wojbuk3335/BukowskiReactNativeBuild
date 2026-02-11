# Naprawienie drukowania w production build

## Problem
Aplikacja wysyła HTTP POST do drukarki (192.168.1.25:9100), ale w production:
- **Android** blokuje cleartext HTTP traffic
- **iOS** blokuje przez App Transport Security (ATS)

## Rozwiązanie

### 1. Dodano konfigurację w app.json:

**ANDROID:**
```json
"android": {
  "usesCleartextTraffic": true,
  "permissions": [
    "INTERNET",
    "ACCESS_NETWORK_STATE", 
    "ACCESS_WIFI_STATE"
  ]
}
```

**iOS:**
```json
"ios": {
  "infoPlist": {
    "NSAppTransportSecurity": {
      "NSAllowsArbitraryLoads": false,
      "NSExceptionDomains": {
        "192.168.1.25": {
          "NSExceptionAllowsInsecureHTTPLoads": true
        },
        "192.168.1.22": {
          "NSExceptionAllowsInsecureHTTPLoads": true
        },
        "localhost": {
          "NSExceptionAllowsInsecureHTTPLoads": true
        }
      }
    }
  }
}
```

### 2. Opcja: Zainstaluj expo-build-properties (opcjonalne, ale zalecane)

```bash
npx expo install expo-build-properties
```

Następnie dodaj do app.json -> plugins:
```json
[
  "expo-build-properties",
  {
    "android": {
      "usesCleartextTraffic": true
    }
  }
]
```

### 3. Przebuduj aplikację:

**ANDROID:**
```bash
# Zwiększ wersję w app.json: "version": "1.0.10"
eas build --platform android --profile production
```

**iOS:**
```bash
# Zwiększ wersję w app.json: "version": "1.0.10"
# Zwiększ buildNumber w ios: "buildNumber": "10"
eas build --platform ios --profile production
```

**OBA PLATFORMY:**
```bash
eas build --platform all --profile production
```

### 4. Testowanie
Po zainstalowaniu nowego buildu:
- Połącz się z WiFi sklepu
- Sprawdź czy drukarka 192.168.1.25 jest włączona
- Spróbuj wydrukować etykietę

## Uwagi
- **Android:** `usesCleartextTraffic: true` pozwala na HTTP tylko dla lokalnych IP
- **iOS:** `NSAppTransportSecurity` z wyjątkami dla konkretnych IP (192.168.1.25, 192.168.1.22, localhost)
- Dla większego bezpieczeństwa używamy `NSAllowsArbitraryLoads: false` + konkretne wyjątki
- Network-security-config.xml dla Android już utworzony (opcjonalny dodatek)

## Bezpieczeństwo
✅ **BEZPIECZNE** - Zezwalamy na HTTP TYLKO dla:
- Drukarki: 192.168.1.25
- Backend testowy: 192.168.1.22
- Localhost (development)

❌ **ZABLOKOWANE** - Wszystkie inne domeny wymagają HTTPS
