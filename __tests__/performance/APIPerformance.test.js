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

describe('API Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    jest.useFakeTimers();
    
    // Setup mock responses with minimal delay for performance testing
    fetch.mockImplementation((url) => {
      if (url.includes('/api/state')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            state_data: Array.from({ length: 100 }, (_, i) => ({
              barcode: `BC${i}`,
              name: `Item ${i}`,
              id: i
            }))
          })
        });
      } else if (url.includes('/api/excel/size/get-all-sizes')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            sizes: Array.from({ length: 10 }, (_, i) => ({
              id: i,
              size: ['XS', 'S', 'M', 'L', 'XL', 'XXL'][i % 6]
            }))
          })
        });
      } else if (url.includes('/api/excel/color/get-all-colors')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            colors: Array.from({ length: 20 }, (_, i) => ({
              id: i,
              color: `Color${i}`,
              hex: `#${Math.floor(Math.random()*16777215).toString(16)}`
            }))
          })
        });
      } else if (url.includes('/api/excel/goods/get-all-goods')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            goods: Array.from({ length: 50 }, (_, i) => ({
              id: i,
              name: `Product ${i}`,
              category: `Category${i % 5}`
            }))
          })
        });
      } else if (url.includes('/api/excel/stock/get-all-stocks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            stocks: Array.from({ length: 200 }, (_, i) => ({
              id: i,
              productId: i % 50,
              quantity: Math.floor(Math.random() * 100),
              warehouse: `WH${i % 3}`
            }))
          })
        });
      } else if (url.includes('/api/user/login')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            user: { id: 1, email: 'test@example.com', name: 'Test User' },
            token: 'mock-token'
          })
        });
      } else {
        return Promise.resolve({
          ok: false,
          status: 404
        });
      }
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    cleanup();
    // Clear any lingering timers
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('should handle API response times efficiently', async () => {
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

    const startTime = Date.now();
    
    await act(async () => {
      await contextState.fetchState();
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time
    expect(duration).toBeLessThan(500); // 500ms max for single API call
    expect(contextState.stateData).toHaveLength(100);

    unmount();
  });

  test('should handle concurrent API requests efficiently', async () => {
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

    // Clear fetch calls from initialization
    fetch.mockClear();

    const startTime = Date.now();
    
    // Test concurrent loading of all APIs
    await act(async () => {
      await Promise.all([
        contextState.fetchState(),
        contextState.fetchSizes(),
        contextState.fetchColors(),
        contextState.fetchGoods(),
        contextState.fetchStock()
      ]);
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Concurrent requests should be efficient
    expect(duration).toBeLessThan(1000); // Should complete all 5 APIs within 1 second
    
    // Verify all data was loaded
    await waitFor(() => {
      expect(contextState.stateData).toHaveLength(100);
      expect(contextState.sizes).toHaveLength(10);
      expect(contextState.colors).toHaveLength(20);
      expect(contextState.goods).toHaveLength(50);
      expect(contextState.stocks).toHaveLength(200);
    });
    
    // Verify all API endpoints were called (after clearing initialization calls)
    expect(fetch).toHaveBeenCalledTimes(5);

    unmount();
  });

  test('should handle large dataset operations efficiently', async () => {
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

    // Load large dataset
    await act(async () => {
      await contextState.fetchStock(); // 200 items
    });

    const startTime = Date.now();
    
    // Test performance of operations on large dataset
    const filteredItems = contextState.stocks.filter(item => 
      item.warehouse && item.warehouse.includes('WH')
    );
    
    const endTime = Date.now();
    const processingTime = endTime - startTime;
    
    // Large dataset operations should be fast
    expect(processingTime).toBeLessThan(50); // 50ms max for filtering 200 items
    expect(filteredItems.length).toBeGreaterThan(0);

    unmount();
  });

  test('should handle memory usage efficiently during multiple operations', async () => {
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

    // Test multiple sequential operations
    const startTime = Date.now();
    
    // Perform multiple rounds of API calls
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await Promise.all([
          contextState.fetchState(),
          contextState.fetchSizes(),
          contextState.fetchColors()
        ]);
      });
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    // Multiple operations should complete efficiently
    expect(totalTime).toBeLessThan(2000); // 2 seconds max for 3 rounds of 3 API calls each
    
    // Verify final state integrity
    expect(contextState.stateData).toHaveLength(100);
    expect(contextState.sizes).toHaveLength(10);
    expect(contextState.colors).toHaveLength(20);

    unmount();
  });

  test('should handle error scenarios with minimal performance impact', async () => {
    // Setup some failing requests
    fetch.mockImplementation((url) => {
      if (url.includes('/api/state')) {
        return Promise.reject(new Error('Network error'));
      }
      return Promise.resolve({
        ok: false,
        status: 500
      });
    });

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

    const startTime = Date.now();
    
    // Test error handling performance
    await act(async () => {
      await Promise.all([
        contextState.fetchState(),
        contextState.fetchSizes(),
        contextState.fetchColors(),
        contextState.fetchGoods(),
        contextState.fetchStock()
      ]);
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Error handling should not significantly impact performance
    expect(duration).toBeLessThan(500); // Should fail fast
    
    // Verify fallback values are set correctly
    expect(contextState.stateData).toEqual([]);
    expect(contextState.sizes).toEqual([]);
    expect(contextState.colors).toEqual([]);
    expect(contextState.goods).toEqual([]);
    expect(contextState.stocks).toEqual([]);

    unmount();
  });

  test('should maintain performance during user interactions', async () => {
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

    // Load initial data
    await act(async () => {
      await contextState.fetchState();
    });

    const startTime = Date.now();
    
    // Simulate rapid user interactions
    await act(async () => {
      // Add multiple items quickly
      for (let i = 0; i < 10; i++) {
        contextState.addMatchedItem(`BC${i}`);
      }
    });
    
    const endTime = Date.now();
    const interactionTime = endTime - startTime;
    
    // User interactions should be responsive
    expect(interactionTime).toBeLessThan(100); // 100ms max for 10 operations
    expect(contextState.matchedItems).toHaveLength(10);
    
    // Verify data integrity after rapid operations
    contextState.matchedItems.forEach((item, index) => {
      expect(item.barcode).toBe(`BC${index}`);
      expect(item.name).toBe(`Item ${index}`);
    });

    unmount();
  });
});
