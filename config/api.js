// Konfiguracja API
// Zmień tylko ten adres IP gdy zmieniasz lokalizację
export const API_CONFIG = {
    BASE_URL: 'http://192.168.1.131:3000/api',
    TIMEOUT: 10000
};

// Funkcje pomocnicze
export const getApiUrl = (endpoint) => `${API_CONFIG.BASE_URL}${endpoint}`;
