// Mock Token Service for Tests
const mockTokenService = {
  getTokens: jest.fn(() => Promise.resolve({ accessToken: null, refreshToken: null })),
  setTokens: jest.fn(() => Promise.resolve()),
  clearTokens: jest.fn(() => Promise.resolve()),
  parseJWT: jest.fn(() => null),
  isTokenExpiring: jest.fn(() => false),
  refreshAccessToken: jest.fn(() => Promise.resolve('mock-token')),
  getValidAccessToken: jest.fn(() => Promise.resolve('mock-token')),
  getAuthHeaders: jest.fn(() => Promise.resolve({
    'Authorization': 'Bearer mock-token',
    'Content-Type': 'application/json'
  })),
  authenticatedFetch: jest.fn(() => Promise.resolve(new Response('{}', { status: 200 }))),
  isAuthenticated: jest.fn(() => Promise.resolve(false)),
  logout: jest.fn(() => Promise.resolve()),
  setAutoLogoutCallback: jest.fn(),
  startAutoLogoutMonitoring: jest.fn(),
  performAutoLogout: jest.fn(() => Promise.resolve()),
  clearAutoLogoutTimer: jest.fn(),
  stopAutoLogoutMonitoring: jest.fn(),
  
  // Mock properties
  refreshPromise: null,
  isRefreshingToken: false,
  autoLogoutTimer: null,
  onAutoLogout: null,
  isLoggingOut: false,
  
  // Helper methods for tests
  __resetMocks: () => {
    Object.keys(mockTokenService).forEach(key => {
      if (typeof mockTokenService[key] === 'function' && mockTokenService[key].mockReset) {
        mockTokenService[key].mockReset();
      }
    });
    
    // Reset default mock implementations
    mockTokenService.getTokens.mockResolvedValue({ accessToken: null, refreshToken: null });
    mockTokenService.setTokens.mockResolvedValue();
    mockTokenService.clearTokens.mockResolvedValue();
    mockTokenService.parseJWT.mockReturnValue(null);
    mockTokenService.isTokenExpiring.mockReturnValue(false);
    mockTokenService.refreshAccessToken.mockResolvedValue('mock-token');
    mockTokenService.getValidAccessToken.mockResolvedValue('mock-token');
    mockTokenService.getAuthHeaders.mockResolvedValue({
      'Authorization': 'Bearer mock-token',
      'Content-Type': 'application/json'
    });
    mockTokenService.authenticatedFetch.mockResolvedValue(new Response('{}', { status: 200 }));
    mockTokenService.isAuthenticated.mockResolvedValue(false);
    mockTokenService.logout.mockResolvedValue();
  },
  
  __setAuthenticated: (isAuth = true) => {
    if (isAuth) {
      mockTokenService.getTokens.mockResolvedValue({ 
        accessToken: 'mock-access-token', 
        refreshToken: 'mock-refresh-token' 
      });
      mockTokenService.isAuthenticated.mockResolvedValue(true);
      mockTokenService.getValidAccessToken.mockResolvedValue('mock-access-token');
    } else {
      mockTokenService.getTokens.mockResolvedValue({ accessToken: null, refreshToken: null });
      mockTokenService.isAuthenticated.mockResolvedValue(false);
      mockTokenService.getValidAccessToken.mockRejectedValue(new Error('No access token available'));
    }
  }
};

export default mockTokenService;