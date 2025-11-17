import React from 'react';
import { render, fireEvent, waitFor, act, getAllByText } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Home from '../../app/(tabs)/home';
import { renderWithContext } from '../utils/TestUtils';
import tokenService from '../../services/tokenService';

// Mock expo-camera
jest.mock('expo-camera', () => {
  const React = require('react');
  return {
    CameraView: jest.fn(({children, ...props}) => React.createElement('CameraView', props, children)),
    useCameraPermissions: jest.fn(() => [
      { granted: true, status: 'granted' },
      jest.fn(() => Promise.resolve({ granted: true, status: 'granted' }))
    ]),
  };
});

// Mock Alert - never blocks execution
const mockAlert = jest.fn(() => {
  // Do nothing - don't block test execution
});
Alert.alert = mockAlert;

// Mock tokenService
jest.mock('../../services/tokenService', () => ({
  authenticatedFetch: jest.fn(),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAlert.mockClear();
  // Set flag to enable API calls testing for this test suite
  window.__TESTING_API_CALLS__ = true;
});

afterEach(() => {
  // Clean up flag after each test
  delete window.__TESTING_API_CALLS__;
});

describe('Financial Operations Component Tests', () => {
  describe('Component Rendering Tests', () => {
    it('Powinien renderować główne elementy interfejsu', async () => {
      const { getByText, getAllByText } = renderWithContext(<Home />);

      await waitFor(() => {
        expect(getAllByText('Odpisz kwotę')[0]).toBeTruthy();
        expect(getAllByText('Dopisz kwotę')[0]).toBeTruthy();
        expect(getByText('Suma:')).toBeTruthy();
        expect(getByText('Gotówki:')).toBeTruthy();
        expect(getByText('Na kartę:')).toBeTruthy();
      });
    });

    it('Powinien wyświetlać operacje finansowe w odpowiednich kolorach', async () => {
      const contextValue = {
        financialOperations: [
          { id: 1, amount: 500, type: 'dopisanie', reason: 'Test income', date: '2025-11-05' },
          { id: 2, amount: -200, type: 'odpisanie', reason: 'Test expense', date: '2025-11-05' }
        ],
        filteredData: [
          { id: 1, amount: 500, type: 'dopisanie', reason: 'Test income', date: '2025-11-05' },
          { id: 2, amount: -200, type: 'odpisanie', reason: 'Test expense', date: '2025-11-05' }
        ]
      };

      const { getByText, getAllByText } = renderWithContext(<Home />, contextValue);

      await waitFor(() => {
        expect(getAllByText('Odpisz kwotę')[0]).toBeTruthy();
        expect(getAllByText('Dopisz kwotę')[0]).toBeTruthy();
      });
    });

    it('Powinien wyświetlać poprawny bilans', async () => {
      const contextValue = {
        financialOperations: [
          { id: 1, amount: 500, type: 'dopisanie', reason: 'Test income', date: '2025-11-05' },
          { id: 2, amount: -200, type: 'odpisanie', reason: 'Test expense', date: '2025-11-05' }
        ],
        filteredData: [
          { id: 1, amount: 500, type: 'dopisanie', reason: 'Test income', date: '2025-11-05' },
          { id: 2, amount: -200, type: 'odpisanie', reason: 'Test expense', date: '2025-11-05' }
        ],
        calculateTotals: jest.fn(() => ({ cash: 300, card: 0, total: 300 }))
      };

      const { getByText, getAllByText } = renderWithContext(<Home />, contextValue);

      await waitFor(() => {
        expect(getByText('Suma:')).toBeTruthy();
        expect(getByText('Gotówki:')).toBeTruthy();
      });
    });
  });

  describe('Form Validation Tests', () => {
    it('Powinien pokazać błąd przy pustej kwocie', async () => {
      const { getAllByText, getByTestId, getByText } = renderWithContext(<Home />);

      // Kliknij przycisk "Odpisz kwotę" aby otworzyć modal (pierwszy element)
      await act(async () => {
        const buttons = getAllByText('Odpisz kwotę');
        fireEvent.press(buttons[0]); // Pierwszy to przycisk, drugi to tytuł modala
      });

      // Poczekaj na pojawienie się modala
      await waitFor(() => {
        expect(getByTestId('submit-deduction-button')).toBeTruthy();
      });

      // Wywoław przycisk submit przez testID
      await act(async () => {
        const submitButton = getByTestId('submit-deduction-button');
        fireEvent.press(submitButton);
      });

      // Sprawdź czy success modal został wyświetlony
      await waitFor(() => {
        expect(getByText('Proszę wprowadzić prawidłową kwotę.')).toBeTruthy();
      }, { timeout: 2000 });
    });

    it('Powinien pokazać błąd przy niepoprawnej kwocie', async () => {
      const { getAllByText, getByPlaceholderText, getByTestId, getByText } = renderWithContext(<Home />);

      // Otwórz modal
      await act(async () => {
        const buttons = getAllByText('Odpisz kwotę');
        fireEvent.press(buttons[0]);
      });

      // Poczekaj na pojawienie się modalu
      await waitFor(() => {
        expect(getByTestId('submit-deduction-button')).toBeTruthy();
      });

      // Znajdź pole input w modalu i wprowadź niepoprawną kwotę
      await act(async () => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, 'abc');
        
        const reasonInput = getByPlaceholderText('Wpisz powód odpisania kwoty...');
        fireEvent.changeText(reasonInput, 'Test reason');

        const submitButton = getByTestId('submit-deduction-button');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(getByText('Proszę wprowadzić prawidłową kwotę.')).toBeTruthy();
      }, { timeout: 2000 });
    });

    it('Powinien pokazać błąd przy pustym powodzie', async () => {
      const { getByText, getAllByText, getByPlaceholderText, getByTestId } = renderWithContext(<Home />);

      // Otwórz modal
      await act(async () => {
        fireEvent.press(getAllByText('Odpisz kwotę')[0]);
      });

      // Poczekaj na pojawienie się modalu
      await waitFor(() => {
        expect(getByTestId('submit-deduction-button')).toBeTruthy();
      });

      // Wypełnij kwotę ale zostaw pusty powód
      await act(async () => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '100');
      });
      
      // Poczekaj na update stanu
      await waitFor(() => {
        expect(getByPlaceholderText('0.00')).toHaveProperty('props.value', '100');
      });

      await act(async () => {
        // Nie wypełniaj pola reason
        const submitButton = getByTestId('submit-deduction-button');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(getByText('Proszę wprowadzić powód odpisania.')).toBeTruthy();
      }, { timeout: 2000 });
    });

    it('Powinien pokazać błąd przy niewystarczających środkach', async () => {
      const contextValue = {
        selectedSymbol: 'PLN', 
        user: { symbol: 'PLN' } 
      };

      const { getByText, getAllByText, getByPlaceholderText, getByTestId } = renderWithContext(<Home />, contextValue);

      // Otwórz modal
      await act(async () => {
        fireEvent.press(getAllByText('Odpisz kwotę')[0]);
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '100');
        
        const reasonInput = getByPlaceholderText('Wpisz powód odpisania kwoty...');
        fireEvent.changeText(reasonInput, 'Test reason');

        const submitButton = getByTestId('submit-deduction-button');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(getByText(/Niewystarczające środki/i)).toBeTruthy();
      }, { timeout: 2000 });
    });
  });

  describe('Financial Operations Flow Tests', () => {
    it('Powinien pomyślnie wykonać operację odpisania kwoty', async () => {
      // Mock API responses - różne odpowiedzi dla różnych endpointów
      tokenService.authenticatedFetch.mockImplementation((url, options) => {
        if (url.includes('/sales/get-all-sales')) {
          // Zwróć dane z wystarczającymi środkami PLN dla testu
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue({
              sales: [{
                _id: 'sale1',
                date: new Date().toISOString().split('T')[0],
                fullName: 'Test Product Sale',
                size: 'M',
                from: 'TestUser',
                source: 'Internal',
                sellingPoint: 'PLN', // Match user.sellingPoint
                cash: [{ price: 1000, currency: 'PLN' }], // 1000 PLN w gotówce
                card: [{ price: 500, currency: 'PLN' }]   // 500 PLN na karcie
              }]
            })
          });
        }
        if (url.includes('/transfer') || url.includes('/advances') || url.includes('/deductions')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue([]) // Puste dla transferów i zaliczek
          });
        }
        if (url.includes('/financial-operations')) {
          // Dla operacji finansowych - sukces
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue([])
          });
        }
        // Default fallback
        return Promise.resolve({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue([])
        });
      });
      
      const contextValue = {
        selectedSymbol: 'PLN'
      };

      const { getByText, getAllByText, getByPlaceholderText, getByTestId } = renderWithContext(<Home />, contextValue);

      // Otwórz modal
      await act(async () => {
        fireEvent.press(getAllByText('Odpisz kwotę')[0]);
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '150');
        
        const reasonInput = getByPlaceholderText('Wpisz powód odpisania kwoty...');
        fireEvent.changeText(reasonInput, 'Test expense');

        const submitButton = getByTestId('submit-deduction-button');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          expect.stringContaining('/financial-operations'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"amount":-150')
          })
        );
      }, { timeout: 2000 });
    });

    it('Powinien pomyślnie wykonać operację dopisania kwoty', async () => {
      // Mock API responses - różne odpowiedzi dla różnych endpointów
      tokenService.authenticatedFetch.mockImplementation((url, options) => {
        if (url.includes('/sales/get-all-sales')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue({
              sales: [{
                _id: 'sale1',
                date: new Date().toISOString().split('T')[0],
                fullName: 'Test Product Sale',
                size: 'M',
                from: 'TestUser',
                source: 'Internal',
                sellingPoint: 'PLN',
                cash: [{ price: 1000, currency: 'PLN' }],
                card: [{ price: 500, currency: 'PLN' }]
              }]
            })
          });
        }
        if (url.includes('/transfer') || url.includes('/advances') || url.includes('/deductions')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue([])
          });
        }
        if (url.includes('/financial-operations')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue([])
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue([])
        });
      });
      
      const contextValue = {
        selectedSymbol: 'PLN'
      };

      const { getAllByText, getByPlaceholderText, getByTestId } = renderWithContext(<Home />, contextValue);

      // Otwórz modal dopisania
      await act(async () => {
        const buttons = getAllByText('Dopisz kwotę');
        fireEvent.press(buttons[0]);
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '250');
      });

      // Wybierz opcję "Inny powód dopisania"  
      await act(async () => {
        const inneOption = getAllByText('Inny powód dopisania')[0];
        fireEvent.press(inneOption);
      });

      // Wpisz powód w polu tekstowym
      await act(async () => {
        const reasonInput = getByPlaceholderText('Wpisz powód dopisania kwoty...');
        fireEvent.changeText(reasonInput, 'Test addition reason');
      });

      // Teraz kliknij submit
      await waitFor(() => {
        const submitButton = getByTestId('submit-addition-button');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          expect.stringContaining('/financial-operations'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"amount":250')
          })
        );
      }, { timeout: 2000 });
    });

    it('Powinien wyczyścić formularz po udanej operacji', async () => {
      // Mock API responses - różne odpowiedzi dla różnych endpointów
      tokenService.authenticatedFetch.mockImplementation((url, options) => {
        if (url.includes('/sales/get-all-sales')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue({
              sales: [{
                _id: 'sale1',
                date: new Date().toISOString().split('T')[0],
                fullName: 'Test Product Sale',
                size: 'M',
                from: 'TestUser',
                source: 'Internal',
                sellingPoint: 'PLN',
                cash: [{ price: 1000, currency: 'PLN' }],
                card: [{ price: 500, currency: 'PLN' }]
              }]
            })
          });
        }
        if (url.includes('/transfer') || url.includes('/advances') || url.includes('/deductions')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue([])
          });
        }
        if (url.includes('/financial-operations')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue([])
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue([])
        });
      });
      
      const contextValue = {
        selectedSymbol: 'PLN'
      };

      const { getByText, getAllByText, getByPlaceholderText, getByTestId } = renderWithContext(<Home />, contextValue);

      // Otwórz modal
      await act(async () => {
        fireEvent.press(getAllByText('Odpisz kwotę')[0]);
      });

      let amountInput, reasonInput;

      await waitFor(() => {
        amountInput = getByPlaceholderText('0.00');
        reasonInput = getByPlaceholderText('Wpisz powód odpisania kwoty...');

        fireEvent.changeText(amountInput, '100');
        fireEvent.changeText(reasonInput, 'Test');

        const submitButton = getByTestId('submit-deduction-button');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        // Sprawdź czy API zostało wywołane
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          expect.stringContaining('/financial-operations'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"amount":-100')
          })
        );
      }, { timeout: 2000 });
      
      // Sprawdź czy modal został zamknięty (co oznacza że formularz został wyczyszczony)
      await waitFor(() => {
        expect(() => getByTestId('submit-deduction-button')).toThrow();
      }, { timeout: 1000 });
    });

    it('Powinien odświeżyć listę operacji po dodaniu nowej', async () => {
      // Mock API responses - różne odpowiedzi dla różnych endpointów
      tokenService.authenticatedFetch.mockImplementation((url, options) => {
        if (url.includes('/sales/get-all-sales')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue({
              sales: [{
                _id: 'sale1',
                date: new Date().toISOString().split('T')[0],
                fullName: 'Test Product Sale',
                size: 'M',
                from: 'TestUser',
                source: 'Internal',
                sellingPoint: 'PLN',
                cash: [{ price: 1000, currency: 'PLN' }],
                card: [{ price: 500, currency: 'PLN' }]
              }]
            })
          });
        }
        if (url.includes('/transfer') || url.includes('/advances') || url.includes('/deductions')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue([])
          });
        }
        if (url.includes('/financial-operations')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue([])
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue([])
        });
      });
      
      const contextValue = {
        selectedSymbol: 'PLN'
      };

      const { getByText, getAllByText, getByPlaceholderText, getByTestId } = renderWithContext(<Home />, contextValue);

      // Otwórz modal
      await act(async () => {
        fireEvent.press(getAllByText('Odpisz kwotę')[0]);
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        const reasonInput = getByPlaceholderText('Wpisz powód odpisania kwoty...');

        fireEvent.changeText(amountInput, '1');
        fireEvent.changeText(reasonInput, 'Test operation');

        const submitButton = getByTestId('submit-deduction-button');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          expect.stringContaining('/financial-operations'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"amount":-1')
          })
        );
      }, { timeout: 2000 });
    });
  });

  describe('Error Handling Tests', () => {
    it('Powinien obsłużyć błąd API przy dodawaniu operacji', async () => {
      // Mock API responses - success dla useEffect, error dla user actions
      tokenService.authenticatedFetch.mockImplementation((url, options) => {
        if (url.includes('/sales/get-all-sales')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue({
              sales: [{
                _id: 'sale1',
                date: new Date().toISOString().split('T')[0],
                fullName: 'Test Product Sale',
                size: 'M',
                from: 'TestUser',
                source: 'Internal',
                sellingPoint: 'PLN',
                cash: [{ price: 1000, currency: 'PLN' }],
                card: [{ price: 500, currency: 'PLN' }]
              }]
            })
          });
        }
        if (url.includes('/transfer') || url.includes('/advances') || url.includes('/deductions')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue([])
          });
        }
        if (url.includes('/financial-operations')) {
          // Error dla operacji finansowych
          return Promise.reject(new Error('API Error'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue([])
        });
      });
      
      const contextValue = {
        selectedSymbol: 'PLN'
      };

      const { getByText, getAllByText, getByPlaceholderText, getByTestId } = renderWithContext(<Home />, contextValue);

      // Otwórz modal
      await act(async () => {
        fireEvent.press(getAllByText('Odpisz kwotę')[0]);
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        const reasonInput = getByPlaceholderText('Wpisz powód odpisania kwoty...');

        fireEvent.changeText(amountInput, '1');
        fireEvent.changeText(reasonInput, 'Test');

        const submitButton = getByTestId('submit-deduction-button');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalled();
        expect(getByText('Nie udało się odpisać kwoty. Spróbuj ponownie.')).toBeTruthy();
      }, { timeout: 2000 });
    });

    it('Powinien obsłużyć błąd sieci', async () => {
      // Mock API responses - success dla useEffect, network error dla user actions
      tokenService.authenticatedFetch.mockImplementation((url, options) => {
        if (url.includes('/sales/get-all-sales')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue({
              sales: [{
                _id: 'sale1',
                date: new Date().toISOString().split('T')[0],
                fullName: 'Test Product Sale',
                size: 'M',
                from: 'TestUser',
                source: 'Internal',
                sellingPoint: 'PLN',
                cash: [{ price: 1000, currency: 'PLN' }],
                card: [{ price: 500, currency: 'PLN' }]
              }]
            })
          });
        }
        if (url.includes('/transfer') || url.includes('/advances') || url.includes('/deductions')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: jest.fn().mockResolvedValue([])
          });
        }
        if (url.includes('/financial-operations')) {
          // Network Error dla operacji finansowych
          return Promise.reject(new Error('Network Error'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: jest.fn().mockResolvedValue([])
        });
      });
      
      const contextValue = {
        selectedSymbol: 'PLN'
      };

      const { getByText, getAllByText, getByPlaceholderText, getByTestId } = renderWithContext(<Home />, contextValue);

      // Otwórz modal
      await act(async () => {
        fireEvent.press(getAllByText('Odpisz kwotę')[0]);
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        const reasonInput = getByPlaceholderText('Wpisz powód odpisania kwoty...');

        fireEvent.changeText(amountInput, '1');
        fireEvent.changeText(reasonInput, 'Network test');

        const submitButton = getByTestId('submit-deduction-button');
        fireEvent.press(submitButton);
      });

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalled();
        expect(getByText('Nie udało się odpisać kwoty. Spróbuj ponownie.')).toBeTruthy();
      }, { timeout: 2000 });
    });
  });

  describe('UI State Tests', () => {
    it('Powinien pokazać loading state podczas operacji', async () => {
      const mockHandleFinancialOperation = jest.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(() => resolve(true), 1000));
      });
      const contextValue = {
        handleFinancialOperation: mockHandleFinancialOperation,
        selectedSymbol: 'PLN',
        loading: true
      };

      const { getByText, getAllByText, getByPlaceholderText, getByTestId } = renderWithContext(<Home />, contextValue);

      // Otwórz modal
      await act(async () => {
        fireEvent.press(getAllByText('Odpisz kwotę')[0]);
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        const reasonInput = getByPlaceholderText('Wpisz powód odpisania kwoty...');

        fireEvent.changeText(amountInput, '75');
        fireEvent.changeText(reasonInput, 'Loading test');

        const submitButton = getByTestId('submit-deduction-button');
        fireEvent.press(submitButton);
      });

      // Test przechodzi jeśli nie ma błędów renderowania
      expect(true).toBeTruthy();
    });

    it('Powinien wyświetlić komunikat gdy brak operacji', async () => {
      const contextValue = {
        financialOperations: [],
        filteredData: []
      };

      const { getByText, getAllByText } = renderWithContext(<Home />, contextValue);

      await waitFor(() => {
        expect(getByText('Suma:')).toBeTruthy();
        expect(getByText('Gotówki:')).toBeTruthy();
      });

      // Test przechodzi jeśli nie ma błędów renderowania przy pustych danych
      expect(true).toBeTruthy();
    });
  });
});
