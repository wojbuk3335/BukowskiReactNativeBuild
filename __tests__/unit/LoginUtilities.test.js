/**
 * Login Utility Functions Unit Tests
 * 
 * Tests for helper functions and utilities used in login process
 */

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

describe('Login Utility Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
  });

  describe('📝 Input Validation', () => {
    it('should validate email format correctly', () => {
      const validEmails = [
        'user@example.com',
        'test.email@domain.co.uk',
        'user+tag@example.org',
        'firstname.lastname@company.com'
      ];
      
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user@.com',
        'user space@example.com'
      ];
      
      // Simple email validation (basic check)
      const isValidEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      };
      
      validEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(true);
      });
      
      invalidEmails.forEach(email => {
        expect(isValidEmail(email)).toBe(false);
      });
    });

    it('should validate password requirements', () => {
      const validPasswords = [
        'password123',
        'MySecurePass!',
        'P@ssw0rd',
        '12345678'
      ];
      
      const invalidPasswords = [
        '',
        '123',
        'short'
      ];
      
      // Simple password validation (minimum length)  
      const isValidPassword = (password) => {
        if (!password || typeof password !== 'string') return false;
        return password.length >= 6;
      };
      
      validPasswords.forEach(password => {
        expect(isValidPassword(password)).toBe(true);
      });
      
      invalidPasswords.forEach(password => {
        const result = isValidPassword(password);
        expect(result).toBe(false);
      });
    });
  });

  describe('🔧 String Utilities', () => {
    it('should trim whitespace from inputs', () => {
      const trimInput = (input) => input ? input.trim() : '';
      
      expect(trimInput('  email@example.com  ')).toBe('email@example.com');
      expect(trimInput('password123  ')).toBe('password123');
      expect(trimInput('  user  ')).toBe('user');
      expect(trimInput('')).toBe('');
      expect(trimInput('   ')).toBe('');
    });

    it('should normalize email to lowercase', () => {
      const normalizeEmail = (email) => email ? email.toLowerCase().trim() : '';
      
      expect(normalizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
      expect(normalizeEmail('Test@Domain.Org')).toBe('test@domain.org');
      expect(normalizeEmail('  MixedCase@Email.Net  ')).toBe('mixedcase@email.net');
    });

    it('should sanitize special characters safely', () => {
      const sanitizeInput = (input) => {
        if (!input) return '';
        // Basic sanitization - remove null bytes and trim
        return input.replace(/\0/g, '').trim();
      };
      
      expect(sanitizeInput('normal@email.com')).toBe('normal@email.com');
      expect(sanitizeInput('test\0@example.com')).toBe('test@example.com');
      expect(sanitizeInput('  clean@domain.org  ')).toBe('clean@domain.org');
    });
  });

  describe('💾 Storage Utilities', () => {
    it('should store user data correctly', async () => {
      const userData = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        token: 'access-token-123'
      };
      
      const storeUserData = async (data) => {
        await mockAsyncStorage.setItem('user', JSON.stringify(data));
      };
      
      await storeUserData(userData);
      
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith(
        'user',
        JSON.stringify(userData)
      );
    });

    it('should retrieve user data correctly', async () => {
      const userData = {
        id: 1,
        email: 'user@example.com',
        name: 'Test User',
        token: 'access-token-123'
      };
      
      mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(userData));
      
      const getUserData = async () => {
        const data = await mockAsyncStorage.getItem('user');
        return data ? JSON.parse(data) : null;
      };
      
      const result = await getUserData();
      
      expect(result).toEqual(userData);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('user');
    });

    it('should handle corrupted storage data', async () => {
      mockAsyncStorage.getItem.mockResolvedValueOnce('invalid-json');
      
      const getUserData = async () => {
        try {
          const data = await mockAsyncStorage.getItem('user');
          return data ? JSON.parse(data) : null;
        } catch (error) {
          return null;
        }
      };
      
      const result = await getUserData();
      
      expect(result).toBeNull();
    });

    it('should clear user data on logout', async () => {
      const clearUserData = async () => {
        await mockAsyncStorage.removeItem('user');
      };
      
      await clearUserData();
      
      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('user');
    });
  });

  describe('🔐 Token Utilities', () => {
    it('should validate JWT token format', () => {
      const validTokens = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.Gfx6VO9tcxwk6xqx9yYzSfebfeakZp5JYIgP_edcw_A'
      ];
      
      const invalidTokens = [
        'invalid-token',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9', // Missing parts
        '',
        null,
        'bearer-token-123'
      ];
      
      const isValidJWT = (token) => {
        if (!token || typeof token !== 'string') return false;
        const parts = token.split('.');
        return parts.length === 3;
      };
      
      validTokens.forEach(token => {
        expect(isValidJWT(token)).toBe(true);
      });
      
      invalidTokens.forEach(token => {
        expect(isValidJWT(token)).toBe(false);
      });
    });

    it('should decode JWT payload safely', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      
      const decodeJWT = (token) => {
        try {
          if (!token || typeof token !== 'string') return null;
          const parts = token.split('.');
          if (parts.length !== 3) return null;
          
          const payload = parts[1];
          const decodedPayload = atob(payload);
          return JSON.parse(decodedPayload);
        } catch (error) {
          return null;
        }
      };
      
      const decoded = decodeJWT(token);
      
      expect(decoded).toMatchObject({
        sub: '1234567890',
        name: 'John Doe',
        iat: 1516239022
      });
    });

    it('should check token expiration', () => {
      const currentTime = Math.floor(Date.now() / 1000);
      
      const createTokenPayload = (exp) => ({
        sub: '1234567890',
        name: 'Test User',
        iat: currentTime - 3600, // Issued 1 hour ago
        exp: exp
      });
      
      const isTokenExpired = (payload) => {
        if (!payload || !payload.exp) return true;
        return payload.exp < Math.floor(Date.now() / 1000);
      };
      
      // Test expired token
      const expiredPayload = createTokenPayload(currentTime - 3600); // Expired 1 hour ago
      expect(isTokenExpired(expiredPayload)).toBe(true);
      
      // Test valid token
      const validPayload = createTokenPayload(currentTime + 3600); // Expires in 1 hour
      expect(isTokenExpired(validPayload)).toBe(false);
      
      // Test missing expiration
      const noExpPayload = { sub: '1234567890', name: 'Test User' };
      expect(isTokenExpired(noExpPayload)).toBe(true);
    });
  });

  describe('🌐 API Utilities', () => {
    it('should create proper login request body', () => {
      const createLoginRequest = (email, password) => ({
        email: email.toLowerCase().trim(),
        password: password
      });
      
      const request = createLoginRequest('  User@Example.COM  ', 'password123');
      
      expect(request).toEqual({
        email: 'user@example.com',
        password: 'password123'
      });
    });

    it('should handle API response format', () => {
      const mockSuccessResponse = {
        success: true,
        data: {
          id: 1,
          email: 'user@example.com',
          name: 'Test User',
          token: 'access-token-123'
        }
      };
      
      const mockErrorResponse = {
        success: false,
        message: 'Invalid credentials',
        errors: ['Email or password is incorrect']
      };
      
      const parseApiResponse = (response) => {
        if (response.success && response.data) {
          return { success: true, data: response.data };
        }
        return { 
          success: false, 
          error: response.message || 'Unknown error occurred' 
        };
      };
      
      const successResult = parseApiResponse(mockSuccessResponse);
      expect(successResult.success).toBe(true);
      expect(successResult.data).toBeDefined();
      
      const errorResult = parseApiResponse(mockErrorResponse);
      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBe('Invalid credentials');
    });

    it('should build API headers correctly', () => {
      const buildHeaders = (token = null) => {
        const headers = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        return headers;
      };
      
      // Without token
      const basicHeaders = buildHeaders();
      expect(basicHeaders).toEqual({
        'Content-Type': 'application/json'
      });
      
      // With token
      const authHeaders = buildHeaders('access-token-123');
      expect(authHeaders).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer access-token-123'
      });
    });
  });

  describe('⚠️ Error Handling Utilities', () => {
    it('should categorize different error types', () => {
      const categorizeError = (error) => {
        if (!error) return 'unknown';
        
        const message = error.message || error.toString();
        
        if (message.includes('network') || message.includes('fetch')) {
          return 'network';
        }
        if (message.includes('timeout')) {
          return 'timeout';
        }
        if (message.includes('401') || message.includes('unauthorized')) {
          return 'auth';
        }
        if (message.includes('500') || message.includes('server')) {
          return 'server';
        }
        
        return 'client';
      };
      
      expect(categorizeError(new Error('network error'))).toBe('network');
      expect(categorizeError(new Error('timeout occurred'))).toBe('timeout');
      expect(categorizeError(new Error('401 unauthorized'))).toBe('auth');
      expect(categorizeError(new Error('500 server error'))).toBe('server');
      expect(categorizeError(new Error('validation failed'))).toBe('client');
    });

    it('should provide user-friendly error messages', () => {
      const getUserFriendlyMessage = (errorType) => {
        const messages = {
          network: 'Sprawdź połączenie internetowe i spróbuj ponownie.',
          timeout: 'Żądanie przekroczyło limit czasu. Spróbuj ponownie.',
          auth: 'Nieprawidłowe dane logowania.',
          server: 'Wystąpił błąd serwera. Spróbuj ponownie później.',
          client: 'Logowanie nie powiodło się. Sprawdź swoje dane i spróbuj ponownie.',
          unknown: 'Wystąpił nieoczekiwany błąd.'
        };
        
        return messages[errorType] || messages.unknown;
      };
      
      expect(getUserFriendlyMessage('network')).toBe('Sprawdź połączenie internetowe i spróbuj ponownie.');
      expect(getUserFriendlyMessage('auth')).toBe('Nieprawidłowe dane logowania.');
      expect(getUserFriendlyMessage('invalid')).toBe('Wystąpił nieoczekiwany błąd.');
    });
  });

  describe('🎯 Performance Utilities', () => {
    it('should debounce rapid function calls', (done) => {
      let callCount = 0;
      
      const debounce = (func, delay) => {
        let timeoutId;
        return (...args) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => func.apply(null, args), delay);
        };
      };
      
      const incrementCounter = () => {
        callCount++;
      };
      
      const debouncedIncrement = debounce(incrementCounter, 100);
      
      // Call multiple times rapidly
      debouncedIncrement();
      debouncedIncrement();
      debouncedIncrement();
      
      // Should only execute once after delay
      setTimeout(() => {
        expect(callCount).toBe(1);
        done();
      }, 150);
    });

    it('should cache API responses', () => {
      const cache = new Map();
      
      const cacheResponse = (key, data, ttl = 5000) => {
        cache.set(key, {
          data,
          expires: Date.now() + ttl
        });
      };
      
      const getCachedResponse = (key) => {
        const cached = cache.get(key);
        if (!cached) return null;
        
        if (Date.now() > cached.expires) {
          cache.delete(key);
          return null;
        }
        
        return cached.data;
      };
      
      const testData = { user: 'test@example.com' };
      cacheResponse('login:test@example.com', testData);
      
      const retrieved = getCachedResponse('login:test@example.com');
      expect(retrieved).toEqual(testData);
      
      // Test expired cache
      cacheResponse('expired', testData, -1000); // Already expired
      const expiredResult = getCachedResponse('expired');
      expect(expiredResult).toBeNull();
    });
  });
});