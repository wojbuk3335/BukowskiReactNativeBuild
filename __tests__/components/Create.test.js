import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import Create from '../../app/(tabs)/create';
import { GlobalStateContext } from '../../context/GlobalState';

// Mock expo-router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
  }),
}));

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => {
  const mockReact = require('react');
  return {
    useFocusEffect: (callback) => {
      mockReact.useEffect(() => {
        const cleanup = callback();
        return cleanup;
      }, []);
    },
    useIsFocused: () => true,
  };
});

// Mock QRScanner component
jest.mock('../../app/QRScanner', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockQRScanner(props) {
    return React.createElement(Text, { testID: 'qr-scanner' }, 'QR Scanner Mock');
  };
});

// Mock fetch globally
global.fetch = jest.fn();

describe('Create Tab Component', () => {
  let mockContext;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    global.fetch.mockClear();

    // Mock context functions
    mockContext = {
      stateData: [],
      user: { id: 1, name: 'Test User', location: 'Warszawa' },
      users: [],
      sizes: [],
      colors: [],
      goods: [],
      stocks: [],
      fetchSizes: jest.fn(),
      fetchColors: jest.fn(),
      fetchGoods: jest.fn(),
      fetchStock: jest.fn(),
      fetchState: jest.fn(),
      fetchUsers: jest.fn(),
      getFilteredSellingPoints: jest.fn(() => []),
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Data Fetching on Tab Focus', () => {
    test('should fetch all required data when tab is focused', async () => {
      // Mock successful API responses
      const mockSizesResponse = { sizes: [{ id: 1, name: 'S' }, { id: 2, name: 'M' }] };
      const mockColorsResponse = { colors: [{ id: 1, name: 'Czarny' }, { id: 2, name: 'Brązowy' }] };
      const mockGoodsResponse = { goods: [{ id: 1, name: 'Kurtka skórzana' }] };
      const mockStocksResponse = { stocks: [{ id: 1, quantity: 10 }] };
      const mockStateResponse = [{ id: 1, barcode: '1234567890' }];

      // Mock fetch functions to return arrays (simulating successful data extraction)
      mockContext.fetchSizes.mockResolvedValue(mockSizesResponse.sizes);
      mockContext.fetchColors.mockResolvedValue(mockColorsResponse.colors);
      mockContext.fetchGoods.mockResolvedValue(mockGoodsResponse.goods);
      mockContext.fetchStock.mockResolvedValue(mockStocksResponse.stocks);
      mockContext.fetchState.mockResolvedValue(mockStateResponse);
      mockContext.fetchUsers.mockResolvedValue([]);

      const MockContextProvider = ({ children }) => (
        <GlobalStateContext.Provider value={mockContext}>
          {children}
        </GlobalStateContext.Provider>
      );

      render(
        <MockContextProvider>
          <Create />
        </MockContextProvider>
      );

      // Wait for component to mount and fetch data
      await waitFor(() => {
        expect(mockContext.fetchSizes).toHaveBeenCalledTimes(1);
        expect(mockContext.fetchColors).toHaveBeenCalledTimes(1);
        expect(mockContext.fetchGoods).toHaveBeenCalledTimes(1);
        expect(mockContext.fetchStock).toHaveBeenCalledTimes(1);
        expect(mockContext.fetchState).toHaveBeenCalledTimes(1);
      }, { timeout: 3000 });
    });

    test('should show loading screen while fetching data', async () => {
      // Mock functions that take some time to resolve
      mockContext.fetchSizes.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 200)));
      mockContext.fetchColors.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 200)));
      mockContext.fetchGoods.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 200)));
      mockContext.fetchStock.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 200)));
      mockContext.fetchState.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 200)));
      mockContext.fetchUsers.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve([]), 200)));

      const MockContextProvider = ({ children }) => (
        <GlobalStateContext.Provider value={mockContext}>
          {children}
        </GlobalStateContext.Provider>
      );

      const { getByText, queryByTestId } = render(
        <MockContextProvider>
          <Create />
        </MockContextProvider>
      );

      // Wait a small amount for component to mount and loading to start
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should show loading text
      expect(getByText('Pobieranie danych z backendu...')).toBeTruthy();
      
      // Should not show QR Scanner while loading
      expect(queryByTestId('qr-scanner')).toBeNull();

      // Wait for loading to complete
      await waitFor(() => {
        expect(queryByTestId('qr-scanner')).toBeTruthy();
      }, { timeout: 2000 });
    });

    test('should show QR Scanner after successful data fetch', async () => {
      // Mock successful responses
      mockContext.fetchSizes.mockResolvedValue([]);
      mockContext.fetchColors.mockResolvedValue([]);
      mockContext.fetchGoods.mockResolvedValue([]);
      mockContext.fetchStock.mockResolvedValue([]);
      mockContext.fetchState.mockResolvedValue([]);

      const MockContextProvider = ({ children }) => (
        <GlobalStateContext.Provider value={mockContext}>
          {children}
        </GlobalStateContext.Provider>
      );

      const { getByTestId } = render(
        <MockContextProvider>
          <Create />
        </MockContextProvider>
      );

      // Wait for QR Scanner to appear
      await waitFor(() => {
        expect(getByTestId('qr-scanner')).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Error Handling', () => {
    test('should show error modal when data fetch fails', async () => {
      // Mock failed API responses
      mockContext.fetchSizes.mockRejectedValue(new Error('Network error'));
      mockContext.fetchColors.mockRejectedValue(new Error('Network error'));
      mockContext.fetchGoods.mockRejectedValue(new Error('Network error'));
      mockContext.fetchStock.mockRejectedValue(new Error('Network error'));
      mockContext.fetchState.mockRejectedValue(new Error('Network error'));
      mockContext.fetchUsers.mockRejectedValue(new Error('Network error'));

      const MockContextProvider = ({ children }) => (
        <GlobalStateContext.Provider value={mockContext}>
          {children}
        </GlobalStateContext.Provider>
      );

      const { getByText } = render(
        <MockContextProvider>
          <Create />
        </MockContextProvider>
      );

      // Wait for error modal to appear
      await waitFor(() => {
        expect(getByText('Błąd połączenia')).toBeTruthy();
        expect(getByText('Nie można pobrać danych z backendu. Sprawdź połączenie internetowe i spróbuj ponownie.')).toBeTruthy();
      }, { timeout: 3000 });
    });

    test('should allow retry when error occurs', async () => {
      // Mock initial failure, then success
      let callCount = 0;
      const mockFailThenSuccess = () => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve([]);
      };

      mockContext.fetchSizes.mockImplementation(mockFailThenSuccess);
      mockContext.fetchColors.mockImplementation(mockFailThenSuccess);
      mockContext.fetchGoods.mockImplementation(mockFailThenSuccess);
      mockContext.fetchStock.mockImplementation(mockFailThenSuccess);
      mockContext.fetchState.mockImplementation(mockFailThenSuccess);
      mockContext.fetchUsers.mockImplementation(mockFailThenSuccess);

      const MockContextProvider = ({ children }) => (
        <GlobalStateContext.Provider value={mockContext}>
          {children}
        </GlobalStateContext.Provider>
      );

      const { getByText, getByTestId, queryByText } = render(
        <MockContextProvider>
          <Create />
        </MockContextProvider>
      );

      // Wait for error modal
      await waitFor(() => {
        expect(getByText('Błąd połączenia')).toBeTruthy();
      }, { timeout: 3000 });

      // Click retry button
      const retryButton = getByText('Spróbuj ponownie');
      fireEvent.press(retryButton);

      // Wait for retry to succeed and modal to disappear
      await waitFor(() => {
        expect(queryByText('Błąd połączenia')).toBeNull();
        expect(getByTestId('qr-scanner')).toBeTruthy();
      }, { timeout: 3000 });

      // Verify functions were called twice (initial + retry)
      expect(mockContext.fetchSizes).toHaveBeenCalledTimes(2);
    });
  });
});
