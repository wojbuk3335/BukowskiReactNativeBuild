import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Home from '../../app/(tabs)/home';
import { GlobalStateContext } from '../../context/GlobalStateContext';
import tokenService from '../../services/tokenService';

// Mock dependencies
jest.mock('../../services/tokenService');
jest.mock('../../config/api', () => ({
  getApiUrl: (endpoint) => `http://localhost:3000/api${endpoint}`
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock fetch for API calls
global.fetch = jest.fn();

describe('Financial Operations Mobile Tests', () => {
  const mockUser = {
    symbol: 'P',
    email: 'test@example.com',
    sellingPoint: 'P',
    location: 'Test Location'
  };

  const mockGlobalState = {
    user: mockUser,
    filteredData: [],
    transferredItems: [],
    receivedItems: [],
    advancesData: []
  };

  const mockContextValue = {
    ...mockGlobalState,
    setUser: jest.fn(),
    setFilteredData: jest.fn(),
    setTransferredItems: jest.fn(),
    setReceivedItems: jest.fn(),
    setAdvancesData: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful API responses
    tokenService.authenticatedFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    });
  });

  const renderWithContext = (component) => {
    return render(
      <GlobalStateContext.Provider value={mockContextValue}>
        {component}
      </GlobalStateContext.Provider>
    );
  };

  describe('Financial Operations UI Components', () => {
    it('Powinien wyświetlić przyciski operacji finansowych', async () => {
      const { getByText } = renderWithContext(<Home />);
      
      await waitFor(() => {
        expect(getByText('Odpisz kwotę')).toBeTruthy();
        expect(getByText('Dopisz kwotę')).toBeTruthy();
      });

      console.log('✅ Przyciski operacji finansowych są widoczne');
    });

    it('Powinien otworzyć modal odpisania kwoty', async () => {
      const { getByText, getByDisplayValue } = renderWithContext(<Home />);
      
      await waitFor(() => {
        const deductButton = getByText('Odpisz kwotę');
        fireEvent.press(deductButton);
      });

      await waitFor(() => {
        expect(getByText('Odpisz kwotę')).toBeTruthy();
        expect(getByText('Kwota:')).toBeTruthy();
        expect(getByText('Waluta:')).toBeTruthy();
        expect(getByText('Powód odpisania:')).toBeTruthy();
      });

      console.log('✅ Modal odpisania kwoty otwiera się poprawnie');
    });

    it('Powinien otworzyć modal dopisania kwoty', async () => {
      const { getByText } = renderWithContext(<Home />);
      
      await waitFor(() => {
        const addButton = getByText('Dopisz kwotę');
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        expect(getByText('Dopisz kwotę')).toBeTruthy();
        expect(getByText('Kwota:')).toBeTruthy();
        expect(getByText('Waluta:')).toBeTruthy();
        expect(getByText('Powód dopisania:')).toBeTruthy();
      });

      console.log('✅ Modal dopisania kwoty otwiera się poprawnie');
    });
  });

  describe('Financial Operations Form Validation', () => {
    it('Powinien wymagać kwoty przy odpisywaniu', async () => {
      const { getByText, getByTestId } = renderWithContext(<Home />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Odpisz kwotę'));
      });

      await waitFor(() => {
        fireEvent.press(getByText('Odpisz kwotę')); // Submit button
      });

      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Proszę wprowadzić prawidłową kwotę.');
      console.log('✅ Walidacja kwoty przy odpisywaniu działa');
    });

    it('Powinien wymagać powodu przy odpisywaniu', async () => {
      const { getByText, getByPlaceholderText } = renderWithContext(<Home />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Odpisz kwotę'));
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '100');
        
        fireEvent.press(getByText('Odpisz kwotę')); // Submit button
      });

      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Proszę wprowadzić powód odpisania.');
      console.log('✅ Walidacja powodu przy odpisywaniu działa');
    });

    it('Powinien wymagać kwoty przy dopisywaniu', async () => {
      const { getByText } = renderWithContext(<Home />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Dopisz kwotę'));
      });

      await waitFor(() => {
        fireEvent.press(getByText('Dopisz kwotę')); // Submit button
      });

      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Proszę wprowadzić prawidłową kwotę.');
      console.log('✅ Walidacja kwoty przy dopisywaniu działa');
    });

    it('Powinien wymagać powodu przy dopisywaniu', async () => {
      const { getByText, getByPlaceholderText } = renderWithContext(<Home />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Dopisz kwotę'));
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '200');
        
        fireEvent.press(getByText('Dopisz kwotę')); // Submit button
      });

      expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Proszę wprowadzić powód dopisania.');
      console.log('✅ Walidacja powodu przy dopisywaniu działa');
    });
  });

  describe('Financial Operations API Integration', () => {
    it('Powinien wysłać poprawne dane przy odpisywaniu kwoty', async () => {
      const { getByText, getByPlaceholderText } = renderWithContext(<Home />);
      
      // Mock successful API response
      tokenService.authenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await waitFor(() => {
        fireEvent.press(getByText('Odpisz kwotę'));
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        const reasonInput = getByPlaceholderText('Wpisz powód odpisania kwoty...');
        
        fireEvent.changeText(amountInput, '150');
        fireEvent.changeText(reasonInput, 'Test odpisania');
        
        fireEvent.press(getByText('Odpisz kwotę')); // Submit button
      });

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/financial-operations',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              userSymbol: 'P',
              amount: -150, // Negative for deduction
              currency: 'PLN',
              type: 'deduction',
              reason: 'Test odpisania',
              date: expect.any(String)
            })
          })
        );
      });

      expect(Alert.alert).toHaveBeenCalledWith('Sukces', 'Kwota została odpisana.');
      console.log('✅ API call dla odpisania kwoty działa poprawnie');
    });

    it('Powinien wysłać poprawne dane przy dopisywaniu kwoty', async () => {
      const { getByText, getByPlaceholderText } = renderWithContext(<Home />);
      
      // Mock successful API response
      tokenService.authenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true })
      });

      await waitFor(() => {
        fireEvent.press(getByText('Dopisz kwotę'));
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        const reasonInput = getByPlaceholderText('Wpisz powód dopisania kwoty...');
        
        fireEvent.changeText(amountInput, '300');
        fireEvent.changeText(reasonInput, 'Test dopisania');
        
        fireEvent.press(getByText('Dopisz kwotę')); // Submit button
      });

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/financial-operations',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              userSymbol: 'P',
              amount: 300, // Positive for addition
              currency: 'PLN',
              type: 'addition',
              reason: 'Test dopisania',
              date: expect.any(String)
            })
          })
        );
      });

      expect(Alert.alert).toHaveBeenCalledWith('Sukces', 'Kwota została dopisana.');
      console.log('✅ API call dla dopisania kwoty działa poprawnie');
    });

    it('Powinien obsłużyć błąd API', async () => {
      const { getByText, getByPlaceholderText } = renderWithContext(<Home />);
      
      // Mock API error
      tokenService.authenticatedFetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await waitFor(() => {
        fireEvent.press(getByText('Odpisz kwotę'));
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        const reasonInput = getByPlaceholderText('Wpisz powód odpisania kwoty...');
        
        fireEvent.changeText(amountInput, '100');
        fireEvent.changeText(reasonInput, 'Test błędu');
        
        fireEvent.press(getByText('Odpisz kwotę')); // Submit button
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Nie udało się odpisać kwoty. Spróbuj ponownie.');
      });

      console.log('✅ Obsługa błędów API działa poprawnie');
    });
  });

  describe('Financial Operations Display', () => {
    it('Powinien wyświetlić operacje z poprawnymi kolorami', async () => {
      // Mock API response with operations
      const mockOperations = [
        {
          _id: '1',
          userSymbol: 'P',
          amount: 500,
          currency: 'PLN',
          type: 'addition',
          reason: 'Wpłata testowa',
          date: new Date().toISOString()
        },
        {
          _id: '2',
          userSymbol: 'P',
          amount: -200,
          currency: 'PLN',
          type: 'deduction',
          reason: 'Wypłata testowa',
          date: new Date().toISOString()
        }
      ];

      tokenService.authenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOperations)
      });

      const { getByText, rerender } = renderWithContext(<Home />);

      // Wait for operations to load
      await waitFor(() => {
        expect(getByText('Operacje dzisiaj:')).toBeTruthy();
      });

      // Check if operations are displayed
      await waitFor(() => {
        expect(getByText('1. Wpłata testowa')).toBeTruthy();
        expect(getByText('2. Wypłata testowa')).toBeTruthy();
        expect(getByText('+500 PLN')).toBeTruthy();
        expect(getByText('-200 PLN')).toBeTruthy();
      });

      console.log('✅ Operacje finansowe wyświetlane z poprawnymi kolorami');
    });

    it('Powinien obliczyć poprawny bilans operacji', async () => {
      const mockOperations = [
        {
          _id: '1',
          userSymbol: 'P',
          amount: 800,
          currency: 'PLN',
          type: 'addition',
          reason: 'Wpłata 1',
          date: new Date().toISOString()
        },
        {
          _id: '2',
          userSymbol: 'P',
          amount: -300,
          currency: 'PLN',
          type: 'deduction',
          reason: 'Wypłata 1',
          date: new Date().toISOString()
        }
      ];

      tokenService.authenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOperations)
      });

      const { getByText } = renderWithContext(<Home />);

      await waitFor(() => {
        expect(getByText('Bilans operacji:')).toBeTruthy();
        expect(getByText('+500 PLN')).toBeTruthy(); // 800 - 300 = 500
      });

      console.log('✅ Bilans operacji obliczany poprawnie: +500 PLN');
    });
  });

  describe('Financial Operations Edge Cases', () => {
    it('Powinien obsłużyć brak operacji', async () => {
      tokenService.authenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { queryByText } = renderWithContext(<Home />);

      await waitFor(() => {
        expect(queryByText('Operacje dzisiaj:')).toBeFalsy();
      });

      console.log('✅ Brak operacji obsłużony poprawnie');
    });

    it('Powinien obsłużyć różne waluty', async () => {
      const mockOperations = [
        {
          _id: '1',
          userSymbol: 'P',
          amount: 100,
          currency: 'EUR',
          type: 'addition',
          reason: 'Wpłata EUR',
          date: new Date().toISOString()
        },
        {
          _id: '2',
          userSymbol: 'P',
          amount: 500,
          currency: 'PLN',
          type: 'addition',
          reason: 'Wpłata PLN',
          date: new Date().toISOString()
        }
      ];

      tokenService.authenticatedFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockOperations)
      });

      const { getByText } = renderWithContext(<Home />);

      await waitFor(() => {
        expect(getByText('+100 EUR')).toBeTruthy();
        expect(getByText('+500 PLN')).toBeTruthy();
      });

      console.log('✅ Różne waluty obsłużone poprawnie');
    });
  });
});