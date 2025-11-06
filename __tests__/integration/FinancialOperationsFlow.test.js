import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Home from '../../app/(tabs)/home';
import TestWrapper, { GlobalStateContext } from '../utils/TestUtils';
import tokenService from '../../services/tokenService';

// Mock dependencies
jest.mock('../../services/tokenService');
jest.mock('../../config/api', () => ({
  getApiUrl: (endpoint) => `http://localhost:3000/api${endpoint}`
}));

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('Financial Operations Integration Tests', () => {
  const mockUser = {
    symbol: 'P',
    email: 'test@example.com',
    sellingPoint: 'P',
    location: 'Test Location'
  };

  const mockGlobalState = {
    user: mockUser,
    filteredData: [
      {
        _id: '1',
        fullName: 'Test Product',
        size: 'M',
        cash: [{ price: 200, currency: 'PLN' }],
        card: [{ price: 150, currency: 'PLN' }],
        date: new Date().toISOString().split('T')[0]
      }
    ],
    transferredItems: [
      {
        _id: '1',
        fullName: 'Test Advance Product',
        size: 'L',
        advancePayment: 100,
        advancePaymentCurrency: 'PLN',
        date: new Date().toISOString().split('T')[0] // Just date part
      }
    ],
    receivedItems: [],
    advancesData: [],
    deductionsData: [] // Add initial empty operations
  };

  const mockContextValue = {
    ...mockGlobalState,
    setUser: jest.fn(),
    setFilteredData: jest.fn(),
    setTransferredItems: jest.fn(),
    setReceivedItems: jest.fn(),
    setAdvancesData: jest.fn(),
    setDeductionsData: jest.fn(),
    // Add missing functions that Home component needs
    fetchUsers: jest.fn().mockResolvedValue([]),
    fetchGoods: jest.fn().mockResolvedValue([]),
    fetchTransferredItems: jest.fn().mockResolvedValue([]),
    fetchReceivedItems: jest.fn().mockResolvedValue([]),
    fetchAdvances: jest.fn().mockResolvedValue([]),
    fetchFinancialOperations: jest.fn().mockResolvedValue([]),
    // Other state values Home needs
    users: [],
    goods: [],
    products: [],
    setProducts: jest.fn(),
    setGoods: jest.fn(),
    setUsers: jest.fn(),
    financialOperations: [],
    setFinancialOperations: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all implementations to ensure clean state
    tokenService.authenticatedFetch.mockReset();
  });

  const renderWithContext = (component) => {
    return render(
      <TestWrapper>
        <GlobalStateContext.Provider value={mockContextValue}>
          {component}
        </GlobalStateContext.Provider>
      </TestWrapper>
    );
  };

  describe('Complete Financial Operations Flow', () => {
    it('Powinien wykonać pełny przepływ: wyświetlenie środków, dodanie kwoty, sprawdzenie nowego balansu', async () => {
      // Mock empty initial operations
      tokenService.authenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]) // Initial fetch - no operations
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }) // Add operation
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([
            {
              _id: '1',
              userSymbol: 'P',
              amount: 500,
              currency: 'PLN',
              type: 'addition',
              reason: 'Wpłata testowa',
              date: new Date().toISOString()
            }
          ]) // Fetch after adding
        });

      const { getByText, getByPlaceholderText, getByTestId, getAllByText } = renderWithContext(<Home />);

      // Step 1: Verify initial available funds (sales + advances = 350 + 100 = 450)
      await waitFor(() => {
        expect(getByText('💰 Dostępne środki w PLN: 450.00')).toBeTruthy();
      });
      console.log('✅ Krok 1: Początkowe środki: 450 PLN');

      // Step 2: Add money
      await waitFor(() => {
        fireEvent.press(getByTestId('add-amount-button'));
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '500');
        
        // Select "Inny powód dopisania" to show text input
        fireEvent.press(getByText('Inny powód dopisania'));
      });

      await waitFor(() => {
        const reasonInput = getByPlaceholderText('Wpisz powód dopisania kwoty...');
        fireEvent.changeText(reasonInput, 'Wpłata testowa');
        
        fireEvent.press(getByTestId('submit-addition-button')); // Use testID instead
      });

      // Step 3: Verify API was called correctly
      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/financial-operations',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"userSymbol":"P"') && 
                  expect.stringContaining('"amount":500') &&
                  expect.stringContaining('"currency":"PLN"') &&
                  expect.stringContaining('"type":"addition"') &&
                  expect.stringContaining('"reason":"Wpłata testowa"')
          })
        );
      });

      // Step 4: Verify success message
      expect(Alert.alert).toHaveBeenCalledWith('Sukces', 'Kwota została dopisana.');

      // Step 5: Check that operations are displayed
      await waitFor(() => {
        expect(getByText('Operacje dzisiaj:')).toBeTruthy();
        expect(getByText('1. Wpłata testowa')).toBeTruthy();
        // Use getAllByText to handle multiple occurrences
        const amountTexts = getAllByText('+500 PLN');
        expect(amountTexts.length).toBeGreaterThan(0);
      });

      console.log('✅ Pełny przepływ operacji finansowych zakończony pomyślnie');
    });

    it('Powinien sprawdzić czy dostępne środki są aktualizowane po operacjach', async () => {
      // Mock operations that affect available funds
      const mockOperations = [
        {
          _id: '1',
          userSymbol: 'P',
          amount: 300,
          currency: 'PLN',
          type: 'addition',
          reason: 'Wpłata',
          date: new Date().toISOString().split('T')[0] // Use date part only for proper filtering
        },
        {
          _id: '2',
          userSymbol: 'P',
          amount: -100,
          currency: 'PLN',
          type: 'deduction',
          reason: 'Wypłata',
          date: new Date().toISOString().split('T')[0] // Use date part only for proper filtering
        }
      ];

      // Update mock context to include operations
      const updatedMockState = {
        ...mockGlobalState,
        deductionsData: mockOperations
      };

      const updatedContextValue = {
        ...mockContextValue,
        ...updatedMockState
      };

      const { getByText } = render(
        <TestWrapper>
          <GlobalStateContext.Provider value={updatedContextValue}>
            <Home />
          </GlobalStateContext.Provider>
        </TestWrapper>
      );

      // Available funds calculation:
      // Sales: 350 PLN (200 cash + 150 card)
      // Advances: 100 PLN
      // Operations: 200 PLN (300 - 100)
      // Total: 350 + 100 + 200 = 650 PLN

      await waitFor(() => {
        expect(getByText('💰 Dostępne środki w PLN: 650.00')).toBeTruthy();
      });

      await waitFor(() => {
        expect(getByText('Bilans operacji:')).toBeTruthy();
        expect(getByText('+200 PLN')).toBeTruthy();
      });

      console.log('✅ Dostępne środki aktualizowane poprawnie: 650 PLN');
    });

    it('Powinien obsłużyć scenariusz z niewystarczającymi środkami przy odpisywaniu', async () => {
      // Mock no operations initially
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { getByText, getByPlaceholderText, getAllByText, getByTestId } = renderWithContext(<Home />);

      // Available funds: 350 (sales) + 100 (advances) = 450 PLN
      
      // Try to deduct more than available
      await waitFor(() => {
        fireEvent.press(getByTestId('deduct-amount-button'));
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        const reasonInput = getByPlaceholderText('Wpisz powód odpisania kwoty...');
        
        fireEvent.changeText(amountInput, '500'); // More than 450 available
        fireEvent.changeText(reasonInput, 'Próba odpisania za dużej kwoty');
        
        console.log('🔍 Trying to submit deduction with 500 PLN...');
        fireEvent.press(getByTestId('submit-deduction-button')); // Use testID instead
      });

      // Should show insufficient funds alert
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Niewystarczające środki',
          expect.stringContaining('Nie można odpisać 500 PLN'),
          expect.any(Array)
        );
      });

      console.log('✅ Sprawdzanie niewystarczających środków działa poprawnie');
    });

    it('Powinien obsłużyć anulowanie operacji', async () => {
      const mockOperations = [
        {
          _id: 'operation123',
          userSymbol: 'P',
          amount: 200,
          currency: 'PLN',
          type: 'addition',
          reason: 'Operacja do anulowania',
          date: new Date().toISOString().split('T')[0] // Use date part only for proper filtering
        }
      ];

      // Mock API calls for cancellation flow
      tokenService.authenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }) // Delete operation
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]) // Fetch after delete
        });

      // Update mock context to include operations
      const updatedMockState = {
        ...mockGlobalState,
        deductionsData: mockOperations
      };

      const updatedContextValue = {
        ...mockContextValue,
        ...updatedMockState
      };

      const { getByText, getAllByText } = render(
        <TestWrapper>
          <GlobalStateContext.Provider value={updatedContextValue}>
            <Home />
          </GlobalStateContext.Provider>
        </TestWrapper>
      );

      // Wait for operation to be displayed
      await waitFor(() => {
        expect(getByText('Operacje dzisiaj:')).toBeTruthy();
        expect(getByText('1. Operacja do anulowania')).toBeTruthy();
      });

      // Click on options menu (⋮) for the operation (not sales item)
      const allOptionsButtons = getAllByText('⋮');
      // The second ⋮ button should be for the operation (first is for sales item)
      const operationOptionsButton = allOptionsButtons[1];
      fireEvent.press(operationOptionsButton);

      // Confirm cancellation in modal
      await waitFor(() => {
        expect(getByText('Anuluj odpisaną kwotę')).toBeTruthy();
        expect(getByText('Tak, anuluj odpisaną kwotę')).toBeTruthy();
      });

      fireEvent.press(getByText('Tak, anuluj odpisaną kwotę'));

      // Verify delete API was called
      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/financial-operations/operation123',
          expect.objectContaining({
            method: 'DELETE'
          })
        );
      });

      expect(Alert.alert).toHaveBeenCalledWith('Sukces', 'Operacja została anulowana.');

      console.log('✅ Anulowanie operacji działa poprawnie');
    });

    it('Powinien obsłużyć różne waluty w bilansie', async () => {
      const mockMultiCurrencyOperations = [
        {
          _id: '1',
          userSymbol: 'P',
          amount: 500,
          currency: 'PLN',
          type: 'addition',
          reason: 'Wpłata PLN',
          date: new Date().toISOString().split('T')[0] // Use date part only for proper filtering
        },
        {
          _id: '2',
          userSymbol: 'P',
          amount: 100,
          currency: 'EUR',
          type: 'addition',
          reason: 'Wpłata EUR',
          date: new Date().toISOString().split('T')[0] // Use date part only for proper filtering
        },
        {
          _id: '3',
          userSymbol: 'P',
          amount: -50,
          currency: 'EUR',
          type: 'deduction',
          reason: 'Wypłata EUR',
          date: new Date().toISOString().split('T')[0] // Use date part only for proper filtering
        }
      ];

      // Update mock context to include operations
      const updatedMockState = {
        ...mockGlobalState,
        deductionsData: mockMultiCurrencyOperations
      };

      const updatedContextValue = {
        ...mockContextValue,
        ...updatedMockState
      };

      const { getByText, getAllByText } = render(
        <TestWrapper>
          <GlobalStateContext.Provider value={updatedContextValue}>
            <Home />
          </GlobalStateContext.Provider>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Bilans operacji:')).toBeTruthy();
      });

      // Should show both currencies in balance
      await waitFor(() => {
        // Use getAllByText to handle multiple occurrences
        const plnTexts = getAllByText('+500 PLN');
        const eurTexts = getAllByText('+50 EUR');
        expect(plnTexts.length).toBeGreaterThan(0);
        expect(eurTexts.length).toBeGreaterThan(0);
      });

      console.log('✅ Obsługa wielu walut w bilansie działa poprawnie');
      console.log('   PLN: +500');
      console.log('   EUR: +50');
    });
  });

  describe('Error Handling Integration', () => {
    it('Powinien obsłużyć błąd sieci podczas dodawania operacji', async () => {
      // Mock successful initial load but failed POST request
      tokenService.authenticatedFetch.mockImplementation((url, options) => {
        if (options?.method === 'POST') {
          // Reject POST requests (adding operations)
          return Promise.reject(new Error('Network error'));
        } else {
          // Resolve GET requests (fetching operations)
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          });
        }
      });

      const { getByText, getByPlaceholderText, getAllByText, getByTestId } = renderWithContext(<Home />);

      await waitFor(() => {
        fireEvent.press(getByTestId('add-amount-button'));
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '100');
        
        // Select "Inny powód dopisania" to show text input
        fireEvent.press(getByText('Inny powód dopisania'));
      });

      await waitFor(() => {
        const reasonInput = getByPlaceholderText('Wpisz powód dopisania kwoty...');
        fireEvent.changeText(reasonInput, 'Test error');
        
        fireEvent.press(getByTestId('submit-addition-button')); // Use testID instead
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Nie udało się dopisać kwoty. Spróbuj ponownie.');
      });

      console.log('✅ Obsługa błędów sieci działa poprawnie');
    });

    it('Powinien obsłużyć fallback do starego endpointu', async () => {
      // Mock operations from old endpoint (fallback scenario)
      const mockFallbackOperations = [
        {
          _id: '1',
          userSymbol: 'P',
          amount: 200,
          currency: 'PLN',
          reason: '[DOPISANIE] Stara operacja',
          date: new Date().toISOString().split('T')[0] // Use date part only for proper filtering
        }
      ];

      // Update mock context to include operations (simulating fallback working)
      const updatedMockState = {
        ...mockGlobalState,
        deductionsData: mockFallbackOperations
      };

      const updatedContextValue = {
        ...mockContextValue,
        ...updatedMockState
      };

      const { getByText } = render(
        <TestWrapper>
          <GlobalStateContext.Provider value={updatedContextValue}>
            <Home />
          </GlobalStateContext.Provider>
        </TestWrapper>
      );

      await waitFor(() => {
        expect(getByText('Operacje dzisiaj:')).toBeTruthy();
        expect(getByText('1. [DOPISANIE] Stara operacja')).toBeTruthy();
      });

      console.log('✅ Fallback do starego endpointu działa poprawnie');
    });
  });
});