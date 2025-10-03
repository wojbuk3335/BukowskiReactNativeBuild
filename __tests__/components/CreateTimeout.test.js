import { fireEvent, render, waitFor } from '@testing-library/react-native';
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

describe('Create Tab - Timeout Tests', () => {
  let mockContext;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock context functions
    mockContext = {
      stateData: [],
      user: { id: 1, name: 'Test User', location: 'Warszawa' },
      users: [],
      sizes: [],
      colors: [],
      goods: [],
      stocks: [],
      bags: [],
      fetchSizes: jest.fn(),
      fetchColors: jest.fn(),
      fetchGoods: jest.fn(),
      fetchStock: jest.fn(),
      fetchState: jest.fn(),
      fetchUsers: jest.fn(),
      fetchBags: jest.fn(),
      getFilteredSellingPoints: jest.fn(() => []),
    };

    // Use real timers for timeout tests since Promise.race + setTimeout behavior is complex with fake timers
    jest.useRealTimers();
  });

  afterEach(() => {
    // Clean up all mocks
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('10 Second Timeout Handling', () => {
    test('should show timeout error modal after 10 seconds when backend does not respond', async () => {
      // Mock functions that never resolve (simulating no backend response)
      const neverResolvePromise = () => new Promise(() => {}); // Promise that never resolves
      
      mockContext.fetchSizes.mockImplementation(neverResolvePromise);
      mockContext.fetchColors.mockImplementation(neverResolvePromise);
      mockContext.fetchGoods.mockImplementation(neverResolvePromise);
      mockContext.fetchStock.mockImplementation(neverResolvePromise);
      mockContext.fetchState.mockImplementation(neverResolvePromise);
      mockContext.fetchUsers.mockImplementation(neverResolvePromise);
      mockContext.fetchBags.mockImplementation(neverResolvePromise);

      const MockContextProvider = ({ children }) => (
        <GlobalStateContext.Provider value={mockContext}>
          {children}
        </GlobalStateContext.Provider>
      );

      const { getByText, queryByText } = render(
        <MockContextProvider>
          <Create />
        </MockContextProvider>
      );

      // Initially should show loading
      expect(getByText('Pobieranie danych z backendu...')).toBeTruthy();
      
      // Wait for timeout error to appear (should happen after 10 seconds)
      await waitFor(() => {
        expect(getByText('Błąd połączenia')).toBeTruthy();
        expect(getByText('Backend nie odpowiada. Upłynął limit czasu 10 sekund. Sprawdź połączenie internetowe i spróbuj ponownie.')).toBeTruthy();
      }, { timeout: 12000 }); // Wait up to 12 seconds for the 10 second timeout to trigger

      // Loading should be finished
      expect(queryByText('Pobieranie danych z backendu...')).toBeNull();
    }, 15000); // Set Jest test timeout to 15 seconds

    test('should not show timeout error if backend responds before 10 seconds', async () => {
      // Mock functions that resolve quickly (before timeout)
      const quickResolve = () => Promise.resolve([]);
      
      mockContext.fetchSizes.mockImplementation(quickResolve);
      mockContext.fetchColors.mockImplementation(quickResolve);
      mockContext.fetchGoods.mockImplementation(quickResolve);
      mockContext.fetchStock.mockImplementation(quickResolve);
      mockContext.fetchState.mockImplementation(quickResolve);
      mockContext.fetchUsers.mockImplementation(quickResolve);
      mockContext.fetchBags.mockImplementation(quickResolve);

      const MockContextProvider = ({ children }) => (
        <GlobalStateContext.Provider value={mockContext}>
          {children}
        </GlobalStateContext.Provider>
      );

      const { getByText, queryByText, getByTestId } = render(
        <MockContextProvider>
          <Create />
        </MockContextProvider>
      );

      // Initially should show loading
      expect(getByText('Pobieranie danych z backendu...')).toBeTruthy();
      
      // Wait for successful completion (should happen quickly)
      await waitFor(() => {
        expect(getByTestId('qr-scanner')).toBeTruthy();
      }, { timeout: 3000 });

      // Should not show timeout error
      expect(queryByText('Backend nie odpowiada. Upłynął limit czasu 10 sekund. Sprawdź połączenie internetowe i spróbuj ponownie.')).toBeNull();
      expect(queryByText('Pobieranie danych z backendu...')).toBeNull();
    });

    test('should show correct timeout message vs regular error message', async () => {
      // Test 1: Timeout scenario
      const neverResolvePromise = () => new Promise(() => {});
      
      mockContext.fetchSizes.mockImplementation(neverResolvePromise);
      mockContext.fetchColors.mockImplementation(neverResolvePromise);
      mockContext.fetchGoods.mockImplementation(neverResolvePromise);
      mockContext.fetchStock.mockImplementation(neverResolvePromise);
      mockContext.fetchState.mockImplementation(neverResolvePromise);
      mockContext.fetchUsers.mockImplementation(neverResolvePromise);
      mockContext.fetchBags.mockImplementation(neverResolvePromise);

      const MockContextProvider = ({ children }) => (
        <GlobalStateContext.Provider value={mockContext}>
          {children}
        </GlobalStateContext.Provider>
      );

      const { getByText, unmount } = render(
        <MockContextProvider>
          <Create />
        </MockContextProvider>
      );

      // Wait for timeout error to appear (should happen after 10 seconds)
      await waitFor(() => {
        expect(getByText('Backend nie odpowiada. Upłynął limit czasu 10 sekund. Sprawdź połączenie internetowe i spróbuj ponownie.')).toBeTruthy();
      }, { timeout: 12000 });

      unmount();

      // Test 2: Regular error scenario
      mockContext.fetchSizes.mockRejectedValue(new Error('Network error'));
      mockContext.fetchColors.mockRejectedValue(new Error('Network error'));
      mockContext.fetchGoods.mockRejectedValue(new Error('Network error'));
      mockContext.fetchStock.mockRejectedValue(new Error('Network error'));
      mockContext.fetchState.mockRejectedValue(new Error('Network error'));

      const { getByText: getByText2 } = render(
        <MockContextProvider>
          <Create />
        </MockContextProvider>
      );

      await waitFor(() => {
        expect(getByText2('Nie można pobrać danych z backendu. Sprawdź połączenie internetowe i spróbuj ponownie.')).toBeTruthy();
      });
    }, 15000); // Set Jest test timeout to 15 seconds

    test('should allow retry after timeout error', async () => {
      // Mock initial timeout, then success on retry
      let isFirstCall = true;
      const mockTimeoutThenSuccess = () => {
        if (isFirstCall) {
          return new Promise(() => {}); // Never resolves (timeout)
        }
        return Promise.resolve([]); // Success on retry
      };

      mockContext.fetchSizes.mockImplementation(mockTimeoutThenSuccess);
      mockContext.fetchColors.mockImplementation(mockTimeoutThenSuccess);
      mockContext.fetchGoods.mockImplementation(mockTimeoutThenSuccess);
      mockContext.fetchStock.mockImplementation(mockTimeoutThenSuccess);
      mockContext.fetchState.mockImplementation(mockTimeoutThenSuccess);
      mockContext.fetchUsers.mockImplementation(mockTimeoutThenSuccess);
      mockContext.fetchBags.mockImplementation(mockTimeoutThenSuccess);

      const MockContextProvider = ({ children }) => (
        <GlobalStateContext.Provider value={mockContext}>
          {children}
        </GlobalStateContext.Provider>
      );

      const { getByText, queryByText, getByTestId } = render(
        <MockContextProvider>
          <Create />
        </MockContextProvider>
      );

      // Wait for timeout error
      await waitFor(() => {
        expect(getByText('Backend nie odpowiada. Upłynął limit czasu 10 sekund. Sprawdź połączenie internetowe i spróbuj ponownie.')).toBeTruthy();
      }, { timeout: 12000 });

      // Set flag for retry success
      isFirstCall = false;

      // Click retry button
      const retryButton = getByText('Spróbuj ponownie');
      fireEvent.press(retryButton);

      // Wait for retry to succeed
      await waitFor(() => {
        expect(queryByText('Błąd połączenia')).toBeNull();
        expect(getByTestId('qr-scanner')).toBeTruthy();
      }, { timeout: 3000 });
    }, 20000); // Set Jest test timeout to 20 seconds
  });
});
