/**
 * Test configuration for API data loading tests
 * This file provides configuration constants and mock data for tests
 * Note: This is a config file, not a test file - does not contain test cases
 */

// Export test suite configurations
export const testSuites = {
  unit: [
    'context/GlobalState.test.js'
  ],
  integration: [
    'integration/SignInDataLoading.test.js'
  ],
  performance: [
    'performance/APIPerformance.test.js'
  ],
  e2e: [
    'e2e/ApplicationFlow.test.js'
  ]
};

// Test execution order (recommended)
export const executionOrder = [
  'unit',
  'integration', 
  'performance',
  'e2e'
];

// Test environment setup
export const testConfig = {
  // API endpoints for testing
  apiEndpoints: {
    base: 'http://192.168.1.32:3000',
    login: '/api/user/login',
    stocks: '/api/excel/stock/get-all-stocks',
    colors: '/api/excel/color/get-all-colors',
    sizes: '/api/excel/size/get-all-sizes',
    goods: '/api/excel/goods/get-all-goods',
    state: '/api/state'
  },
  
  // Performance thresholds
  performance: {
    maxLoadTime: 5000, // 5 seconds
    maxApiResponseTime: 1000, // 1 second
    maxConcurrentRequests: 10
  },
  
  // Test data samples
  mockData: {
    user: {
      id: 1,
      email: 'test@bukowski.com',
      name: 'Test User',
      role: 'employee'
    },
    stocks: {
      stocks: [
        { Tow_Kod: 'ST001', name: 'Test Stock 1' },
        { Tow_Kod: 'ST002', name: 'Test Stock 2' }
      ]
    },
    colors: {
      colors: [
        { Kol_Kod: 'CZARNY', name: 'Czarny' },
        { Kol_Kod: 'BIALY', name: 'Biały' }
      ]
    },
    sizes: {
      sizes: [
        { Roz_Kod: 'S', Roz_Opis: 'Small' },
        { Roz_Kod: 'M', Roz_Opis: 'Medium' }
      ]
    }
  }
};

// Helper functions for test setup
export const testHelpers = {
  // Setup mock fetch for consistent API responses
  setupMockFetch: (customResponses = {}) => {
    const defaultResponses = {
      login: { ok: true, json: () => Promise.resolve(testConfig.mockData.user) },
      stocks: { ok: true, json: () => Promise.resolve(testConfig.mockData.stocks) },
      colors: { ok: true, json: () => Promise.resolve(testConfig.mockData.colors) },
      sizes: { ok: true, json: () => Promise.resolve(testConfig.mockData.sizes) },
      goods: { ok: true, json: () => Promise.resolve([]) },
      state: { ok: true, json: () => Promise.resolve([]) }
    };

    const responses = { ...defaultResponses, ...customResponses };

    global.fetch = jest.fn().mockImplementation((url, options) => {
      if (url.includes('/api/user/login')) return Promise.resolve(responses.login);
      if (url.includes('get-all-stocks')) return Promise.resolve(responses.stocks);
      if (url.includes('get-all-colors')) return Promise.resolve(responses.colors);
      if (url.includes('get-all-sizes')) return Promise.resolve(responses.sizes);
      if (url.includes('get-all-goods')) return Promise.resolve(responses.goods);
      if (url.includes('/api/state')) return Promise.resolve(responses.state);
      
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  },

  // Setup mock AsyncStorage
  setupMockAsyncStorage: (storedData = null) => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValue(storedData);
    AsyncStorage.setItem.mockResolvedValue();
    AsyncStorage.clear.mockResolvedValue();
  },

  // Wait for all API calls to complete
  waitForApiCalls: async (expectedCalls = 5, timeout = 5000) => {
    const { waitFor } = require('@testing-library/react-native');
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(expectedCalls);
    }, { timeout });
  },

  // Verify specific API endpoints were called
  verifyApiEndpoints: (expectedEndpoints = []) => {
    expectedEndpoints.forEach(endpoint => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(endpoint)
      );
    });
  },

  // Generate large mock data for performance tests
  generateLargeMockData: (count = 1000) => ({
    stocks: {
      stocks: Array.from({ length: count }, (_, i) => ({
        Tow_Kod: `ST${String(i).padStart(3, '0')}`,
        name: `Stock ${i}`,
        category: 'test'
      }))
    },
    colors: {
      colors: Array.from({ length: 50 }, (_, i) => ({
        Kol_Kod: `COL${String(i).padStart(2, '0')}`,
        name: `Color ${i}`,
        hex: `#${Math.floor(Math.random()*16777215).toString(16)}`
      }))
    },
    sizes: {
      sizes: Array.from({ length: 20 }, (_, i) => ({
        Roz_Kod: `SIZE${i}`,
        Roz_Opis: `Size ${i}`
      }))
    }
  })
};

export default {
  testSuites,
  executionOrder,
  testConfig,
  testHelpers
};
