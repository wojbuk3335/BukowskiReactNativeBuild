// Konfiguracja API
// INSTRUKCJA: Skopiuj ten plik do config/api.js i ustaw swój lokalny IP
// cp config/api.example.js config/api.js

export const API_CONFIG = {
    // PRODUCTION (odkomentuj dla produkcji):
    // BASE_URL: 'https://bukowskiapp.pl/api',
    
    // DEVELOPMENT (wybierz odpowiednią opcję):
    // Opcja 1 - localhost (jeśli backend i app są na tej samej maszynie):
    BASE_URL: 'http://localhost:3000/api',
    
    // Opcja 2 - IP lokalne (jeśli testujesz na fizycznym telefonie):
    // BASE_URL: 'http://192.168.1.XXX:3000/api', // Zamień XXX na swój IP
    
    TIMEOUT: 30000 // 30 sekund
};

// Export dla kompatybilności
export const API_BASE_URL = API_CONFIG.BASE_URL;

// Funkcje pomocnicze
export const getApiUrl = (endpoint) => `${API_CONFIG.BASE_URL}${endpoint}`;
