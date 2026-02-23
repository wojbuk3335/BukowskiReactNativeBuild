// Konfiguracja API
// Używa zmiennych środowiskowych z .env lub wartości domyślnych

// Pobierz BASE_URL z .env lub użyj domyślnej wartości
const getBaseUrl = () => {
    // W środowisku testowym (CI/CD) użyj mock URL
    if (process.env.NODE_ENV === 'test') {
        return 'http://localhost:3000/api';
    }
    
    // Użyj zmiennej środowiskowej jeśli istnieje
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
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
