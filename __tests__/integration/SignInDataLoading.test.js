import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import SignIn from '../../app/(auth)/sign-in';
import { GlobalStateProvider } from '../../context/GlobalState';

// Mock fetch globally
global.fetch = jest.fn();

// Mock expo-router
jest.mock('expo-router', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  router: {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
}));

// Mock image imports
jest.mock('../../app/(auth)/bukowski.png', () => 'mock-bukowski-logo');

describe('SignIn Integration Tests - API Data Loading', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
    fetch.mockClear();
    AsyncStorage.getItem.mockClear();
    AsyncStorage.setItem.mockClear();
    router.replace.mockClear();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('should complete login successfully without automatic data loading', async () => {
    // Mock successful login
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };

    // Setup fetch mock for login endpoint only
    fetch.mockImplementation((url) => {
      if (url.includes('/api/user/login')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUser),
        });
      }
      // No other API calls should be made during login
      return Promise.reject(new Error('Unexpected API call during login: ' + url));
    });

    // Mock AsyncStorage to return null (no stored user)
    AsyncStorage.getItem.mockResolvedValue(null);

    const { getByText, getAllByTestId } = render(
      <GlobalStateProvider>
        <SignIn />
      </GlobalStateProvider>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(getByText('Zologuj się')).toBeTruthy();
    });

    // Find input fields using testID - should have 2 inputs (email and password)
    const inputs = getAllByTestId('text-input');
    expect(inputs).toHaveLength(2);
    
    const emailInput = inputs[0]; // First input is email
    const passwordInput = inputs[1]; // Second input is password
    
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');

    // Find and click login button
    const loginButton = getByText('Zologuj się');
    fireEvent.press(loginButton);

    // Wait for login API call
    await waitFor(() => {
      const { API_CONFIG } = require('../../config/api');
      expect(fetch).toHaveBeenCalledWith(`${API_CONFIG.BASE_URL.replace(/\/$/, '')}/user/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
      });
    });

    // Verify ONLY login API call was made (no automatic data loading)
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Verify user data was saved to AsyncStorage
    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
    });

    // Verify navigation to home
    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/home');
    });
  });

  test('should handle login API errors gracefully without data fetching', async () => {
    // Mock failed login
    fetch.mockImplementation((url) => {
      if (url.includes('/api/user/login')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ message: 'Invalid credentials' }),
        });
      }
      // No other API calls should be made during failed login
      return Promise.reject(new Error('Unexpected API call during failed login: ' + url));
    });

    AsyncStorage.getItem.mockResolvedValue(null);

    const { getByText, getAllByTestId, queryByText } = render(
      <GlobalStateProvider>
        <SignIn />
      </GlobalStateProvider>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(getByText('Zologuj się')).toBeTruthy();
    });

    // Fill form and submit
    const inputs = getAllByTestId('text-input');
    const emailInput = inputs[0];
    fireEvent.changeText(emailInput, 'test@example.com');

    const loginButton = getByText('Zologuj się');
    fireEvent.press(loginButton);

    // Wait for login API call to complete
    await waitFor(() => {
      const { API_CONFIG } = require('../../config/api');
      expect(fetch).toHaveBeenCalledWith(`${API_CONFIG.BASE_URL.replace(/\/$/, '')}/user/login`, expect.any(Object));
    });

    // Verify only login API call was made
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    // Verify error state - login should fail and no navigation occurs
    expect(router.replace).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test('should restore user session and skip API loading if user already stored', async () => {
    // Mock stored user data
    const storedUser = { id: 1, email: 'stored@example.com', name: 'Stored User' };
    AsyncStorage.getItem.mockResolvedValue(JSON.stringify(storedUser));

    render(
      <GlobalStateProvider>
        <SignIn />
      </GlobalStateProvider>
    );

    // Wait for AsyncStorage check and redirect
    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith('user');
      expect(router.replace).toHaveBeenCalledWith('/home');
    });

    // Verify no login API calls were made since user was already stored
    const loginCalls = fetch.mock.calls.filter(call => call[0].includes('/api/user/login'));
    expect(loginCalls).toHaveLength(0);
  });

  test('should handle network errors during login', async () => {
    // Mock network error
    fetch.mockImplementation((url) => {
      if (url.includes('/api/user/login')) {
        return Promise.reject(new Error('Network error'));
      }
      // For initial load calls
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    AsyncStorage.getItem.mockResolvedValue(null);

    const { getByText, getAllByTestId, queryByText } = render(
      <GlobalStateProvider>
        <SignIn />
      </GlobalStateProvider>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(getByText('Zologuj się')).toBeTruthy();
    });

    // Fill form and submit
    const inputs = getAllByTestId('text-input');
    const emailInput = inputs[0];
    fireEvent.changeText(emailInput, 'test@example.com');

    const loginButton = getByText('Zologuj się');
    fireEvent.press(loginButton);

    // Wait for error to appear
    await waitFor(() => {
      expect(queryByText('Logowanie nie powiodło się. Sprawdź swoje dane i spróbuj ponownie.')).toBeTruthy();
    });

    // Verify no redirection occurred
    expect(router.replace).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  test('should verify correct API endpoints are called with proper order', async () => {
    const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };
    
    // Track the order of API calls
    const apiCallOrder = [];

    fetch.mockImplementation((url) => {
      apiCallOrder.push(url);
      
      if (url.includes('/api/user/login')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockUser),
        });
      }
      // No other API calls should be made during login
      return Promise.reject(new Error('Unexpected API call during login: ' + url));
    });

    AsyncStorage.getItem.mockResolvedValue(null);

    const { getByText, getAllByTestId } = render(
      <GlobalStateProvider>
        <SignIn />
      </GlobalStateProvider>
    );

    await waitFor(() => {
      expect(getByText('Zologuj się')).toBeTruthy();
    });

    // Trigger login
    const inputs = getAllByTestId('text-input');
    const emailInput = inputs[0];
    fireEvent.changeText(emailInput, 'test@example.com');

    const loginButton = getByText('Zologuj się');
    fireEvent.press(loginButton);

    // Wait for only login API call to complete
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1); // Only login call
    });

    // Verify the login call was made
    const { API_CONFIG } = require('../../config/api');
    expect(apiCallOrder).toContain(`${API_CONFIG.BASE_URL.replace(/\/$/, '')}/user/login`);
    
    // Verify NO data fetching calls were made automatically after login
    expect(apiCallOrder).not.toContain(`${API_CONFIG.BASE_URL.replace(/\/$/, '')}/excel/stock/get-all-stocks`);
    expect(apiCallOrder).not.toContain(`${API_CONFIG.BASE_URL.replace(/\/$/, '')}/excel/color/get-all-colors`);
    expect(apiCallOrder).not.toContain(`${API_CONFIG.BASE_URL.replace(/\/$/, '')}/excel/size/get-all-sizes`);
    expect(apiCallOrder).not.toContain(`${API_CONFIG.BASE_URL.replace(/\/$/, '')}/state`);
    expect(apiCallOrder).not.toContain(`${API_CONFIG.BASE_URL.replace(/\/$/, '')}/excel/goods/get-all-goods`);
  });
});
