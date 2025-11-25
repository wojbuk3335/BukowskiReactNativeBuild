/**
 * Currency Service Tests
 * Comprehensive tests for currency conversion, exchange rates, and calculations
 */

import CurrencyService from '../../services/currencyService';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

describe('CurrencyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset cache
    CurrencyService.exchangeRatesCache = {};
  });

  describe('Default Rates', () => {
    test('should have correct default rates defined', () => {
      const defaults = CurrencyService.getDefaultRates();
      
      expect(defaults.PLN).toBe(1.0);
      expect(defaults.EUR).toBe(4.2);
      expect(defaults.USD).toBe(3.6);
      expect(defaults.GBP).toBe(4.7);
      expect(defaults.CHF).toBe(4.5);
      expect(defaults.CAD).toBe(2.7);
      expect(defaults.HUF).toBe(0.01);
    });

    test('should return a copy of default rates (not reference)', () => {
      const defaults1 = CurrencyService.getDefaultRates();
      const defaults2 = CurrencyService.getDefaultRates();
      
      defaults1.EUR = 999;
      
      expect(defaults2.EUR).toBe(4.2);
      expect(CurrencyService.DEFAULT_RATES.EUR).toBe(4.2);
    });
  });

  describe('Loading Exchange Rates', () => {
    test('should load rates from AsyncStorage successfully', async () => {
      const storedRates = {
        PLN: 1.0,
        EUR: 4.5,
        USD: 3.8
      };
      
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(storedRates));
      
      const rates = await CurrencyService.loadExchangeRates();
      
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('currency_rates');
      expect(rates.EUR).toBe(4.5);
      expect(rates.USD).toBe(3.8);
      expect(rates.PLN).toBe(1.0);
    });

    test('should merge stored rates with defaults', async () => {
      const storedRates = {
        EUR: 4.5, // override
        USD: 3.8  // override
        // GBP, CHF, etc. should come from defaults
      };
      
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(storedRates));
      
      const rates = await CurrencyService.loadExchangeRates();
      
      expect(rates.EUR).toBe(4.5);
      expect(rates.USD).toBe(3.8);
      expect(rates.GBP).toBe(4.7); // from defaults
      expect(rates.CHF).toBe(4.5); // from defaults
    });

    test('should save and use default rates on first load', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(null);
      AsyncStorage.setItem.mockResolvedValueOnce(true);
      
      const rates = await CurrencyService.loadExchangeRates();
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'currency_rates',
        JSON.stringify(CurrencyService.DEFAULT_RATES)
      );
      expect(rates).toEqual(CurrencyService.DEFAULT_RATES);
    });

    test('should use defaults on error and log error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));
      
      const rates = await CurrencyService.loadExchangeRates();
      
      expect(rates).toEqual(CurrencyService.DEFAULT_RATES);
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(consoleErrorSpy.mock.calls[0]).toEqual(
        expect.arrayContaining([
          expect.stringContaining('ERROR'),
          'Error loading exchange rates:',
          expect.any(Error)
        ])
      );
      
      consoleErrorSpy.mockRestore();
    });

    test('should cache loaded rates', async () => {
      const storedRates = { PLN: 1.0, EUR: 4.5 };
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(storedRates));
      
      await CurrencyService.loadExchangeRates();
      
      expect(CurrencyService.exchangeRatesCache.EUR).toBe(4.5);
    });
  });

  describe('Saving Exchange Rates', () => {
    test('should save rates to AsyncStorage successfully', async () => {
      const newRates = {
        PLN: 1.0,
        EUR: 4.8,
        USD: 4.0
      };
      
      AsyncStorage.setItem.mockResolvedValueOnce(true);
      
      const result = await CurrencyService.saveExchangeRates(newRates);
      
      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'currency_rates',
        JSON.stringify(newRates)
      );
      expect(CurrencyService.exchangeRatesCache).toEqual(newRates);
    });

    test('should return false on save error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      AsyncStorage.setItem.mockRejectedValueOnce(new Error('Save error'));
      
      const result = await CurrencyService.saveExchangeRates({ EUR: 4.5 });
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Updating Currency Rate', () => {
    test('should update single currency rate', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ PLN: 1.0, EUR: 4.2, USD: 3.6 })
      );
      AsyncStorage.setItem.mockResolvedValueOnce(true);
      
      const result = await CurrencyService.updateCurrencyRate('EUR', 4.8);
      
      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'currency_rates',
        expect.stringContaining('"EUR":4.8')
      );
    });

    test('should not allow updating PLN rate', async () => {
      const result = await CurrencyService.updateCurrencyRate('PLN', 2.0);
      
      expect(result).toBe(true);
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    });

    test('should parse rate as float', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify(CurrencyService.DEFAULT_RATES)
      );
      AsyncStorage.setItem.mockResolvedValueOnce(true);
      
      await CurrencyService.updateCurrencyRate('EUR', '4.85');
      
      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData.EUR).toBe(4.85);
      expect(typeof savedData.EUR).toBe('number');
    });

    test('should handle errors when updating rate', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      // Mock both getItem and setItem to fail
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({ PLN: 1.0, EUR: 4.2 }));
      AsyncStorage.setItem.mockRejectedValueOnce(new Error('Update error'));
      
      const result = await CurrencyService.updateCurrencyRate('EUR', 4.5);
      
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    test('should add new currency if not exists', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ PLN: 1.0, EUR: 4.2 })
      );
      AsyncStorage.setItem.mockResolvedValueOnce(true);
      
      await CurrencyService.updateCurrencyRate('SEK', 0.35);
      
      const savedData = JSON.parse(AsyncStorage.setItem.mock.calls[0][1]);
      expect(savedData.SEK).toBe(0.35);
    });
  });

  describe('Getting Currency Rate', () => {
    test('should always return 1.0 for PLN', async () => {
      const rate = await CurrencyService.getCurrencyRate('PLN');
      expect(rate).toBe(1.0);
    });

    test('should return stored rate for currency', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ PLN: 1.0, EUR: 4.5, USD: 3.8, GBP: 4.7, CHF: 4.5, CAD: 2.7, HUF: 0.01 })
      );
      
      const eurRate = await CurrencyService.getCurrencyRate('EUR');
      
      // Reset mock for next call
      AsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ PLN: 1.0, EUR: 4.5, USD: 3.8, GBP: 4.7, CHF: 4.5, CAD: 2.7, HUF: 0.01 })
      );
      
      const usdRate = await CurrencyService.getCurrencyRate('USD');
      
      expect(eurRate).toBe(4.5);
      expect(usdRate).toBe(3.8);
    });

    test('should return default rate if not in storage', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ PLN: 1.0 })
      );
      
      const gbpRate = await CurrencyService.getCurrencyRate('GBP');
      
      expect(gbpRate).toBe(4.7); // default
    });

    test('should return 1.0 for unknown currency', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ PLN: 1.0 })
      );
      
      const unknownRate = await CurrencyService.getCurrencyRate('XYZ');
      
      expect(unknownRate).toBe(1.0);
    });
  });

  describe('Getting All Exchange Rates', () => {
    test('should return all rates from storage', async () => {
      const storedRates = {
        PLN: 1.0,
        EUR: 4.5,
        USD: 3.8,
        GBP: 4.9
      };
      
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(storedRates));
      
      const rates = await CurrencyService.getAllExchangeRates();
      
      expect(rates).toEqual(expect.objectContaining(storedRates));
    });
  });

  describe('Currency Conversion', () => {
    beforeEach(() => {
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({
          PLN: 1.0,
          EUR: 4.0,
          USD: 4.0,
          GBP: 5.0
        })
      );
    });

    test('should return same amount for same currency', async () => {
      const result = await CurrencyService.convertCurrency(100, 'EUR', 'EUR');
      expect(result).toBe(100);
    });

    test('should convert EUR to PLN correctly', async () => {
      // 100 EUR * 4.0 = 400 PLN
      const result = await CurrencyService.convertCurrency(100, 'EUR', 'PLN');
      expect(result).toBe(400);
    });

    test('should convert PLN to EUR correctly', async () => {
      // 400 PLN / 4.0 = 100 EUR
      const result = await CurrencyService.convertCurrency(400, 'PLN', 'EUR');
      expect(result).toBe(100);
    });

    test('should convert EUR to USD correctly', async () => {
      // 100 EUR * 4.0 = 400 PLN
      // 400 PLN / 4.0 = 100 USD
      const result = await CurrencyService.convertCurrency(100, 'EUR', 'USD');
      expect(result).toBe(100);
    });

    test('should convert EUR to GBP correctly', async () => {
      // 100 EUR * 4.0 = 400 PLN
      // 400 PLN / 5.0 = 80 GBP
      const result = await CurrencyService.convertCurrency(100, 'EUR', 'GBP');
      expect(result).toBe(80);
    });

    test('should round to 2 decimal places', async () => {
      // Create scenario with decimals: 99 EUR to GBP
      // 99 EUR * 4.0 = 396 PLN
      // 396 PLN / 5.0 = 79.2 GBP
      const result = await CurrencyService.convertCurrency(99, 'EUR', 'GBP');
      expect(result).toBe(79.2);
    });

    test('should handle fractional amounts', async () => {
      const result = await CurrencyService.convertCurrency(0.5, 'EUR', 'PLN');
      expect(result).toBe(2); // 0.5 EUR * 4.0
    });

    test('should handle large amounts', async () => {
      const result = await CurrencyService.convertCurrency(10000, 'EUR', 'PLN');
      expect(result).toBe(40000); // 10000 EUR * 4.0
    });

    test('should handle zero amount', async () => {
      const result = await CurrencyService.convertCurrency(0, 'EUR', 'PLN');
      expect(result).toBe(0);
    });
  });

  describe('Advance Percentage Calculation', () => {
    beforeEach(() => {
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({
          PLN: 1.0,
          EUR: 4.0,
          USD: 4.0
        })
      );
    });

    test('should calculate advance percentage in PLN correctly', async () => {
      const result = await CurrencyService.calculateAdvancePercentage(
        100,     // advance amount
        'PLN',   // advance currency
        500      // product price in PLN
      );
      
      expect(result.advanceAmount).toBe(100);
      expect(result.advanceCurrency).toBe('PLN');
      expect(result.advanceInPLN).toBe(100);
      expect(result.productPrice).toBe(500);
      expect(result.percentage).toBe(20); // 100/500 * 100
      expect(result.exchangeRate).toBe(1.0);
      expect(result.conversionDate).toBeDefined();
    });

    test('should calculate advance percentage in EUR correctly', async () => {
      const result = await CurrencyService.calculateAdvancePercentage(
        50,      // 50 EUR
        'EUR',   
        500      // product price 500 PLN
      );
      
      expect(result.advanceAmount).toBe(50);
      expect(result.advanceCurrency).toBe('EUR');
      expect(result.advanceInPLN).toBe(200); // 50 EUR * 4.0
      expect(result.productPrice).toBe(500);
      expect(result.percentage).toBe(40); // 200/500 * 100
      expect(result.exchangeRate).toBe(4.0);
    });

    test('should calculate 100% advance', async () => {
      const result = await CurrencyService.calculateAdvancePercentage(
        125,     // 125 EUR
        'EUR',   
        500      // product price 500 PLN
      );
      
      expect(result.advanceInPLN).toBe(500); // 125 EUR * 4.0
      expect(result.percentage).toBe(100);
    });

    test('should handle partial percentages with decimals', async () => {
      const result = await CurrencyService.calculateAdvancePercentage(
        33,      // 33 EUR
        'EUR',   
        500      // product price 500 PLN
      );
      
      expect(result.advanceInPLN).toBe(132); // 33 EUR * 4.0
      expect(result.percentage).toBe(26.4); // 132/500 * 100 = 26.4
    });

    test('should round advance amount and percentage to 2 decimals', async () => {
      const result = await CurrencyService.calculateAdvancePercentage(
        33.333,
        'EUR',
        500
      );
      
      expect(result.advanceInPLN).toBe(133.33); // rounded
      expect(result.percentage).toBe(26.67);    // rounded
    });

    test('should include conversion date in ISO format', async () => {
      const result = await CurrencyService.calculateAdvancePercentage(
        100,
        'EUR',
        500
      );
      
      const date = new Date(result.conversionDate);
      expect(date.toISOString()).toBe(result.conversionDate);
    });

    test('should handle calculation errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      // Mock first call to succeed (for getAllExchangeRates in convertCurrency)
      AsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ PLN: 1.0, EUR: 4.0 })
      );
      // Mock second call to fail (for getCurrencyRate)
      AsyncStorage.getItem.mockRejectedValueOnce(new Error('Calculation error'));
      
      // Since loadExchangeRates catches errors and returns defaults,
      // the calculation will succeed with defaults
      const result = await CurrencyService.calculateAdvancePercentage(100, 'EUR', 500);
      
      // Should still calculate with defaults
      expect(result.advanceInPLN).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    test('should handle zero advance', async () => {
      const result = await CurrencyService.calculateAdvancePercentage(
        0,
        'EUR',
        500
      );
      
      expect(result.advanceInPLN).toBe(0);
      expect(result.percentage).toBe(0);
    });

    test('should handle advance greater than product price', async () => {
      const result = await CurrencyService.calculateAdvancePercentage(
        200,     // 200 EUR = 800 PLN
        'EUR',   
        500      // product price 500 PLN
      );
      
      expect(result.advanceInPLN).toBe(800);
      expect(result.percentage).toBe(160); // over 100%
    });
  });

  describe('Amount Formatting', () => {
    test('should format PLN amount correctly', () => {
      const formatted = CurrencyService.formatAmount(1234.56, 'PLN');
      // Intl.NumberFormat in test environment may not add space separator for thousands
      expect(formatted).toMatch(/1[  ]?234,56 PLN/);
    });

    test('should format EUR amount correctly', () => {
      const formatted = CurrencyService.formatAmount(999.99, 'EUR');
      expect(formatted).toBe('999,99 EUR');
    });

    test('should format with 2 decimal places', () => {
      const formatted = CurrencyService.formatAmount(100, 'USD');
      expect(formatted).toBe('100,00 USD');
    });

    test('should format large numbers with separator', () => {
      const formatted = CurrencyService.formatAmount(1000000.50, 'PLN');
      // Check for non-breaking space (U+00A0) or regular space
      expect(formatted).toMatch(/1[\s\u00A0]000[\s\u00A0]000,50 PLN/);
    });

    test('should format negative amounts', () => {
      const formatted = CurrencyService.formatAmount(-500.25, 'EUR');
      expect(formatted).toBe('-500,25 EUR');
    });

    test('should format zero', () => {
      const formatted = CurrencyService.formatAmount(0, 'PLN');
      expect(formatted).toBe('0,00 PLN');
    });

    test('should format decimal numbers correctly', () => {
      const formatted = CurrencyService.formatAmount(0.99, 'USD');
      expect(formatted).toBe('0,99 USD');
    });
  });

  describe('Reset to Default Rates', () => {
    test('should reset rates to defaults', async () => {
      AsyncStorage.setItem.mockResolvedValueOnce(true);
      
      const result = await CurrencyService.resetToDefaultRates();
      
      expect(result).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'currency_rates',
        JSON.stringify(CurrencyService.DEFAULT_RATES)
      );
    });

    test('should update cache after reset', async () => {
      CurrencyService.exchangeRatesCache = { EUR: 999 };
      AsyncStorage.setItem.mockResolvedValueOnce(true);
      
      await CurrencyService.resetToDefaultRates();
      
      expect(CurrencyService.exchangeRatesCache).toEqual(
        CurrencyService.DEFAULT_RATES
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle invalid JSON in storage gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      AsyncStorage.getItem.mockResolvedValueOnce('invalid json {');
      
      const rates = await CurrencyService.loadExchangeRates();
      
      expect(rates).toEqual(CurrencyService.DEFAULT_RATES);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    test('should handle null values in rates', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(
        JSON.stringify({ PLN: 1.0, EUR: null })
      );
      
      const rates = await CurrencyService.loadExchangeRates();
      
      // Should merge with defaults
      expect(rates.EUR).toBeNull(); // stored value
    });

    test('should handle concurrent loadExchangeRates calls', async () => {
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify(CurrencyService.DEFAULT_RATES)
      );
      
      const [rates1, rates2, rates3] = await Promise.all([
        CurrencyService.loadExchangeRates(),
        CurrencyService.loadExchangeRates(),
        CurrencyService.loadExchangeRates()
      ]);
      
      expect(rates1).toEqual(rates2);
      expect(rates2).toEqual(rates3);
    });

    test('should preserve precision in conversions', async () => {
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ PLN: 1.0, EUR: 4.3333 })
      );
      
      const result = await CurrencyService.convertCurrency(1, 'EUR', 'PLN');
      expect(result).toBe(4.33); // rounded to 2 decimals
    });
  });

  describe('Real-world Scenarios', () => {
    test('should handle typical jacket sale with EUR advance', async () => {
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ PLN: 1.0, EUR: 4.2 })
      );
      
      // Jacket costs 840 PLN, customer pays 100 EUR advance
      const result = await CurrencyService.calculateAdvancePercentage(
        100,
        'EUR',
        840
      );
      
      expect(result.advanceInPLN).toBe(420); // 100 EUR * 4.2
      expect(result.percentage).toBe(50);     // 420/840 * 100
    });

    test('should handle full payment in foreign currency', async () => {
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ PLN: 1.0, USD: 3.6 })
      );
      
      // Jacket costs 720 PLN, customer pays 200 USD (full payment)
      const result = await CurrencyService.calculateAdvancePercentage(
        200,
        'USD',
        720
      );
      
      expect(result.advanceInPLN).toBe(720); // 200 USD * 3.6
      expect(result.percentage).toBe(100);
    });

    test('should handle multi-currency conversion chain', async () => {
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({
          PLN: 1.0,
          EUR: 4.0,
          USD: 4.0,
          GBP: 5.0
        })
      );
      
      // Convert 100 GBP to EUR via PLN
      const result = await CurrencyService.convertCurrency(100, 'GBP', 'EUR');
      
      // 100 GBP * 5.0 = 500 PLN
      // 500 PLN / 4.0 = 125 EUR
      expect(result).toBe(125);
    });

    test('should update rate and immediately use it for conversion', async () => {
      // Initial rates
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ PLN: 1.0, EUR: 4.0 })
      );
      AsyncStorage.setItem.mockResolvedValue(true);
      
      // Update EUR rate to 4.5
      await CurrencyService.updateCurrencyRate('EUR', 4.5);
      
      // Mock the new rate for conversion
      AsyncStorage.getItem.mockResolvedValue(
        JSON.stringify({ PLN: 1.0, EUR: 4.5 })
      );
      
      // Convert 100 EUR to PLN with new rate
      const result = await CurrencyService.convertCurrency(100, 'EUR', 'PLN');
      expect(result).toBe(450); // 100 EUR * 4.5
    });
  });
});
