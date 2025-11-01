import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
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
        cash: [{ price: 200, currency: 'PLN' }],
        card: [{ price: 150, currency: 'PLN' }],
        date: new Date().toISOString().split('T')[0]
      }
    ],
    transferredItems: [
      {
        _id: '1',
        advancePayment: 100,
        advancePaymentCurrency: 'PLN',
        date: new Date().toISOString()
      }
    ],
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
  });

  const renderWithContext = (component) => {
    return render(
      <GlobalStateContext.Provider value={mockContextValue}>
        {component}
      </GlobalStateContext.Provider>
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

      const { getByText, getByPlaceholderText } = renderWithContext(<Home />);

      // Step 1: Verify initial available funds (sales + advances = 350 + 100 = 450)
      await waitFor(() => {
        expect(getByText('💰 Dostępne środki w PLN: 450.00')).toBeTruthy();
      });
      console.log('✅ Krok 1: Początkowe środki: 450 PLN');

      // Step 2: Add money
      await waitFor(() => {
        fireEvent.press(getByText('Dopisz kwotę'));
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        const reasonInput = getByPlaceholderText('Wpisz powód dopisania kwoty...');
        
        fireEvent.changeText(amountInput, '500');
        fireEvent.changeText(reasonInput, 'Wpłata testowa');
        
        fireEvent.press(getByText('Dopisz kwotę')); // Submit button
      });

      // Step 3: Verify API was called correctly
      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/financial-operations',
          expect.objectContaining({
            method: 'POST',
            body: JSON.stringify({
              userSymbol: 'P',
              amount: 500,
              currency: 'PLN',
              type: 'addition',
              reason: 'Wpłata testowa',
              date: expect.any(String)
            })
          })
        );
      });

      // Step 4: Verify success message
      expect(Alert.alert).toHaveBeenCalledWith('Sukces', 'Kwota została dopisana.');

      // Step 5: Check that operations are displayed
      await waitFor(() => {
        expect(getByText('Operacje dzisiaj:')).toBeTruthy();
        expect(getByText('1. Wpłata testowa')).toBeTruthy();
        expect(getByText('+500 PLN')).toBeTruthy();
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
          date: new Date().toISOString()
        },
        {
          _id: '2',
          userSymbol: 'P',
          amount: -100,
          currency: 'PLN',
          type: 'deduction',
          reason: 'Wypłata',
          date: new Date().toISOString()
        }
      ];

      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockOperations)
      });

      const { getByText } = renderWithContext(<Home />);

      // Available funds calculation:
      // Sales: 350 PLN (200 cash + 150 card)
      // Advances: 100 PLN
      // Operations: 200 PLN (300 - 100)
      // Total: 350 + 100 + 200 = 650 PLN

      await waitFor(() => {
        expect(getByText('💰 Dostępne środki w PLN: 650.00')).toBeTruthy();
      });

      await waitFor(() => {
        expect(getByText('Bilans operacji: +200 PLN')).toBeTruthy();
      });

      console.log('✅ Dostępne środki aktualizowane poprawnie: 650 PLN');
    });

    it('Powinien obsłużyć scenariusz z niewystarczającymi środkami przy odpisywaniu', async () => {
      // Mock no operations initially
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([])
      });

      const { getByText, getByPlaceholderText } = renderWithContext(<Home />);

      // Available funds: 350 (sales) + 100 (advances) = 450 PLN
      
      // Try to deduct more than available
      await waitFor(() => {
        fireEvent.press(getByText('Odpisz kwotę'));
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        const reasonInput = getByPlaceholderText('Wpisz powód odpisania kwoty...');
        
        fireEvent.changeText(amountInput, '500'); // More than 450 available
        fireEvent.changeText(reasonInput, 'Próba odpisania za dużej kwoty');
        
        fireEvent.press(getByText('Odpisz kwotę')); // Submit button
      });

      // Should show insufficient funds alert
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Niewystarczające środki',
          expect.stringContaining('Nie można odpisać 500 PLN')
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
          date: new Date().toISOString()
        }
      ];

      tokenService.authenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockOperations) // Initial fetch
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }) // Delete operation
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([]) // Fetch after delete
        });

      const { getByText } = renderWithContext(<Home />);

      // Wait for operation to be displayed
      await waitFor(() => {
        expect(getByText('1. Operacja do anulowania')).toBeTruthy();
      });

      // Click on options menu (⋮)
      const optionsButton = getByText('⋮');
      fireEvent.press(optionsButton);

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
          date: new Date().toISOString()
        },
        {
          _id: '2',
          userSymbol: 'P',
          amount: 100,
          currency: 'EUR',
          type: 'addition',
          reason: 'Wpłata EUR',
          date: new Date().toISOString()
        },
        {
          _id: '3',
          userSymbol: 'P',
          amount: -50,
          currency: 'EUR',
          type: 'deduction',
          reason: 'Wypłata EUR',
          date: new Date().toISOString()
        }
      ];

      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockMultiCurrencyOperations)
      });

      const { getByText } = renderWithContext(<Home />);

      await waitFor(() => {
        expect(getByText('Bilans operacji:')).toBeTruthy();
      });

      // Should show both currencies in balance
      await waitFor(() => {
        expect(getByText('+500 PLN')).toBeTruthy();
        expect(getByText('+50 EUR')).toBeTruthy(); // 100 - 50 = 50
      });

      console.log('✅ Obsługa wielu walut w bilansie działa poprawnie');
      console.log('   PLN: +500');
      console.log('   EUR: +50');
    });
  });

  describe('Error Handling Integration', () => {
    it('Powinien obsłużyć błąd sieci podczas dodawania operacji', async () => {
      tokenService.authenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([])
        })
        .mockRejectedValueOnce(new Error('Network error'));

      const { getByText, getByPlaceholderText } = renderWithContext(<Home />);

      await waitFor(() => {
        fireEvent.press(getByText('Dopisz kwotę'));
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        const reasonInput = getByPlaceholderText('Wpisz powód dopisania kwoty...');
        
        fireEvent.changeText(amountInput, '100');
        fireEvent.changeText(reasonInput, 'Test error');
        
        fireEvent.press(getByText('Dopisz kwotę'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Błąd', 'Nie udało się dopisać kwoty. Spróbuj ponownie.');
      });

      console.log('✅ Obsługa błędów sieci działa poprawnie');
    });

    it('Powinien obsłużyć fallback do starego endpointu', async () => {
      // Mock new endpoint failure, old endpoint success
      tokenService.authenticatedFetch
        .mockRejectedValueOnce(new Error('New endpoint not found')) // /financial-operations fails
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve([
            {
              _id: '1',
              userSymbol: 'P',
              amount: 200,
              currency: 'PLN',
              reason: '[DOPISANIE] Stara operacja',
              date: new Date().toISOString()
            }
          ])
        }); // /deductions fallback succeeds

      const { getByText } = renderWithContext(<Home />);

      await waitFor(() => {
        expect(getByText('Operacje dzisiaj:')).toBeTruthy();
        expect(getByText('1. [DOPISANIE] Stara operacja')).toBeTruthy();
      });

      console.log('✅ Fallback do starego endpointu działa poprawnie');
    });
  });
});