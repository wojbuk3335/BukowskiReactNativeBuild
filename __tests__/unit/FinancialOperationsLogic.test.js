import { tokenService } from '../../config/api';

// Mockowanie tokenService
jest.mock('../../config/api', () => ({
  tokenService: {
    authenticatedFetch: jest.fn(),
  }
}));

// Symulacja funkcji z komponentu Home
const submitFinancialOperation = async (userSymbol, amount, reason, type, currency = 'PLN') => {
  // Walidacja
  if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
    throw new Error('Kwota musi być liczbą większą od 0');
  }
  
  if (!reason || reason.trim() === '') {
    throw new Error('Proszę podać powód operacji');
  }
  
  if (!userSymbol || userSymbol.trim() === '') {
    throw new Error('Proszę wybrać użytkownika');
  }

  const operationData = {
    userSymbol: userSymbol,
    amount: type === 'deduction' ? -Math.abs(parseFloat(amount)) : Math.abs(parseFloat(amount)),
    currency: currency,
    type: type,
    reason: reason.trim(),
    date: new Date()
  };

  try {
    const response = await tokenService.authenticatedFetch(
      'https://api.bukowski-sklep.pl/financial-operations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(operationData)
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Błąd podczas zapisywania operacji');
    }

    return await response.json();
  } catch (error) {
    throw new Error(`Wystąpił błąd: ${error.message}`);
  }
};

const calculateBalance = (operations) => {
  if (!operations || operations.length === 0) return 0;
  return operations.reduce((sum, op) => sum + (op.amount || 0), 0);
};

const filterTodayOperations = (operations) => {
  if (!operations || operations.length === 0) return [];
  
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  return operations.filter(op => {
    const opDate = new Date(op.date);
    const opDateString = opDate.toISOString().split('T')[0];
    return opDateString === todayString;
  });
};

const groupOperationsByCurrency = (operations) => {
  if (!operations || operations.length === 0) return {};
  
  return operations.reduce((acc, op) => {
    const currency = op.currency || 'PLN';
    acc[currency] = (acc[currency] || 0) + (op.amount || 0);
    return acc;
  }, {});
};

describe('Financial Operations Logic Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation Tests', () => {
    it('Powinien zwalidować poprawną operację dopisania kwoty', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ _id: 'test-id', amount: 500 })
      });

      const result = await submitFinancialOperation('P', '500', 'Wpłata gotówki', 'addition');
      
      expect(result).toEqual({ _id: 'test-id', amount: 500 });
      expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
        'https://api.bukowski-sklep.pl/financial-operations',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"amount":500')
        })
      );

      console.log('✅ Walidacja poprawnej operacji dopisania kwoty przeszła pomyślnie');
    });

    it('Powinien zwalidować poprawną operację odpisania kwoty', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ _id: 'test-id', amount: -300 })
      });

      const result = await submitFinancialOperation('P', '300', 'Wypłata gotówki', 'deduction');
      
      expect(result).toEqual({ _id: 'test-id', amount: -300 });
      expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
        'https://api.bukowski-sklep.pl/financial-operations',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"amount":-300')
        })
      );

      console.log('✅ Walidacja poprawnej operacji odpisania kwoty przeszła pomyślnie');
    });

    it('Powinien rzucić błąd przy pustej kwocie', async () => {
      await expect(submitFinancialOperation('P', '', 'Test', 'addition'))
        .rejects.toThrow('Kwota musi być liczbą większą od 0');

      await expect(submitFinancialOperation('P', null, 'Test', 'addition'))
        .rejects.toThrow('Kwota musi być liczbą większą od 0');

      console.log('✅ Walidacja pustej kwoty działa poprawnie');
    });

    it('Powinien rzucić błąd przy niepoprawnej kwocie', async () => {
      await expect(submitFinancialOperation('P', 'abc', 'Test', 'addition'))
        .rejects.toThrow('Kwota musi być liczbą większą od 0');

      await expect(submitFinancialOperation('P', '0', 'Test', 'addition'))
        .rejects.toThrow('Kwota musi być liczbą większą od 0');

      await expect(submitFinancialOperation('P', '-100', 'Test', 'addition'))
        .rejects.toThrow('Kwota musi być liczbą większą od 0');

      console.log('✅ Walidacja niepoprawnej kwoty działa poprawnie');
    });

    it('Powinien rzucić błąd przy pustym powodzie', async () => {
      await expect(submitFinancialOperation('P', '100', '', 'addition'))
        .rejects.toThrow('Proszę podać powód operacji');

      await expect(submitFinancialOperation('P', '100', '   ', 'addition'))
        .rejects.toThrow('Proszę podać powód operacji');

      await expect(submitFinancialOperation('P', '100', null, 'addition'))
        .rejects.toThrow('Proszę podać powód operacji');

      console.log('✅ Walidacja pustego powodu działa poprawnie');
    });

    it('Powinien rzucić błąd przy pustym symbolu użytkownika', async () => {
      await expect(submitFinancialOperation('', '100', 'Test', 'addition'))
        .rejects.toThrow('Proszę wybrać użytkownika');

      await expect(submitFinancialOperation('   ', '100', 'Test', 'addition'))
        .rejects.toThrow('Proszę wybrać użytkownika');

      await expect(submitFinancialOperation(null, '100', 'Test', 'addition'))
        .rejects.toThrow('Proszę wybrać użytkownika');

      console.log('✅ Walidacja pustego symbolu użytkownika działa poprawnie');
    });
  });

  describe('API Integration Tests', () => {
    it('Powinien obsłużyć błąd API', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Błąd serwera' })
      });

      await expect(submitFinancialOperation('P', '100', 'Test', 'addition'))
        .rejects.toThrow('Wystąpił błąd: Błąd serwera');

      console.log('✅ Obsługa błędów API działa poprawnie');
    });

    it('Powinien obsłużyć błąd sieci', async () => {
      tokenService.authenticatedFetch.mockRejectedValue(new Error('Network error'));

      await expect(submitFinancialOperation('P', '100', 'Test', 'addition'))
        .rejects.toThrow('Wystąpił błąd: Network error');

      console.log('✅ Obsługa błędów sieci działa poprawnie');
    });

    it('Powinien wysłać poprawne dane do API', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ _id: 'test-id' })
      });

      await submitFinancialOperation('P', '250.50', 'Wpłata zaliczki', 'addition', 'EUR');

      expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
        'https://api.bukowski-sklep.pl/financial-operations',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"userSymbol":"P"')
        })
      );

      const callArgs = tokenService.authenticatedFetch.mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.userSymbol).toBe('P');
      expect(requestBody.amount).toBe(250.50);
      expect(requestBody.currency).toBe('EUR');
      expect(requestBody.type).toBe('addition');
      expect(requestBody.reason).toBe('Wpłata zaliczki');
      expect(requestBody.date).toBeTruthy();

      console.log('✅ Dane wysyłane do API są poprawne');
    });
  });

  describe('Balance Calculation Tests', () => {
    it('Powinien obliczyć bilans z operacji dodatnich i ujemnych', () => {
      const operations = [
        { amount: 500, currency: 'PLN' },
        { amount: -200, currency: 'PLN' },
        { amount: 300, currency: 'PLN' },
        { amount: -150, currency: 'PLN' }
      ];

      const balance = calculateBalance(operations);
      expect(balance).toBe(450); // 500 - 200 + 300 - 150 = 450

      console.log('✅ Obliczanie bilansu działa poprawnie: +450 PLN');
    });

    it('Powinien zwrócić 0 dla pustej listy operacji', () => {
      expect(calculateBalance([])).toBe(0);
      expect(calculateBalance(null)).toBe(0);
      expect(calculateBalance(undefined)).toBe(0);

      console.log('✅ Bilans pustej listy operacji wynosi 0');
    });

    it('Powinien obsłużyć operacje z brakującymi kwotami', () => {
      const operations = [
        { amount: 500 },
        { amount: null },
        { amount: undefined },
        { amount: -200 },
        {} // operacja bez pola amount
      ];

      const balance = calculateBalance(operations);
      expect(balance).toBe(300); // 500 + 0 + 0 - 200 + 0 = 300

      console.log('✅ Obsługa operacji z brakującymi kwotami działa poprawnie');
    });
  });

  describe('Date Filtering Tests', () => {
    it('Powinien filtrować operacje z dzisiaj', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const operations = [
        { amount: 500, date: today },
        { amount: -200, date: yesterday },
        { amount: 300, date: today },
        { amount: 150, date: tomorrow }
      ];

      const todayOperations = filterTodayOperations(operations);
      expect(todayOperations).toHaveLength(2);
      expect(todayOperations[0].amount).toBe(500);
      expect(todayOperations[1].amount).toBe(300);

      console.log('✅ Filtrowanie operacji z dzisiaj działa poprawnie: 2 operacje');
    });

    it('Powinien zwrócić pustą listę gdy brak operacji z dzisiaj', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const operations = [
        { amount: 500, date: yesterday },
        { amount: -200, date: yesterday }
      ];

      const todayOperations = filterTodayOperations(operations);
      expect(todayOperations).toHaveLength(0);

      console.log('✅ Brak operacji z dzisiaj - zwrócona pusta lista');
    });

    it('Powinien obsłużyć pustą listę operacji', () => {
      expect(filterTodayOperations([])).toEqual([]);
      expect(filterTodayOperations(null)).toEqual([]);
      expect(filterTodayOperations(undefined)).toEqual([]);

      console.log('✅ Obsługa pustej listy operacji przy filtrowaniu działa poprawnie');
    });
  });

  describe('Currency Grouping Tests', () => {
    it('Powinien grupować operacje według waluty', () => {
      const operations = [
        { amount: 500, currency: 'PLN' },
        { amount: 100, currency: 'EUR' },
        { amount: -200, currency: 'PLN' },
        { amount: 50, currency: 'USD' },
        { amount: -25, currency: 'EUR' }
      ];

      const grouped = groupOperationsByCurrency(operations);
      
      expect(grouped.PLN).toBe(300); // 500 - 200 = 300
      expect(grouped.EUR).toBe(75);  // 100 - 25 = 75
      expect(grouped.USD).toBe(50);  // 50

      console.log('✅ Grupowanie według waluty działa poprawnie:');
      console.log('   PLN: +300');
      console.log('   EUR: +75');
      console.log('   USD: +50');
    });

    it('Powinien obsłużyć operacje bez określonej waluty', () => {
      const operations = [
        { amount: 500, currency: 'PLN' },
        { amount: 200 }, // brak waluty - domyślnie PLN
        { amount: 100, currency: null }, // null currency - domyślnie PLN
        { amount: 150, currency: undefined } // undefined currency - domyślnie PLN
      ];

      const grouped = groupOperationsByCurrency(operations);
      
      expect(grouped.PLN).toBe(950); // 500 + 200 + 100 + 150 = 950

      console.log('✅ Obsługa brakującej waluty (domyślnie PLN) działa poprawnie');
    });

    it('Powinien zwrócić pusty obiekt dla pustej listy operacji', () => {
      expect(groupOperationsByCurrency([])).toEqual({});
      expect(groupOperationsByCurrency(null)).toEqual({});
      expect(groupOperationsByCurrency(undefined)).toEqual({});

      console.log('✅ Obsługa pustej listy przy grupowaniu według waluty działa poprawnie');
    });
  });

  describe('Integration Tests', () => {
    it('Powinien obsłużyć kompletny przepływ operacji dopisania kwoty', async () => {
      const mockOperations = [
        { amount: 300, currency: 'PLN', date: new Date(), type: 'deduction' },
        { amount: 500, currency: 'PLN', date: new Date(), type: 'addition' }
      ];

      // Mock API response dla nowej operacji
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          _id: 'new-id',
          amount: 250,
          currency: 'PLN',
          type: 'addition',
          userSymbol: 'P',
          reason: 'Wpłata gotówki',
          date: new Date()
        })
      });

      // Wykonanie operacji
      const result = await submitFinancialOperation('P', '250', 'Wpłata gotówki', 'addition');

      // Dodanie nowej operacji do listy
      const updatedOperations = [...mockOperations, result];
      
      // Obliczenie nowego bilansu
      const newBalance = calculateBalance(updatedOperations);
      
      // Sprawdzenie rezultatu
      expect(result.amount).toBe(250);
      expect(newBalance).toBe(1050); // 300 + 500 + 250 = 1050

      console.log('✅ Kompletny przepływ operacji dopisania kwoty zakończony sukcesem');
      console.log('   Nowy bilans: +1050 PLN');
    });

    it('Powinien obsłużyć kompletny przepływ operacji odpisania kwoty', async () => {
      const mockOperations = [
        { amount: 1000, currency: 'PLN', date: new Date(), type: 'addition' }
      ];

      // Mock API response dla nowej operacji
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          _id: 'new-id',
          amount: -350,
          currency: 'PLN',
          type: 'deduction',
          userSymbol: 'P',
          reason: 'Wypłata zaliczki',
          date: new Date()
        })
      });

      // Wykonanie operacji
      const result = await submitFinancialOperation('P', '350', 'Wypłata zaliczki', 'deduction');

      // Dodanie nowej operacji do listy
      const updatedOperations = [...mockOperations, result];
      
      // Obliczenie nowego bilansu
      const newBalance = calculateBalance(updatedOperations);
      
      // Sprawdzenie rezultatu
      expect(result.amount).toBe(-350);
      expect(newBalance).toBe(650); // 1000 - 350 = 650

      console.log('✅ Kompletny przepływ operacji odpisania kwoty zakończony sukcesem');
      console.log('   Nowy bilans: +650 PLN');
    });

    it('Powinien obsłużyć operacje w różnych walutach', async () => {
      // Mock operacji w różnych walutach
      tokenService.authenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            _id: 'eur-id',
            amount: 100,
            currency: 'EUR',
            type: 'addition',
            userSymbol: 'P',
            reason: 'Wpłata EUR',
            date: new Date()
          })
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            _id: 'usd-id',
            amount: -50,
            currency: 'USD',
            type: 'deduction',
            userSymbol: 'P',
            reason: 'Wypłata USD',
            date: new Date()
          })
        });

      const eurOperation = await submitFinancialOperation('P', '100', 'Wpłata EUR', 'addition', 'EUR');
      const usdOperation = await submitFinancialOperation('P', '50', 'Wypłata USD', 'deduction', 'USD');

      const operations = [eurOperation, usdOperation];
      const groupedByCurrency = groupOperationsByCurrency(operations);

      expect(groupedByCurrency.EUR).toBe(100);
      expect(groupedByCurrency.USD).toBe(-50);

      console.log('✅ Operacje w różnych walutach obsłużone poprawnie:');
      console.log('   EUR: +100');
      console.log('   USD: -50');
    });
  });
});