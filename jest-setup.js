// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

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

// Global cleanup for preventing memory leaks
global.beforeEach(() => {
  // Clear all timers
  jest.clearAllTimers();
});

global.afterEach(() => {
  // Clean up any pending timers only if fake timers are in use
  try {
    if (jest.isMockFunction(setTimeout)) {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
    }
  } catch (e) {
    // Ignore if fake timers aren't active
  }
  
  // Clean up all mocks
  jest.clearAllMocks();
  
  // Clean up any open handles
  if (global.gc) {
    global.gc();
  }
});

// Increase timeout for slow tests
jest.setTimeout(30000);
