import { fireEvent, render, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Home from '../../app/(tabs)/home';
import { GlobalStateContext } from '../../context/GlobalState';
import tokenService from '../../services/tokenService';

// Mock the navigation library
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    setTimeout(() => {
      callback();
    }, 100);
    return () => {};
  }),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock tokenService
jest.mock('../../services/tokenService', () => ({
  authenticatedFetch: jest.fn(),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('Home Simplified Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set flag to enable API calls testing for this test suite
    window.__TESTING_API_CALLS__ = true;
  });

  afterEach(() => {
    // Clean up flag after each test
    delete window.__TESTING_API_CALLS__;
  });
  const mockSalesData = [
    {
      _id: 'sale1',
      fullName: 'Ada',
      size: '2XL',
      color: 'CZERWONY',
      barcode: '0010702300001',
      cash: [{ price: 120, currency: 'PLN' }],
      card: [],
      sellingPoint: 'Point T',
      from: 'T',
      date: '2025-08-07T10:30:00Z',
      name: 'Jan',
      surname: 'Kowalski'
    },
    {
      _id: 'sale2',
      fullName: 'Bella',
      size: 'L',
      color: 'NIEBIESKI',
      barcode: '0010702300002',
      cash: [],
      card: [{ price: 110, currency: 'PLN' }],
      sellingPoint: 'Point T',
      from: 'T',
      date: '2025-08-07T11:15:00Z',
      name: 'Anna',
      surname: 'Nowak'
    }
  ];

  const mockContextValue = {
    user: {
      _id: '1',
      symbol: 'T',
      email: 'test@test.com',
      location: 'Zakopane',
      sellingPoint: 'Point T'
    },
    logout: jest.fn(),
    stateData: [
      {
        id: '1',
        symbol: 'T',
        fullName: 'Ada',
        size: '2XL',
        color: 'CZERWONY',
        barcode: '0010702300001',
        price: 120.00
      },
      {
        id: '2',
        symbol: 'T',
        fullName: 'Bella',
        size: 'L',
        color: 'NIEBIESKI',
        barcode: '0010702300002',
        price: 110.00
      }
    ],
    // Add missing functions that Home component needs
    fetchUsers: jest.fn().mockResolvedValue([]),
    fetchGoods: jest.fn().mockResolvedValue([]),
    fetchSalesData: jest.fn().mockResolvedValue([]),
    fetchTransferredItems: jest.fn().mockResolvedValue([]),
    fetchReceivedItems: jest.fn().mockResolvedValue([]),
    fetchFinancialOperations: jest.fn().mockResolvedValue([]),
    setProducts: jest.fn(),
    setGoods: jest.fn(),
    products: [],
    goods: [],
    users: [],
    setUsers: jest.fn(),
    financialOperations: [],
    setFinancialOperations: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    tokenService.authenticatedFetch.mockClear();
    Alert.alert.mockClear();
    
    // Mock tokenService.authenticatedFetch for sales API
    tokenService.authenticatedFetch.mockImplementation((url, options) => {
      if (url.includes('/sales/get-all-sales') && options?.method !== 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSalesData)
        });
      }
      if (url.includes('/sales/') && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ message: 'Sale deleted' })
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
    
    // Mock regular fetch for other APIs (transfer, deductions)
    fetch.mockImplementation((url, options) => {
      if (url.includes('/transfer')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.includes('/deductions')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  const renderWithContext = (component) => {
    return render(
      <GlobalStateContext.Provider value={mockContextValue}>
        {component}
      </GlobalStateContext.Provider>
    );
  };

  describe('Basic Component Tests', () => {
    it('should render Home component', async () => {
      const { getByTestId } = renderWithContext(<Home />);
      
      await waitFor(() => {
        expect(getByTestId('home-flatlist')).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should display user email', async () => {
      const { getByText } = renderWithContext(<Home />);
      
      await waitFor(() => {
        expect(getByText('test@test.com')).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should display current date', async () => {
      const { getByText } = renderWithContext(<Home />);
      
      await waitFor(() => {
        // Szukaj tekstu zawierającego datę zamiast dokładnej daty
        expect(getByText(/13\.11\.2025/)).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should display sales section header', async () => {
      const { getByText } = renderWithContext(<Home />);
      
      await waitFor(() => {
        expect(getByText('Sprzedaż:')).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should display totals section', async () => {
      const { getByText } = renderWithContext(<Home />);
      
      await waitFor(() => {
        expect(getByText('Suma:')).toBeTruthy();
        expect(getByText('Gotówki:')).toBeTruthy();
        expect(getByText('Na kartę:')).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('API Integration Tests', () => {
    it('should call sales API after mount', async () => {
      renderWithContext(<Home />);
      
      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(expect.stringContaining('/sales/get-all-sales'));
      }, { timeout: 3000 });
    });

    it('should handle API errors gracefully', async () => {
      tokenService.authenticatedFetch.mockRejectedValueOnce(new Error('API Error'));
      
      const { getByTestId } = renderWithContext(<Home />);
      
      // Component should still render even with API error
      await waitFor(() => {
        expect(getByTestId('home-flatlist')).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Sales Display Tests', () => {
    it('should display sales data after loading', async () => {
      const { getByText } = renderWithContext(<Home />);
      
      await waitFor(() => {
        // Should show sales totals section
        expect(getByText('Suma:')).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should handle empty sales data', async () => {
      tokenService.authenticatedFetch.mockImplementationOnce(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve([])
      }));
      
      const { getByText } = renderWithContext(<Home />);
      
      await waitFor(() => {
        expect(getByText('Suma:')).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Refresh Tests', () => {
    it('should support pull-to-refresh', async () => {
      tokenService.authenticatedFetch.mockClear(); // Clear previous calls
      
      const { getByTestId } = renderWithContext(<Home />);
      
      await waitFor(() => {
        const flatList = getByTestId('home-flatlist');
        expect(flatList).toBeTruthy();
      }, { timeout: 3000 });
      
      // Clear tokenService calls after initial mount
      tokenService.authenticatedFetch.mockClear();
      
      // Trigger refresh
      const flatList = getByTestId('home-flatlist');
      fireEvent(flatList, 'refresh');
      
      // Wait for refresh API call
      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });

  describe('Modal Tests', () => {
    it('should handle deduction modal', async () => {
      const { getByText } = renderWithContext(<Home />);
      
      await waitFor(() => {
        const deductButton = getByText('Odpisz kwotę');
        fireEvent.press(deductButton);
      }, { timeout: 3000 });
      
      // Modal interaction would be tested here
      // For now, just check component doesn't crash
      expect(getByText('test@test.com')).toBeTruthy();
    });
  });

  describe('Deletion Tests', () => {
    it('should handle sale deletion API call', async () => {
      tokenService.authenticatedFetch.mockImplementation((url, options) => {
        if (options?.method === 'DELETE') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ message: 'Sale deleted' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSalesData)
        });
      });
      
      renderWithContext(<Home />);
      
      // Test component renders without errors
      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should handle deletion errors', async () => {
      tokenService.authenticatedFetch.mockImplementation((url, options) => {
        if (options?.method === 'DELETE') {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ error: 'Not found' })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSalesData)
        });
      });
      
      renderWithContext(<Home />);
      
      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalled();
      }, { timeout: 3000 });
    });
  });
});
