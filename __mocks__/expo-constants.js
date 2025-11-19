/**
 * Mock for expo-constants
 * Used in tests to avoid native module dependencies
 */

export default {
  manifest: {},
  systemFonts: [],
  sessionId: 'test-session-id',
  platform: {
    ios: undefined,
    android: undefined,
  },
  isDevice: false,
};
