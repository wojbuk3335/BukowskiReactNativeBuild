import { act, cleanup, render, waitFor } from '@testing-library/react-native';
import React, { useContext } from 'react';
import { Text } from 'react-native';
import { GlobalStateContext, GlobalStateProvider } from '../../context/GlobalState';

// Mock fetch
global.fetch = jest.fn();

// Mock expo-router
jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
}));

// Test component to access context
const TestComponent = ({ onStateChange }) => {
  const context = useContext(GlobalStateContext);
  React.useEffect(() => {
    if (onStateChange) onStateChange(context);
  }, [context, onStateChange]);
  return <Text testID="test-component">Test</Text>;
};

describe('End-to-End Application Flow Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    jest.useFakeTimers();
    
    // Setup successful API responses for all endpoints
    fetch.mockImplementation((url) => {
      if (url.includes('/api/state')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ state_data: [{ barcode: '123', name: 'Test Item' }] })
        });
      }
      if (url.includes('/api/excel/size/get-all-sizes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ sizes: [{ id: 1, size: 'M' }] })
        });
      }
      if (url.includes('/api/excel/color/get-all-colors')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ colors: [{ id: 1, color: 'Red' }] })
        });
      }
      if (url.includes('/api/excel/goods/get-all-goods')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ goods: [{ id: 1, name: 'Good 1' }] })
        });
      }
      if (url.includes('/api/excel/stock/get-all-stocks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ stocks: [{ id: 1, quantity: 10 }] })
        });
      }
      return Promise.resolve({
        ok: false,
        status: 404
      });
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    cleanup();
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // NOTE: These tests have been updated to match the new behavior where
  // data is only loaded when Create tab is focused, not on app initialization

  test('should initialize context without automatic data loading', async () => {
    let contextState = null;
    const onStateChange = (state) => { contextState = state; };

    const { unmount } = render(
      <GlobalStateProvider>
        <TestComponent onStateChange={onStateChange} />
      </GlobalStateProvider>
    );

    // Wait for context to be available
    await waitFor(() => {
      expect(contextState).toBeTruthy();
    });

    // Verify initial state is empty (no automatic loading)
    expect(contextState.stateData).toEqual([]);
    expect(contextState.sizes).toEqual([]);
    expect(contextState.colors).toEqual([]);
    expect(contextState.goods).toEqual([]);
    expect(contextState.stocks).toEqual([]);

    // Verify no API calls were made during initialization
    expect(fetch).not.toHaveBeenCalled();

    unmount();
  });

  test('should handle data fetching when manually triggered', async () => {
    let contextState = null;
    const onStateChange = (state) => { contextState = state; };

    const { unmount } = render(
      <GlobalStateProvider>
        <TestComponent onStateChange={onStateChange} />
      </GlobalStateProvider>
    );

    // Wait for context to be available
    await waitFor(() => {
      expect(contextState).toBeTruthy();
    });

    // Manually trigger data fetching (similar to Create tab behavior)
    await act(async () => {
      await contextState.fetchState();
      await contextState.fetchSizes();
      await contextState.fetchColors();
      await contextState.fetchGoods();
      await contextState.fetchStock();
    });

    // Verify data was loaded
    await waitFor(() => {
      expect(contextState.stateData).toHaveLength(1);
      expect(contextState.sizes).toHaveLength(1);
      expect(contextState.colors).toHaveLength(1);
      expect(contextState.goods).toHaveLength(1);
      expect(contextState.stocks).toHaveLength(1);
    });

    unmount();
  });

  test('should handle error scenarios and recovery when manually triggered', async () => {
    let contextState = null;
    const onStateChange = (state) => { contextState = state; };

    // Mock network failure
    fetch.mockImplementation((url) => {
      return Promise.reject(new Error('Network error'));
    });

    const { unmount } = render(
      <GlobalStateProvider>
        <TestComponent onStateChange={onStateChange} />
      </GlobalStateProvider>
    );

    // Wait for context to be available
    await waitFor(() => {
      expect(contextState).toBeTruthy();
    });

    // Test error handling in API calls
    await act(async () => {
      const result = await contextState.fetchState();
      expect(result).toEqual([]); // Should return empty array on error
    });

    // Verify fallback data is set
    expect(contextState.stateData).toEqual([]);

    unmount();
  });
});
