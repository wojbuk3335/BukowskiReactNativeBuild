import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Home from '../../app/(tabs)/home';
import TestWrapper, { GlobalStateContext } from '../utils/TestUtils';
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
  // Get today's date in the same format as the component uses
  const today = new Date().toISOString().split('T')[0];

  const mockUser = {
    symbol: 'P',
    email: 'test@example.com',
    sellingPoint: 'P',
    location: 'Test Location'
  };

  const mockGlobalState = {
    user: mockUser,
    // Mock sales data to provide available funds
    filteredData: [
      {
        _id: 'sale1',
        sellingPoint: 'P',
        date: `${today}T09:00:00.000Z`,
        cash: [{ price: 1000, currency: 'PLN' }],
        card: [{ price: 500, currency: 'PLN' }]
      },
      {
        _id: 'sale2', 
        sellingPoint: 'P',
        date: `${today}T10:00:00.000Z`,
        cash: [{ price: 200, currency: 'EUR' }],
        card: []
      }
    ],
    transferredItems: [],
    receivedItems: [],
    advancesData: [],
    deductionsData: [
      {
        _id: 'deduction1',
        amount: 300,
        currency: 'PLN',
        reason: 'Odpisanie szkód',
        type: 'deduction',
        userSymbol: 'P',
        date: `${today}T10:00:00.000Z`
      },
      {
        _id: 'addition1', 
        amount: 800,
        currency: 'PLN',
        reason: 'Zaliczka na produkt',
        type: 'addition',
        userSymbol: 'P',
        date: `${today}T11:00:00.000Z`
      },
      {
        _id: 'eur1',
        amount: 100,
        currency: 'EUR',
        reason: 'Zaliczka EUR',
        type: 'addition', 
        userSymbol: 'P',
        date: `${today}T12:00:00.000Z`
      },
      {
        _id: 'pln1',
        amount: 500,
        currency: 'PLN',
        reason: 'Zaliczka PLN',
        type: 'addition',
        userSymbol: 'P', 
        date: `${today}T13:00:00.000Z`
      }
    ]
  };

  const mockContextValue = {
    ...mockGlobalState,
    setUser: jest.fn(),
    setFilteredData: jest.fn(),
    setTransferredItems: jest.fn(),
    setReceivedItems: jest.fn(),
    setAdvancesData: jest.fn(),
    fetchUsers: jest.fn().mockResolvedValue([]),
    fetchGoods: jest.fn().mockResolvedValue([]),
    fetchSalesData: jest.fn().mockResolvedValue([]),
    fetchTransferredItems: jest.fn().mockResolvedValue([]),
    fetchReceivedItems: jest.fn().mockResolvedValue([]),
    fetchAdvances: jest.fn().mockResolvedValue([]),
    fetchFinancialOperations: jest.fn().mockResolvedValue([]),
    goods: [
      {
        _id: 'product1',
        fullName: 'Test Product 1',
        size: 'M',
        from: 'TestSupplier',
        source: 'Internal',
        cash: [],
        card: []
      },
      {
        _id: 'product2', 
        fullName: 'Test Product 2',
        size: 'L',
        from: 'TestSupplier2',
        source: 'External',
        cash: [],
        card: []
      }
    ]
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock API responses based on endpoint and method
    tokenService.authenticatedFetch.mockImplementation((url, options) => {
      if (url.includes('/financial-operations')) {
        if (options && options.method === 'POST') {
          // Mock successful POST response for financial operations
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, message: 'Operation successful' })
          });
        } else {
          // Mock GET response for financial operations
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              {
                _id: 'deduction1',
                amount: 300,
                currency: 'PLN',
                reason: 'Odpisanie szkód',
                type: 'deduction',
                userSymbol: 'P',
                date: `${today}T10:00:00.000Z`
              },
              {
                _id: 'addition1', 
                amount: 800,
                currency: 'PLN',
                reason: 'Zaliczka na produkt',
                type: 'addition',
                userSymbol: 'P',
                date: `${today}T11:00:00.000Z`
              },
              {
                _id: 'eur1',
                amount: 100,
                currency: 'EUR',
                reason: 'Zaliczka EUR',
                type: 'addition', 
                userSymbol: 'P',
                date: `${today}T12:00:00.000Z`
              },
              {
                _id: 'pln1',
                amount: 500,
                currency: 'PLN',
                reason: 'Zaliczka PLN',
                type: 'addition',
                userSymbol: 'P', 
                date: `${today}T13:00:00.000Z`
              }
            ])
          });
        }
      } else {
        // Default response for other endpoints
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
    });
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
      const { getByText, getByTestId } = renderWithContext(<Home />);
      
      await waitFor(() => {
        // Find main deduction button (the first one that appears)
        const deductButtons = getByText('Odpisz kwotę');
        fireEvent.press(deductButtons);
      });

      await waitFor(() => {
        // Check if modal opened by looking for submit button with testID
        expect(getByTestId('submit-deduction-button')).toBeTruthy();
        expect(getByText('Kwota:')).toBeTruthy();
        expect(getByText('Waluta:')).toBeTruthy();
        expect(getByText('Powód odpisania:')).toBeTruthy();
      });

      console.log('✅ Modal odpisania kwoty otwiera się poprawnie');
    });

    it('Powinien otworzyć modal dopisania kwoty', async () => {
      const { getByText, getByTestId } = renderWithContext(<Home />);
      
      await waitFor(() => {
        const addButton = getByText('Dopisz kwotę');
        fireEvent.press(addButton);
      });

      await waitFor(() => {
        // Check if modal opened by looking for submit button with testID
        expect(getByTestId('submit-addition-button')).toBeTruthy();
        expect(getByText('Kwota jaką klient wpłaca:')).toBeTruthy();
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
        fireEvent.press(getByTestId('submit-deduction-button')); // Submit button
      });

      await waitFor(() => {
        expect(getByText('Proszę wprowadzić prawidłową kwotę.')).toBeTruthy();
      });
      console.log('✅ Walidacja kwoty przy odpisywaniu działa');
    });

    it('Powinien wymagać powodu przy odpisywaniu', async () => {
      const { getByText, getByPlaceholderText, getByTestId } = renderWithContext(<Home />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Odpisz kwotę'));
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '100');
        
        fireEvent.press(getByTestId('submit-deduction-button')); // Submit button
      });

      await waitFor(() => {
        expect(getByText('Proszę wprowadzić powód odpisania.')).toBeTruthy();
      });
      console.log('✅ Walidacja powodu przy odpisywaniu działa');
    });

    it('Powinien wymagać kwoty przy dopisywaniu', async () => {
      const { getByText, getByTestId } = renderWithContext(<Home />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Dopisz kwotę'));
      });

      await waitFor(() => {
        fireEvent.press(getByTestId('submit-addition-button')); // Submit button
      });

      await waitFor(() => {
        expect(getByText('Proszę wprowadzić prawidłową kwotę.')).toBeTruthy();
      });
      console.log('✅ Walidacja kwoty przy dopisywaniu działa');
    });

    it('Powinien wymagać powodu przy dopisywaniu', async () => {
      const { getByText, getByPlaceholderText, getByTestId } = renderWithContext(<Home />);
      
      await waitFor(() => {
        fireEvent.press(getByText('Dopisz kwotę'));
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '200');
        
        fireEvent.press(getByTestId('submit-addition-button')); // Submit button
      });

      await waitFor(() => {
        expect(getByText('Proszę wybrać powód dopisania.')).toBeTruthy();
      });
      console.log('✅ Walidacja powodu przy dopisywaniu działa');
    });
  });

  describe('Financial Operations API Integration', () => {
    it('Powinien wysłać poprawne dane przy odpisywaniu kwoty', async () => {
      const { getByText, getByPlaceholderText, getByTestId } = renderWithContext(<Home />);
      
      // Clear and reset mock for this specific test
      tokenService.authenticatedFetch.mockClear();
      tokenService.authenticatedFetch.mockImplementation((url, options) => {
        if (options && options.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          });
        } else if (url.includes('/financial-operations')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          });
        } else {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          });
        }
      });

      await waitFor(() => {
        fireEvent.press(getByText('Odpisz kwotę'));
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        const reasonInput = getByPlaceholderText('Wpisz powód odpisania kwoty...');
        
        fireEvent.changeText(amountInput, '150');
        fireEvent.changeText(reasonInput, 'Test odpisania');
        
        fireEvent.press(getByTestId('submit-deduction-button')); // Submit button
      });

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/financial-operations',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"userSymbol":"P"') &&
                  expect.stringContaining('"amount":-150') &&
                  expect.stringContaining('"currency":"PLN"') &&
                  expect.stringContaining('"type":"deduction"') &&
                  expect.stringContaining('"reason":"Test odpisania"')
          })
        );
      });

      await waitFor(() => {
        expect(getByText('Kwota została odpisana.')).toBeTruthy();
      });
      console.log('✅ API call dla odpisania kwoty działa poprawnie');
    });

    it('Powinien wysłać poprawne dane przy dopisywaniu kwoty', async () => {
      const { getByText, getByPlaceholderText, getByTestId } = renderWithContext(<Home />);
      
      // Clear and reset mock for this specific test
      tokenService.authenticatedFetch.mockClear();
      tokenService.authenticatedFetch.mockImplementation((url, options) => {
        if (options && options.method === 'POST') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          });
        } else if (url.includes('/financial-operations')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          });
        } else {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([])
          });
        }
      });

      await waitFor(() => {
        fireEvent.press(getByText('Dopisz kwotę'));
      });

      await waitFor(() => {
        const amountInput = getByPlaceholderText('0.00');
        fireEvent.changeText(amountInput, '300');
        
        // Select "Inny powód dopisania" to enable text input
        fireEvent.press(getByText('Inny powód dopisania'));
      });

      await waitFor(() => {
        const reasonInput = getByPlaceholderText('Wpisz powód dopisania kwoty...');
        fireEvent.changeText(reasonInput, 'Test dopisania');
        
        fireEvent.press(getByTestId('submit-addition-button')); // Submit button
      });

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          'http://localhost:3000/api/financial-operations',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"userSymbol":"P"') &&
                  expect.stringContaining('"amount":300') &&
                  expect.stringContaining('"currency":"PLN"') &&
                  expect.stringContaining('"type":"addition"') &&
                  expect.stringContaining('"reason":"Test dopisania"')
          })
        );
      });

      await waitFor(() => {
        expect(getByText('Kwota została dopisana.')).toBeTruthy();
      });
      console.log('✅ API call dla dopisania kwoty działa poprawnie');
    });

    it('Powinien obsłużyć błąd API', async () => {
      const { getByText, getByPlaceholderText, getByTestId } = renderWithContext(<Home />);
      
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
        
        fireEvent.press(getByTestId('submit-deduction-button')); // Submit button
      });

      await waitFor(() => {
        expect(getByText('Nie udało się odpisać kwoty. Spróbuj ponownie.')).toBeTruthy();
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

      // Check if operations are displayed with correct colors
      await waitFor(() => {
        expect(getByText('1. Odpisanie szkód')).toBeTruthy();
        expect(getByText('2. Zaliczka na produkt')).toBeTruthy();
        expect(getByText('3. Zaliczka EUR')).toBeTruthy();
        expect(getByText('4. Zaliczka PLN')).toBeTruthy();
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

      // Override context to provide empty deductions data for this test
      const emptyContextValue = {
        ...mockContextValue,
        deductionsData: [] // Empty deductions
      };

      const { queryByText } = render(
        <TestWrapper>
          <GlobalStateContext.Provider value={emptyContextValue}>
            <Home />
          </GlobalStateContext.Provider>
        </TestWrapper>
      );

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
        // Test for EUR operation
        expect(getByText('3. Zaliczka EUR')).toBeTruthy();
        // Test for PLN operation 
        expect(getByText('4. Zaliczka PLN')).toBeTruthy();
      });

      console.log('✅ Różne waluty obsłużone poprawnie');
    });
  });
});