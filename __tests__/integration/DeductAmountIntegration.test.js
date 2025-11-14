/**
 * Testy integracyjne dla funkcji "Odpisz kwotę"
 * Testuje integrację z API, przechowywaniem danych i synchronizacją
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}));

// Mock fetch dla API calls
global.fetch = jest.fn();

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock danych kontekstu aplikacji
const mockInitialData = {
  totals: {
    PLN: 5000.00,
    EUR: 1250.75,
    USD: 1500.25
  },
  deductions: [],
  lastSyncTimestamp: new Date().toISOString(),
  pendingOperations: []
};

// Mock API responses
const mockApiResponses = {
  success: {
    success: true,
    data: {
      id: 'deduction_123',
      amount: 500.00,
      currency: 'PLN',
      reason: 'Test deduction',
      timestamp: new Date().toISOString(),
      newBalance: 4500.00
    }
  },
  error: {
    success: false,
    error: 'Insufficient funds',
    code: 'INSUFFICIENT_FUNDS'
  },
  networkError: {
    success: false,
    error: 'Network connection failed',
    code: 'NETWORK_ERROR'
  }
};

// Service do obsługi operacji odpisywania kwot
class DeductAmountService {
  static async submitDeduction(deductionData) {
    try {
      // Walidacja po stronie klienta
      const validationResult = this.validateDeduction(deductionData);
      if (!validationResult.isValid) {
        throw new Error(validationResult.error);
      }

      // Próba wysłania do API
      const response = await fetch('/api/deductions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test_token'
        },
        body: JSON.stringify(deductionData)
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.success) {
        throw new Error(responseData.error || 'Failed to submit deduction');
      }

      // Zapisz w lokalnym storage dla cache
      await this.saveDeductionLocally(responseData.data);
      
      // Aktualizuj stan aplikacji
      await this.updateAppState(responseData.data);

      return responseData.data;

    } catch (error) {
      console.error('DeductAmountService error:', error);
      
      // Jeśli błąd sieciowy, zapisz jako operację oczekującą
      if (error.message.includes('Network') || 
          error.message.includes('Failed to fetch') || 
          error.message.includes('timeout') || 
          error.message.includes('Request timeout')) {
        await this.savePendingOperation(deductionData);
      }
      
      throw error;
    }
  }

  static validateDeduction(data) {
    if (!data.amount || data.amount <= 0) {
      return { isValid: false, error: 'Invalid amount' };
    }
    
    if (!data.currency || !['PLN', 'EUR', 'USD'].includes(data.currency)) {
      return { isValid: false, error: 'Invalid currency' };
    }
    
    if (!data.reason || !data.reason.trim()) {
      return { isValid: false, error: 'Reason is required' };
    }

    return { isValid: true };
  }

  static async saveDeductionLocally(deduction) {
    const existingDeductionsStr = await AsyncStorage.getItem('deductions');
    const existingDeductions = existingDeductionsStr ? JSON.parse(existingDeductionsStr) : [];
    
    existingDeductions.push(deduction);
    
    await AsyncStorage.setItem('deductions', JSON.stringify(existingDeductions));
  }

  static async updateAppState(deduction) {
    const appStateStr = await AsyncStorage.getItem('appState');
    const currentState = appStateStr ? JSON.parse(appStateStr) : mockInitialData;

    // Aktualizuj saldo
    currentState.totals[deduction.currency] -= deduction.amount;
    
    // Dodaj do historii
    currentState.deductions.push(deduction);
    
    // Aktualizuj timestamp synchronizacji
    currentState.lastSyncTimestamp = new Date().toISOString();

    await AsyncStorage.setItem('appState', JSON.stringify(currentState));
  }

  static async savePendingOperation(operation) {
    const pendingOpsStr = await AsyncStorage.getItem('pendingOperations');
    const pendingOps = pendingOpsStr ? JSON.parse(pendingOpsStr) : [];
    
    pendingOps.push({
      ...operation,
      id: `pending_${Date.now()}`,
      type: 'deduction',
      status: 'pending',
      createdAt: new Date().toISOString()
    });

    await AsyncStorage.setItem('pendingOperations', JSON.stringify(pendingOps));
  }

  static async syncPendingOperations() {
    const pendingOpsStr = await AsyncStorage.getItem('pendingOperations');
    const pendingOps = pendingOpsStr ? JSON.parse(pendingOpsStr) : [];

    const results = [];

    for (const operation of pendingOps) {
      try {
        const result = await this.submitDeduction(operation);
        results.push({ success: true, operation, result });
        
        // Usuń z oczekujących po udanej synchronizacji
        await this.removePendingOperation(operation.id);
        
      } catch (error) {
        results.push({ success: false, operation, error: error.message });
      }
    }

    return results;
  }

  static async removePendingOperation(operationId) {
    const pendingOpsStr = await AsyncStorage.getItem('pendingOperations');
    const pendingOps = pendingOpsStr ? JSON.parse(pendingOpsStr) : [];
    
    const filteredOps = pendingOps.filter(op => op.id !== operationId);
    
    await AsyncStorage.setItem('pendingOperations', JSON.stringify(filteredOps));
  }

  static async getDeductionHistory() {
    const deductionsStr = await AsyncStorage.getItem('deductions');
    return deductionsStr ? JSON.parse(deductionsStr) : [];
  }

  static async getCurrentBalances() {
    const appStateStr = await AsyncStorage.getItem('appState');
    const appState = appStateStr ? JSON.parse(appStateStr) : mockInitialData;
    return appState.totals;
  }
}

describe('Deduct Amount Integration Tests', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    AsyncStorage.getItem.mockClear();
    AsyncStorage.setItem.mockClear();
  });

  describe('Podstawowa integracja API', () => {
    
    test('powinien pomyślnie wysłać odpisanie do API', async () => {
      // Setup
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.success
      });

      // Mock AsyncStorage dla różnych kluczy
      AsyncStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'deductions':
            return Promise.resolve('[]'); // Pusta tablica deductions
          case 'appState':
            return Promise.resolve(JSON.stringify(mockInitialData));
          default:
            return Promise.resolve(null);
        }
      });

      const deductionData = {
        amount: 500.00,
        currency: 'PLN',
        reason: 'Wypłata pracownika',
        employee: { _id: 'emp1', firstName: 'Jan', lastName: 'Kowalski' },
        timestamp: new Date().toISOString()
      };

      // Execute
      const result = await DeductAmountService.submitDeduction(deductionData);

      // Assert
      expect(fetch).toHaveBeenCalledWith('/api/deductions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test_token'
        },
        body: JSON.stringify(deductionData)
      });

      expect(result).toEqual(mockApiResponses.success.data);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'deductions',
        expect.stringContaining('"amount":500')
      );
    });

    test('powinien obsłużyć błąd API', async () => {
      // Setup
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => mockApiResponses.error
      });

      const deductionData = {
        amount: 6000.00, // Więcej niż dostępne 5000 PLN
        currency: 'PLN',
        reason: 'Zbyt duża kwota',
        timestamp: new Date().toISOString()
      };

      // Execute & Assert
      await expect(
        DeductAmountService.submitDeduction(deductionData)
      ).rejects.toThrow('Insufficient funds');
      
      expect(AsyncStorage.setItem).not.toHaveBeenCalledWith(
        'deductions',
        expect.any(String)
      );
    });

    test('powinien obsłużyć błąd sieciowy i zapisać jako operację oczekującą', async () => {
      // Setup
      fetch.mockRejectedValueOnce(new Error('Network connection failed'));
      
      AsyncStorage.getItem.mockResolvedValue('[]');

      const deductionData = {
        amount: 300.00,
        currency: 'EUR',
        reason: 'Offline deduction',
        timestamp: new Date().toISOString()
      };

      // Execute
      await expect(
        DeductAmountService.submitDeduction(deductionData)
      ).rejects.toThrow('Network connection failed');

      // Assert - operacja została zapisana jako oczekująca
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'pendingOperations',
        expect.stringContaining('"type":"deduction"')
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'pendingOperations',
        expect.stringContaining('"status":"pending"')
      );
    });
  });

  describe('Zarządzanie lokalnym stanem', () => {
    
    test('powinien aktualizować lokalne saldo po udanym odpisaniu', async () => {
      // Setup
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.success
      });

      AsyncStorage.getItem
        .mockResolvedValueOnce('[]') // deductions
        .mockResolvedValueOnce(JSON.stringify(mockInitialData)); // appState

      const deductionData = {
        amount: 500.00,
        currency: 'PLN',
        reason: 'Test deduction'
      };

      // Execute
      await DeductAmountService.submitDeduction(deductionData);

      // Assert - saldo zostało zaktualizowane
      const appStateCall = AsyncStorage.setItem.mock.calls.find(
        call => call[0] === 'appState'
      );
      
      expect(appStateCall).toBeTruthy();
      const savedAppState = JSON.parse(appStateCall[1]);
      expect(savedAppState.totals.PLN).toBe(4500.00); // 5000 - 500
    });

    test('powinien dodać odpisanie do historii lokalnej', async () => {
      // Setup
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.success
      });

      const existingDeductions = [
        { id: 'existing_1', amount: 100, currency: 'PLN' }
      ];

      AsyncStorage.getItem
        .mockResolvedValueOnce(JSON.stringify(existingDeductions)) // deductions
        .mockResolvedValueOnce(JSON.stringify(mockInitialData)); // appState

      const deductionData = {
        amount: 500.00,
        currency: 'PLN',
        reason: 'New deduction'
      };

      // Execute
      await DeductAmountService.submitDeduction(deductionData);

      // Assert - nowe odpisanie zostało dodane do historii
      const deductionsCall = AsyncStorage.setItem.mock.calls.find(
        call => call[0] === 'deductions'
      );
      
      expect(deductionsCall).toBeTruthy();
      const savedDeductions = JSON.parse(deductionsCall[1]);
      expect(savedDeductions).toHaveLength(2);
      expect(savedDeductions[1]).toEqual(mockApiResponses.success.data);
    });

    test('powinien zaktualizować timestamp synchronizacji', async () => {
      // Setup
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.success
      });

      AsyncStorage.getItem
        .mockResolvedValueOnce('[]') // deductions
        .mockResolvedValueOnce(JSON.stringify(mockInitialData)); // appState

      const deductionData = {
        amount: 200.00,
        currency: 'EUR',
        reason: 'Sync test'
      };

      const beforeTimestamp = new Date().toISOString();

      // Execute
      await DeductAmountService.submitDeduction(deductionData);

      // Assert - timestamp został zaktualizowany
      const appStateCall = AsyncStorage.setItem.mock.calls.find(
        call => call[0] === 'appState'
      );
      
      const savedAppState = JSON.parse(appStateCall[1]);
      expect(new Date(savedAppState.lastSyncTimestamp).getTime())
        .toBeGreaterThanOrEqual(new Date(beforeTimestamp).getTime());
    });
  });

  describe('Obsługa operacji oczekujących', () => {
    
    test('powinien zapisać operację jako oczekującą przy błędzie sieciowym', async () => {
      // Setup
      fetch.mockRejectedValueOnce(new Error('Failed to fetch'));
      AsyncStorage.getItem.mockResolvedValue('[]');

      const deductionData = {
        amount: 150.00,
        currency: 'USD',
        reason: 'Offline operation',
        employee: { _id: 'emp2', firstName: 'Anna', lastName: 'Nowak' }
      };

      // Execute
      try {
        await DeductAmountService.submitDeduction(deductionData);
      } catch (error) {
        // Oczekujemy błędu
      }

      // Assert
      const pendingCall = AsyncStorage.setItem.mock.calls.find(
        call => call[0] === 'pendingOperations'
      );
      
      expect(pendingCall).toBeTruthy();
      const savedPending = JSON.parse(pendingCall[1]);
      expect(savedPending[0]).toMatchObject({
        amount: 150.00,
        currency: 'USD',
        reason: 'Offline operation',
        type: 'deduction',
        status: 'pending'
      });
    });

    test('powinien zsynchronizować operacje oczekujące gdy sieć jest dostępna', async () => {
      // Setup - operacje oczekujące
      const pendingOperations = [
        {
          id: 'pending_1',
          amount: 100,
          currency: 'PLN',
          reason: 'Pending 1',
          type: 'deduction',
          status: 'pending'
        },
        {
          id: 'pending_2',
          amount: 200,
          currency: 'EUR',
          reason: 'Pending 2',
          type: 'deduction',
          status: 'pending'
        }
      ];

      // Mock AsyncStorage z dynamicznymi wartościami
      let currentPendingOps = [...pendingOperations];
      AsyncStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'pendingOperations':
            return Promise.resolve(JSON.stringify(currentPendingOps));
          case 'deductions':
            return Promise.resolve('[]');
          case 'appState':
            return Promise.resolve(JSON.stringify(mockInitialData));
          default:
            return Promise.resolve(null);
        }
      });

      // Mock setItem to update current state
      AsyncStorage.setItem.mockImplementation((key, value) => {
        if (key === 'pendingOperations') {
          currentPendingOps = JSON.parse(value);
        }
        return Promise.resolve();
      });

      // Mock successful API responses
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockApiResponses.success, data: { ...mockApiResponses.success.data, id: 'sync_1' }})
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ ...mockApiResponses.success, data: { ...mockApiResponses.success.data, id: 'sync_2' }})
        });

      // Execute
      const results = await DeductAmountService.syncPendingOperations();

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
      
      // Sprawdź czy operacje zostały usunięte z oczekujących (sprawdź końcowy stan)
      expect(currentPendingOps).toEqual([]); // currentPendingOps powinien być pusty po synchronizacji
    });

    test('powinien obsłużyć częściową synchronizację (niektóre operacje nie udane)', async () => {
      // Setup
      const pendingOperations = [
        {
          id: 'pending_success',
          amount: 100,
          currency: 'PLN',
          reason: 'Will succeed',
          type: 'deduction'
        },
        {
          id: 'pending_fail',
          amount: 10000, // Za duża kwota
          currency: 'PLN',
          reason: 'Will fail',
          type: 'deduction'
        }
      ];

      // Mock AsyncStorage dla różnych wywołań
      AsyncStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'pendingOperations':
            return Promise.resolve(JSON.stringify(pendingOperations));
          case 'deductions':
            return Promise.resolve('[]');
          case 'appState':
            return Promise.resolve(JSON.stringify(mockInitialData));
          default:
            return Promise.resolve(null);
        }
      });

      // Mock mixed API responses
      fetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockApiResponses.success
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => mockApiResponses.error
        });

      // Execute
      const results = await DeductAmountService.syncPendingOperations();

      // Assert
      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toContain('Insufficient funds');
    });
  });

  describe('Pobieranie danych', () => {
    
    test('powinien pobrać historię odpisań z lokalnego storage', async () => {
      // Setup
      const mockHistory = [
        { id: '1', amount: 100, currency: 'PLN', reason: 'Test 1' },
        { id: '2', amount: 200, currency: 'EUR', reason: 'Test 2' }
      ];

      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockHistory));

      // Execute
      const history = await DeductAmountService.getDeductionHistory();

      // Assert
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('deductions');
      expect(history).toEqual(mockHistory);
    });

    test('powinien pobrać aktualne salda z lokalnego storage', async () => {
      // Setup
      const mockAppState = {
        totals: { PLN: 1000, EUR: 500, USD: 750 },
        lastSyncTimestamp: new Date().toISOString()
      };

      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockAppState));

      // Execute
      const balances = await DeductAmountService.getCurrentBalances();

      // Assert
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('appState');
      expect(balances).toEqual(mockAppState.totals);
    });

    test('powinien zwrócić domyślne dane gdy brak w storage', async () => {
      // Setup
      AsyncStorage.getItem.mockResolvedValueOnce(null);

      // Execute
      const history = await DeductAmountService.getDeductionHistory();

      // Assert
      expect(history).toEqual([]);
    });
  });

  describe('Walidacja po stronie klienta', () => {
    
    test('powinien odrzucić nieprawidłową kwotę', () => {
      const result = DeductAmountService.validateDeduction({
        amount: 0,
        currency: 'PLN',
        reason: 'Test'
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid amount');
    });

    test('powinien odrzucić nieprawidłową walutę', () => {
      const result = DeductAmountService.validateDeduction({
        amount: 100,
        currency: 'XXX',
        reason: 'Test'
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid currency');
    });

    test('powinien odrzucić pusty powód', () => {
      const result = DeductAmountService.validateDeduction({
        amount: 100,
        currency: 'PLN',
        reason: '   '
      });

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Reason is required');
    });

    test('powinien zaakceptować prawidłowe dane', () => {
      const result = DeductAmountService.validateDeduction({
        amount: 100,
        currency: 'PLN',
        reason: 'Valid reason'
      });

      expect(result.isValid).toBe(true);
    });
  });

  describe('Przypadki brzegowe', () => {
    
    test('powinien obsłużyć timeout API', async () => {
      // Setup
      fetch.mockImplementationOnce(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      // Mock AsyncStorage dla różnych wywołań
      AsyncStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'pendingOperations':
            return Promise.resolve('[]');
          case 'deductions':
            return Promise.resolve('[]');
          case 'appState':
            return Promise.resolve(JSON.stringify(mockInitialData));
          default:
            return Promise.resolve(null);
        }
      });

      const deductionData = {
        amount: 100,
        currency: 'PLN',
        reason: 'Timeout test'
      };

      // Execute & Assert
      await expect(
        DeductAmountService.submitDeduction(deductionData)
      ).rejects.toThrow('Request timeout');

      // Powinien zapisać jako operację oczekującą
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'pendingOperations',
        expect.stringContaining('"status":"pending"')
      );
    });

    test('powinien obsłużyć błąd zapisu do AsyncStorage', async () => {
      // Setup
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockApiResponses.success
      });
      
      // Mock AsyncStorage dla różnych wywołań - pierwszy setItem zawiedzie
      AsyncStorage.getItem.mockImplementation((key) => {
        switch (key) {
          case 'deductions':
            return Promise.resolve('[]');
          case 'appState':
            return Promise.resolve(JSON.stringify(mockInitialData));
          default:
            return Promise.resolve(null);
        }
      });

      AsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage error'));

      const deductionData = {
        amount: 100,
        currency: 'PLN',
        reason: 'Storage error test'
      };

      // Execute & Assert
      // Powinien rzucić błąd storage
      await expect(
        DeductAmountService.submitDeduction(deductionData)
      ).rejects.toThrow('Storage error');
    });

    test('powinien obsłużyć nieprawidłową odpowiedź JSON z API', async () => {
      // Setup
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      const deductionData = {
        amount: 100,
        currency: 'PLN',
        reason: 'JSON error test'
      };

      // Execute & Assert
      await expect(
        DeductAmountService.submitDeduction(deductionData)
      ).rejects.toThrow('Invalid JSON');
    });
  });
});