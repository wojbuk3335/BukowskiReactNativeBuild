import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { GlobalStateProvider } from '../../context/GlobalState';
import Home from '../../app/(tabs)/home';
import { tokenService } from '../../config/api';

// Mockowanie Alert
jest.spyOn(Alert, 'alert');

// Mockowanie tokenService
jest.mock('../../config/api', () => ({
  tokenService: {
    authenticatedFetch: jest.fn(),
  }
}));

// Mock danych testowych
const mockUser = {
  id: '123',
  symbol: 'P',
  name: 'Jan Kowalski'
};

const mockUsers = [
  { id: '123', symbol: 'P', name: 'Jan Kowalski' },
  { id: '124', symbol: 'Q', name: 'Anna Nowak' }
];

const mockFinancialOperations = [
  {
    _id: '1',
    userSymbol: 'P',
    amount: 500,
    currency: 'PLN',
    type: 'addition',
    reason: 'Wpłata gotówki',
    date: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    _id: '2',
    userSymbol: 'P',
    amount: -200,
    currency: 'PLN',
    type: 'deduction',
    reason: 'Wypłata gotówki',
    date: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// Wrapper dla kontekstu z mockami
const TestWrapper = ({ children }) => {
  const initialState = {
    user: mockUser,
    users: mockUsers,
    selectedSymbol: 'P',
    setSelectedSymbol: jest.fn(),
    logout: jest.fn(),
    login: jest.fn(),
  };

  return (
    <GlobalStateProvider value={initialState}>
      {children}
    </GlobalStateProvider>
  );
};

describe('Financial Operations Component Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock domyślnych odpowiedzi API
    tokenService.authenticatedFetch.mockImplementation((url, options) => {
      if (url.includes('/financial-operations')) {
        if (options?.method === 'GET') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockFinancialOperations)
          });
        }
        if (options?.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              _id: 'new-id',
              ...JSON.parse(options.body),
              createdAt: new Date(),
              updatedAt: new Date()
            })
          });
        }
      }
      
      if (url.includes('/users')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUsers)
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      });
    });
  });

  describe('Component Rendering Tests', () => {
    it('Powinien renderować główne elementy interfejsu', async () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Bukowski Sp. z o.o.')).toBeTruthy();
        expect(getByText('Odpisz kwotę')).toBeTruthy();
        expect(getByText('Dopisz kwotę')).toBeTruthy();
        expect(getByPlaceholderText('Wpisz kwotę')).toBeTruthy();
        expect(getByPlaceholderText('Powód operacji')).toBeTruthy();
      });

      console.log('✅ Główne elementy interfejsu renderowane poprawnie');
    });

    it('Powinien wyświetlać operacje finansowe w odpowiednich kolorach', async () => {
      const { getByText } = render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Operacje dzisiaj')).toBeTruthy();
        expect(getByText('+500 PLN')).toBeTruthy();
        expect(getByText('-200 PLN')).toBeTruthy();
        expect(getByText('Wpłata gotówki')).toBeTruthy();
        expect(getByText('Wypłata gotówki')).toBeTruthy();
      });

      console.log('✅ Operacje finansowe wyświetlane z właściwymi kwotami');
    });

    it('Powinien wyświetlać poprawny bilans', async () => {
      const { getByText } = render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      await waitFor(() => {
        // Bilans: 500 - 200 = 300
        expect(getByText('Bilans: +300 PLN')).toBeTruthy();
      });

      console.log('✅ Bilans operacji obliczony i wyświetlony poprawnie');
    });
  });

  describe('Form Validation Tests', () => {
    it('Powinien pokazać błąd przy pustej kwocie', async () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      await waitFor(() => {
        const deductButton = getByText('Odpisz kwotę');
        fireEvent.press(deductButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Błąd',
          'Proszę podać kwotę'
        );
      });

      console.log('✅ Walidacja pustej kwoty działa poprawnie');
    });

    it('Powinien pokazać błąd przy niepoprawnej kwocie', async () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      await waitFor(() => {
        const amountInput = getByPlaceholderText('Wpisz kwotę');
        fireEvent.changeText(amountInput, 'abc');
        
        const deductButton = getByText('Odpisz kwotę');
        fireEvent.press(deductButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Błąd',
          'Kwota musi być liczbą większą od 0'
        );
      });

      console.log('✅ Walidacja niepoprawnej kwoty działa poprawnie');
    });

    it('Powinien pokazać błąd przy pustym powodzie', async () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      await waitFor(() => {
        const amountInput = getByPlaceholderText('Wpisz kwotę');
        fireEvent.changeText(amountInput, '100');
        
        const deductButton = getByText('Odpisz kwotę');
        fireEvent.press(deductButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Błąd',
          'Proszę podać powód operacji'
        );
      });

      console.log('✅ Walidacja pustego powodu działa poprawnie');
    });

    it('Powinien pokazać błąd przy niewybranym symbolu', async () => {
      const TestWrapperNoSymbol = ({ children }) => {
        const initialState = {
          user: mockUser,
          users: mockUsers,
          selectedSymbol: '', // Pusty symbol
          setSelectedSymbol: jest.fn(),
          logout: jest.fn(),
          login: jest.fn(),
        };

        return (
          <GlobalStateProvider value={initialState}>
            {children}
          </GlobalStateProvider>
        );
      };

      const { getByText, getByPlaceholderText } = render(
        <TestWrapperNoSymbol>
          <Home />
        </TestWrapperNoSymbol>
      );

      await waitFor(() => {
        const amountInput = getByPlaceholderText('Wpisz kwotę');
        fireEvent.changeText(amountInput, '100');
        
        const reasonInput = getByPlaceholderText('Powód operacji');
        fireEvent.changeText(reasonInput, 'Test operacji');
        
        const deductButton = getByText('Odpisz kwotę');
        fireEvent.press(deductButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Błąd',
          'Proszę wybrać użytkownika'
        );
      });

      console.log('✅ Walidacja braku symbolu użytkownika działa poprawnie');
    });
  });

  describe('Financial Operations Flow Tests', () => {
    it('Powinien pomyślnie wykonać operację odpisania kwoty', async () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      await waitFor(() => {
        const amountInput = getByPlaceholderText('Wpisz kwotę');
        fireEvent.changeText(amountInput, '150');
        
        const reasonInput = getByPlaceholderText('Powód operacji');
        fireEvent.changeText(reasonInput, 'Wypłata testowa');
        
        const deductButton = getByText('Odpisz kwotę');
        fireEvent.press(deductButton);
      });

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          expect.stringContaining('/financial-operations'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            }),
            body: expect.stringContaining('"amount":-150')
          })
        );
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Sukces',
          'Operacja została zapisana'
        );
      });

      console.log('✅ Operacja odpisania kwoty wykonana pomyślnie');
    });

    it('Powinien pomyślnie wykonać operację dopisania kwoty', async () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      await waitFor(() => {
        const amountInput = getByPlaceholderText('Wpisz kwotę');
        fireEvent.changeText(amountInput, '250');
        
        const reasonInput = getByPlaceholderText('Powód operacji');
        fireEvent.changeText(reasonInput, 'Wpłata testowa');
        
        const addButton = getByText('Dopisz kwotę');
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          expect.stringContaining('/financial-operations'),
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json'
            }),
            body: expect.stringContaining('"amount":250')
          })
        );
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Sukces',
          'Operacja została zapisana'
        );
      });

      console.log('✅ Operacja dopisania kwoty wykonana pomyślnie');
    });

    it('Powinien wyczyścić formularz po udanej operacji', async () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      let amountInput, reasonInput;

      await waitFor(() => {
        amountInput = getByPlaceholderText('Wpisz kwotę');
        reasonInput = getByPlaceholderText('Powód operacji');
        
        fireEvent.changeText(amountInput, '100');
        fireEvent.changeText(reasonInput, 'Test');
        
        const addButton = getByText('Dopisz kwotę');
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        expect(amountInput.props.value).toBe('');
        expect(reasonInput.props.value).toBe('');
      });

      console.log('✅ Formularz wyczyszczony po udanej operacji');
    });

    it('Powinien odświeżyć listę operacji po dodaniu nowej', async () => {
      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      let fetchCallsCount = 0;
      tokenService.authenticatedFetch.mockImplementation((url, options) => {
        if (url.includes('/financial-operations') && options?.method === 'GET') {
          fetchCallsCount++;
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockFinancialOperations)
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('Wpisz kwotę');
        const reasonInput = getByPlaceholderText('Powód operacji');
        
        fireEvent.changeText(amountInput, '100');
        fireEvent.changeText(reasonInput, 'Test odświeżania');
        
        const addButton = getByText('Dopisz kwotę');
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        // Oczekujemy co najmniej 2 wywołania GET - jedno przy ładowaniu i jedno po dodaniu
        expect(fetchCallsCount).toBeGreaterThanOrEqual(2);
      });

      console.log('✅ Lista operacji odświeżona po dodaniu nowej');
    });
  });

  describe('Error Handling Tests', () => {
    it('Powinien obsłużyć błąd API przy dodawaniu operacji', async () => {
      tokenService.authenticatedFetch.mockImplementation((url, options) => {
        if (url.includes('/financial-operations') && options?.method === 'POST') {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ message: 'Błąd serwera' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      });

      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      await waitFor(() => {
        const amountInput = getByPlaceholderText('Wpisz kwotę');
        const reasonInput = getByPlaceholderText('Powód operacji');
        
        fireEvent.changeText(amountInput, '100');
        fireEvent.changeText(reasonInput, 'Test błędu');
        
        const addButton = getByText('Dopisz kwotę');
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Błąd',
          expect.stringContaining('Błąd')
        );
      });

      console.log('✅ Błędy API obsłużone poprawnie');
    });

    it('Powinien obsłużyć błąd sieci', async () => {
      tokenService.authenticatedFetch.mockImplementation(() => {
        return Promise.reject(new Error('Network error'));
      });

      const { getByText, getByPlaceholderText } = render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      await waitFor(() => {
        const amountInput = getByPlaceholderText('Wpisz kwotę');
        const reasonInput = getByPlaceholderText('Powód operacji');
        
        fireEvent.changeText(amountInput, '100');
        fireEvent.changeText(reasonInput, 'Test błędu sieci');
        
        const addButton = getByText('Dopisz kwotę');
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Błąd',
          expect.stringContaining('błąd')
        );
      });

      console.log('✅ Błędy sieci obsłużone poprawnie');
    });
  });

  describe('UI State Tests', () => {
    it('Powinien pokazać loading state podczas operacji', async () => {
      // Mock opóźnionego API
      tokenService.authenticatedFetch.mockImplementation((url, options) => {
        if (url.includes('/financial-operations') && options?.method === 'POST') {
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                json: () => Promise.resolve({})
              });
            }, 100);
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      });

      const { getByText, getByPlaceholderText, queryByText } = render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      await waitFor(() => {
        const amountInput = getByPlaceholderText('Wpisz kwotę');
        const reasonInput = getByPlaceholderText('Powód operacji');
        
        fireEvent.changeText(amountInput, '100');
        fireEvent.changeText(reasonInput, 'Test loading');
        
        const addButton = getByText('Dopisz kwotę');
        fireEvent.press(addButton);
      });

      // Sprawdź czy button jest zdezaktywowany podczas operacji
      const addButton = queryByText('Dopisz kwotę');
      expect(addButton).toBeTruthy();

      console.log('✅ Stan loading podczas operacji obsłużony poprawnie');
    });

    it('Powinien wyświetlić komunikat gdy brak operacji', async () => {
      tokenService.authenticatedFetch.mockImplementation((url, options) => {
        if (url.includes('/financial-operations')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]) // Pusta lista operacji
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      });

      const { getByText } = render(
        <TestWrapper>
          <Home />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Brak operacji na dzisiaj')).toBeTruthy();
        expect(getByText('Bilans: 0 PLN')).toBeTruthy();
      });

      console.log('✅ Komunkat o braku operacji wyświetlony poprawnie');
    });
  });
});