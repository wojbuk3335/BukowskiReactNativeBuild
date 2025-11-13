// Mock for @react-native-async-storage/async-storage
const mockAsyncStorage = {
  getItem: jest.fn().mockImplementation((key) => {
    return new Promise((resolve) => {
      const data = mockAsyncStorage._storage[key];
      resolve(data || null);
    });
  }),
  
  setItem: jest.fn().mockImplementation((key, value) => {
    return new Promise((resolve) => {
      mockAsyncStorage._storage[key] = value;
      resolve();
    });
  }),
  
  removeItem: jest.fn().mockImplementation((key) => {
    return new Promise((resolve) => {
      delete mockAsyncStorage._storage[key];
      resolve();
    });
  }),
  
  clear: jest.fn().mockImplementation(() => {
    return new Promise((resolve) => {
      mockAsyncStorage._storage = {};
      resolve();
    });
  }),
  
  getAllKeys: jest.fn().mockImplementation(() => {
    return new Promise((resolve) => {
      const keys = Object.keys(mockAsyncStorage._storage);
      resolve(keys);
    });
  }),
  
  multiGet: jest.fn().mockImplementation((keys) => {
    return new Promise((resolve) => {
      const result = keys.map(key => [key, mockAsyncStorage._storage[key] || null]);
      resolve(result);
    });
  }),
  
  multiSet: jest.fn().mockImplementation((keyValuePairs) => {
    return new Promise((resolve) => {
      keyValuePairs.forEach(([key, value]) => {
        mockAsyncStorage._storage[key] = value;
      });
      resolve();
    });
  }),
  
  multiRemove: jest.fn().mockImplementation((keys) => {
    return new Promise((resolve) => {
      keys.forEach(key => {
        delete mockAsyncStorage._storage[key];
      });
      resolve();
    });
  }),
  
  // Internal storage for testing
  _storage: {},
  
  // Helper methods for testing
  _clearAll: () => {
    mockAsyncStorage._storage = {};
  },
  
  _setMockData: (data) => {
    mockAsyncStorage._storage = { ...data };
  },
  
  _getMockData: () => {
    return { ...mockAsyncStorage._storage };
  }
};

module.exports = mockAsyncStorage;