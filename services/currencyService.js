// Currency Service - obsługuje kursy walut z ręcznym wprowadzaniem
import AsyncStorage from '@react-native-async-storage/async-storage';

class CurrencyService {
  // Cache dla kursów
  static exchangeRatesCache = {};
  static STORAGE_KEY = 'currency_rates';
  
  // Domyślne kursy (fallback)
  static DEFAULT_RATES = {
    'PLN': 1.0,
    'EUR': 4.2,
    'USD': 3.6,
    'GBP': 4.7,
    'CHF': 4.5,
    'CAD': 2.7,
    'HUF': 0.01
  };

  /**
   * Ładuje kursy walut z AsyncStorage
   * @returns {Promise<Object>} - obiekt z kursami walut
   */
  static async loadExchangeRates() {
    try {
      const storedRates = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (storedRates) {
        const rates = JSON.parse(storedRates);
        this.exchangeRatesCache = { ...this.DEFAULT_RATES, ...rates };
        return this.exchangeRatesCache;
      } else {
        // Pierwszego użycia - zapisz domyślne kursy
        await this.saveExchangeRates(this.DEFAULT_RATES);
        this.exchangeRatesCache = this.DEFAULT_RATES;
        return this.DEFAULT_RATES;
      }
    } catch (error) {
      console.error('Error loading exchange rates:', error);
      this.exchangeRatesCache = this.DEFAULT_RATES;
      return this.DEFAULT_RATES;
    }
  }

  /**
   * Zapisuje kursy walut do AsyncStorage
   * @param {Object} rates - obiekt z kursami walut
   * @returns {Promise<boolean>} - czy zapis się udał
   */
  static async saveExchangeRates(rates) {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(rates));
      this.exchangeRatesCache = rates;
      return true;
    } catch (error) {
      console.error('Error saving exchange rates:', error);
      return false;
    }
  }

  /**
   * Aktualizuje kurs konkretnej waluty
   * @param {string} currency - kod waluty (EUR, USD, etc.)
   * @param {number} rate - nowy kurs waluty
   * @returns {Promise<boolean>} - czy aktualizacja się udała
   */
  static async updateCurrencyRate(currency, rate) {
    try {
      if (currency === 'PLN') {
        return true; // PLN zawsze 1.0
      }
      
      const currentRates = await this.loadExchangeRates();
      const updatedRates = {
        ...currentRates,
        [currency]: parseFloat(rate)
      };
      
      return await this.saveExchangeRates(updatedRates);
    } catch (error) {
      console.error(`Error updating rate for ${currency}:`, error);
      return false;
    }
  }

  /**
   * Pobiera kurs konkretnej waluty
   * @param {string} currency - kod waluty
   * @returns {Promise<number>} - kurs waluty do PLN
   */
  static async getCurrencyRate(currency) {
    if (currency === 'PLN') {
      return 1.0;
    }
    
    const rates = await this.loadExchangeRates();
    return rates[currency] || this.DEFAULT_RATES[currency] || 1.0;
  }

  /**
   * Pobiera wszystkie kursy walut
   * @returns {Promise<Object>} - obiekt z kursami wszystkich walut
   */
  static async getAllExchangeRates() {
    return await this.loadExchangeRates();
  }

  /**
   * Konwertuje kwotę z jednej waluty na drugą
   * @param {number} amount - kwota do konwersji
   * @param {string} fromCurrency - waluta źródłowa
   * @param {string} toCurrency - waluta docelowa
   * @returns {Promise<number>} - przekonwertowana kwota
   */
  static async convertCurrency(amount, fromCurrency, toCurrency) {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    const rates = await this.getAllExchangeRates();
    
    // Konwersja do PLN jako waluta bazowa
    let amountInPLN = amount;
    if (fromCurrency !== 'PLN') {
      amountInPLN = amount * rates[fromCurrency];
    }
    
    // Konwersja z PLN do waluty docelowej
    if (toCurrency === 'PLN') {
      return Math.round(amountInPLN * 100) / 100;
    } else {
      const convertedAmount = amountInPLN / rates[toCurrency];
      return Math.round(convertedAmount * 100) / 100;
    }
  }

  /**
   * Oblicza procent zaliczki w PLN dla produktu
   * @param {number} advanceAmount - kwota zaliczki
   * @param {string} advanceCurrency - waluta zaliczki
   * @param {number} productPrice - cena produktu w PLN
   * @returns {Promise<Object>} - obiekt z przeliczeniami
   */
  static async calculateAdvancePercentage(advanceAmount, advanceCurrency, productPrice) {
    try {
      // Konwertuj zaliczkę na PLN
      const advanceInPLN = await this.convertCurrency(advanceAmount, advanceCurrency, 'PLN');
      
      // Oblicz procent
      const percentage = (advanceInPLN / productPrice) * 100;
      
      // Pobierz aktualny kurs dla wyświetlenia
      const exchangeRate = await this.getCurrencyRate(advanceCurrency);
      
      return {
        advanceAmount,
        advanceCurrency,
        advanceInPLN: Math.round(advanceInPLN * 100) / 100,
        productPrice,
        percentage: Math.round(percentage * 100) / 100,
        exchangeRate,
        conversionDate: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Błąd obliczania procentu zaliczki:', error);
      throw error;
    }
  }

  /**
   * Formatuje wyświetlanie kwoty z walutą
   * @param {number} amount - kwota
   * @param {string} currency - kod waluty
   * @returns {string} - sformatowana kwota
   */
  static formatAmount(amount, currency) {
    const formattedAmount = new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
    
    return `${formattedAmount} ${currency}`;
  }

  /**
   * Resetuje kursy do wartości domyślnych
   * @returns {Promise<boolean>} - czy reset się udał
   */
  static async resetToDefaultRates() {
    return await this.saveExchangeRates(this.DEFAULT_RATES);
  }

  /**
   * Pobiera domyślne kursy
   * @returns {Object} - obiekt z domyślnymi kursami
   */
  static getDefaultRates() {
    return { ...this.DEFAULT_RATES };
  }
}

// Export dla React Native
export default CurrencyService;