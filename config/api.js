// Konfiguracja API
// Używa zmiennych środowiskowych z .env lub wartości domyślnych

const getExpoLanHost = () => {
    try {
        const expoConstants = require('expo-constants');
        const Constants = expoConstants?.default || expoConstants;
        const hostUri =
            Constants?.expoConfig?.hostUri ||
            Constants?.manifest2?.extra?.expoClient?.hostUri ||
            Constants?.manifest?.debuggerHost ||
            null;

        if (!hostUri || typeof hostUri !== 'string') {
            return null;
        }

        return hostUri.split(':')[0] || null;
    } catch (_error) {
        return null;
    }
};

// Pobierz BASE_URL z .env lub użyj domyślnej wartości
const getBaseUrl = () => {
    // W środowisku testowym (CI/CD) użyj mock URL
    if (process.env.NODE_ENV === 'test') {
        return 'http://localhost:3000/api';
    }

    // Release build na telefonie ma zawsze używać backendu produkcyjnego.
    // Dzięki temu lokalne .env (np. 192.168.x.x) nie zepsuje logowania po buildzie.
    if (typeof __DEV__ !== 'undefined' && !__DEV__) {
        return 'https://bukowskiapp.pl/api';
    }
    
    // Użyj zmiennej środowiskowej jeśli istnieje
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }

    // W development próbuj automatycznie użyć IP hosta Expo (działa na fizycznym telefonie)
    if (process.env.NODE_ENV === 'development') {
        const lanHost = getExpoLanHost();
        if (lanHost) {
            return `http://${lanHost}:3000/api`;
        }

        // Fallback dla development
        return 'http://localhost:3000/api';
    }
    
    // Domyślnie produkcja
    return 'https://bukowskiapp.pl/api';
};

export const API_CONFIG = {
    BASE_URL: getBaseUrl(),
    TIMEOUT: 30000 // 30 sekund
};

// Export dla kompatybilności
export const API_BASE_URL = API_CONFIG.BASE_URL;

// Funkcje pomocnicze
export const getApiUrl = (endpoint) => `${API_CONFIG.BASE_URL}${endpoint}`;
