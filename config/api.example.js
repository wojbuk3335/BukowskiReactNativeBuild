// Konfiguracja API
// INSTRUKCJA: Ten plik nie jest już potrzebny!
// 
// Użyj pliku .env do konfiguracji:
// 1. Skopiuj .env.example do .env
// 2. Ustaw EXPO_PUBLIC_API_URL na swój adres IP
// 
// Przykłady:
// EXPO_PUBLIC_API_URL=http://192.168.1.XXX:3000/api  # Dla fizycznego telefonu
// EXPO_PUBLIC_API_URL=http://10.0.2.2:3000/api       # Dla emulatora Android
// EXPO_PUBLIC_API_URL=http://localhost:3000/api      # Dla localhost
// EXPO_PUBLIC_API_URL=https://bukowskiapp.pl/api     # Dla produkcji

export const API_CONFIG = {
    BASE_URL: 'https://bukowskiapp.pl/api',
    TIMEOUT: 30000
};

export const API_BASE_URL = API_CONFIG.BASE_URL;
export const getApiUrl = (endpoint) => `${API_CONFIG.BASE_URL}${endpoint}`;
