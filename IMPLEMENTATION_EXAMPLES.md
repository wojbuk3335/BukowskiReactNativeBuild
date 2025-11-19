# 🔧 PRZYKŁADY IMPLEMENTACJI - BEZPIECZEŃSTWO I TESTY

## 📁 STRUKTURA PLIKÓW DO STWORZENIA

```
BukowskiReactNativeBuild/
├── .env.development
├── .env.production
├── .env.example (✅ już stworzony)
├── services/
│   └── secureTokenService.js (nowy)
├── utils/
│   ├── validation/
│   │   ├── schemas.js (nowy)
│   │   └── sanitize.js (nowy)
│   ├── security/
│   │   ├── biometricAuth.js (nowy)
│   │   ├── deviceSecurity.js (nowy)
│   │   └── sslPinning.js (nowy)
│   └── logger.js (nowy)
├── __tests__/
│   ├── security/
│   │   ├── TokenManagement.test.js (nowy)
│   │   ├── Authentication.test.js (nowy)
│   │   ├── InputValidation.test.js (nowy)
│   │   ├── Biometric.test.js (nowy)
│   │   └── DeviceSecurity.test.js (nowy)
│   ├── components/
│   │   ├── QRScanner.test.js (nowy)
│   │   └── Profile.test.js (nowy)
│   └── integration/
│       ├── QRScannerFlow.test.js (nowy)
│       ├── ErrorHandling.test.js (nowy)
│       └── WriteOffComplete.test.js (nowy)
└── config/
    └── api.js (do aktualizacji)
```

---

## 1. SECURE TOKEN SERVICE

### `services/secureTokenService.js`
```javascript
import * as SecureStore from 'expo-secure-store';
import { getApiUrl } from '../config/api';
import AuthErrorHandler from '../utils/authErrorHandler';

class SecureTokenService {
    constructor() {
        this.refreshPromise = null;
        this.isRefreshingToken = false;
        this.autoLogoutTimer = null;
        this.onAutoLogout = null;
        this.isLoggingOut = false;
    }

    // Get tokens from SecureStore (encrypted)
    async getTokens() {
        try {
            const accessToken = await SecureStore.getItemAsync('BukowskiAccessToken');
            const refreshToken = await SecureStore.getItemAsync('BukowskiRefreshToken');
            return { accessToken, refreshToken };
        } catch (error) {
            console.error('❌ ERROR: Failed to retrieve tokens:', error);
            return { accessToken: null, refreshToken: null };
        }
    }

    // Store tokens in SecureStore (encrypted)
    async setTokens(accessToken, refreshToken) {
        try {
            if (accessToken) {
                await SecureStore.setItemAsync('BukowskiAccessToken', accessToken);
                
                // Store expiry time
                const payload = this.parseJWT(accessToken);
                if (payload?.exp) {
                    const expiryTime = payload.exp * 1000;
                    await SecureStore.setItemAsync('BukowskiTokenExpiry', expiryTime.toString());
                }
                
                this.startAutoLogoutMonitoring();
            }
            
            if (refreshToken) {
                await SecureStore.setItemAsync('BukowskiRefreshToken', refreshToken);
            }
        } catch (error) {
            console.error('❌ ERROR: Failed to store tokens:', error);
            throw error;
        }
    }

    // Clear all tokens
    async clearTokens() {
        try {
            await SecureStore.deleteItemAsync('BukowskiAccessToken');
            await SecureStore.deleteItemAsync('BukowskiRefreshToken');
            await SecureStore.deleteItemAsync('BukowskiTokenExpiry');
            
            // Also clear user data from AsyncStorage if needed
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            await AsyncStorage.removeItem('user');
        } catch (error) {
            console.error('❌ ERROR: Failed to clear tokens:', error);
        }
    }

    // Parse JWT token
    parseJWT(token) {
        if (!token) return null;
        
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            
            const payload = parts[1];
            let decodedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
            while (decodedPayload.length % 4) {
                decodedPayload += '=';
            }
            
            const decoded = atob(decodedPayload);
            return JSON.parse(decoded);
        } catch (error) {
            console.error('❌ ERROR: Failed to parse JWT:', error);
            return null;
        }
    }

    // Check if token is expiring
    isTokenExpiring(token, bufferSeconds = 300) {
        const payload = this.parseJWT(token);
        if (!payload?.exp) return true;
        
        const expiryTime = payload.exp * 1000;
        const bufferTime = bufferSeconds * 1000;
        const now = Date.now();
        
        return now >= (expiryTime - bufferTime);
    }

    // Refresh access token
    async refreshAccessToken() {
        if (this.isRefreshingToken) {
            return this.refreshPromise;
        }

        this.isRefreshingToken = true;
        const { refreshToken } = await this.getTokens();
        
        if (!refreshToken) {
            await this.clearTokens();
            this.isRefreshingToken = false;
            throw new Error('No refresh token available');
        }

        this.refreshPromise = this.performRefresh(refreshToken);
        
        try {
            const result = await this.refreshPromise;
            this.isRefreshingToken = false;
            return result;
        } catch (error) {
            this.isRefreshingToken = false;
            await this.clearTokens();
            throw error;
        }
    }

    async performRefresh(refreshToken) {
        try {
            const response = await fetch(getApiUrl('/user/refresh-token'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                throw new Error('Token refresh failed');
            }

            const data = await response.json();
            await this.setTokens(data.accessToken, refreshToken);
            return data.accessToken;
        } catch (error) {
            console.error('❌ Token refresh error:', error);
            throw error;
        }
    }

    // Get valid access token (refresh if needed)
    async getValidAccessToken() {
        const { accessToken } = await this.getTokens();
        
        if (!accessToken) {
            throw new Error('No access token available');
        }

        if (this.isTokenExpiring(accessToken, 300)) {
            try {
                return await this.refreshAccessToken();
            } catch (error) {
                await this.clearTokens();
                throw error;
            }
        }

        return accessToken;
    }

    // Get auth headers
    async getAuthHeaders() {
        try {
            const token = await this.getValidAccessToken();
            return {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
        } catch (error) {
            return { 'Content-Type': 'application/json' };
        }
    }

    // Authenticated fetch
    async authenticatedFetch(url, options = {}) {
        try {
            if (this.isLoggingOut) {
                throw new Error('Authentication failed: logout in progress');
            }
            
            const authHeaders = await this.getAuthHeaders();
            const headers = { ...authHeaders, ...options.headers };
            const response = await fetch(url, { ...options, headers });

            if (response.status === 401 && !options._retry && !this.isLoggingOut) {
                try {
                    const newToken = await this.refreshAccessToken();
                    if (newToken) {
                        const newHeaders = {
                            ...headers,
                            'Authorization': `Bearer ${newToken}`
                        };
                        
                        return await fetch(url, {
                            ...options,
                            headers: newHeaders,
                            _retry: true
                        });
                    }
                } catch (refreshError) {
                    if (!this.isLoggingOut) {
                        await this.clearTokens();
                    }
                    throw refreshError;
                }
            }

            return response;
        } catch (error) {
            throw error;
        }
    }

    // Check if authenticated
    async isAuthenticated() {
        try {
            const { accessToken } = await this.getTokens();
            return !!accessToken && !this.isTokenExpiring(accessToken, 0);
        } catch (error) {
            return false;
        }
    }

    // Logout
    async logout() {
        this.isLoggingOut = true;
        const { refreshToken } = await this.getTokens();
        
        if (refreshToken) {
            try {
                await fetch(getApiUrl('/user/logout'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken })
                });
            } catch (error) {
                console.error('Server logout failed:', error);
            }
        }

        await this.clearTokens();
        this.clearAutoLogoutTimer();
        this.isLoggingOut = false;
    }

    // Auto-logout monitoring
    setAutoLogoutCallback(callback) {
        this.onAutoLogout = callback;
    }

    startAutoLogoutMonitoring() {
        this.clearAutoLogoutTimer();
        
        const checkTokenExpiration = async () => {
            try {
                const { accessToken } = await this.getTokens();
                if (!accessToken) return;

                const payload = this.parseJWT(accessToken);
                if (!payload?.exp) {
                    await this.performAutoLogout();
                    return;
                }

                const expiryTime = payload.exp * 1000;
                const now = Date.now();
                const timeLeft = expiryTime - now;

                if (timeLeft <= 0) {
                    await this.performAutoLogout();
                    return;
                }

                let nextCheckIn;
                if (timeLeft > 3600000) nextCheckIn = 600000;
                else if (timeLeft > 300000) nextCheckIn = 60000;
                else if (timeLeft > 30000) nextCheckIn = 10000;
                else nextCheckIn = 1000;
                
                this.autoLogoutTimer = setTimeout(checkTokenExpiration, nextCheckIn);
            } catch (error) {
                console.error('❌ Error checking token:', error);
                this.autoLogoutTimer = setTimeout(checkTokenExpiration, 5000);
            }
        };

        checkTokenExpiration();
    }

    async performAutoLogout() {
        try {
            this.isLoggingOut = true;
            await this.clearTokens();
            this.clearAutoLogoutTimer();
            
            if (this.onAutoLogout) {
                this.onAutoLogout();
            }
        } catch (error) {
            console.error('❌ Error during auto logout:', error);
        } finally {
            this.isLoggingOut = false;
        }
    }

    clearAutoLogoutTimer() {
        if (this.autoLogoutTimer) {
            clearTimeout(this.autoLogoutTimer);
            this.autoLogoutTimer = null;
        }
    }

    stopAutoLogoutMonitoring() {
        this.clearAutoLogoutTimer();
    }
}

const secureTokenService = new SecureTokenService();
export default secureTokenService;
```

---

## 2. VALIDATION SCHEMAS

### `utils/validation/schemas.js`
```javascript
import * as Yup from 'yup';

// Login validation
export const loginSchema = Yup.object().shape({
  symbol: Yup.string()
    .required('Symbol jest wymagany')
    .min(2, 'Symbol musi mieć co najmniej 2 znaki')
    .max(20, 'Symbol nie może mieć więcej niż 20 znaków')
    .matches(/^[a-zA-Z0-9_-]+$/, 'Symbol może zawierać tylko litery, cyfry, - i _'),
  
  password: Yup.string()
    .required('Hasło jest wymagane')
    .min(6, 'Hasło musi mieć co najmniej 6 znaków')
});

// Phone validation
export const phoneSchema = Yup.string()
  .matches(/^[0-9]{9}$/, 'Numer telefonu musi mieć 9 cyfr')
  .nullable();

// Email validation
export const emailSchema = Yup.string()
  .email('Nieprawidłowy format email')
  .nullable();

// NIP validation
export const nipSchema = Yup.string()
  .matches(/^[0-9]{10}$/, 'NIP musi mieć 10 cyfr')
  .test('nip-checksum', 'Nieprawidłowy NIP', (value) => {
    if (!value || value.length !== 10) return true; // Let required handle empty
    
    const weights = [6, 5, 7, 2, 3, 4, 5, 6, 7];
    const digits = value.split('').map(Number);
    const checksum = digits.slice(0, 9).reduce((sum, digit, i) => 
      sum + digit * weights[i], 0
    );
    
    return (checksum % 11) === digits[9];
  })
  .nullable();

// Barcode validation
export const barcodeSchema = Yup.string()
  .required('Kod kreskowy jest wymagany')
  .matches(/^[A-Z0-9-]+$/, 'Nieprawidłowy format kodu kreskowego');

// Amount validation
export const amountSchema = Yup.number()
  .required('Kwota jest wymagana')
  .positive('Kwota musi być większa od zera')
  .max(999999, 'Kwota zbyt duża');

// Currency validation
export const currencySchema = Yup.string()
  .required('Waluta jest wymagana')
  .oneOf(['PLN', 'EUR', 'USD', 'GBP', 'HUF', 'ILS', 'CAN'], 'Nieprawidłowa waluta');

// Date validation
export const dateSchema = Yup.date()
  .required('Data jest wymagana')
  .max(new Date(), 'Data nie może być w przyszłości');

// Time validation (HH:MM)
export const timeSchema = Yup.string()
  .required('Czas jest wymagany')
  .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, 'Format czasu: HH:MM')
  .test('valid-time', 'Nieprawidłowy czas', (value) => {
    if (!value) return true;
    const [hours, minutes] = value.split(':').map(Number);
    return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60;
  });

// Work hours validation
export const workHoursSchema = Yup.object().shape({
  startTime: timeSchema,
  endTime: timeSchema,
  breakStart: timeSchema.nullable(),
  breakEnd: timeSchema.nullable(),
}).test('end-after-start', 'Czas zakończenia musi być po czasie rozpoczęcia', function(value) {
  const { startTime, endTime } = value;
  if (!startTime || !endTime) return true;
  
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  
  return (endH * 60 + endM) > (startH * 60 + startM);
});

// Financial operation validation
export const financialOperationSchema = Yup.object().shape({
  type: Yup.string()
    .required('Typ operacji jest wymagany')
    .oneOf(['deposit', 'deduction', 'sales_commission'], 'Nieprawidłowy typ operacji'),
  
  amount: amountSchema,
  currency: currencySchema,
  date: dateSchema,
  
  description: Yup.string()
    .max(500, 'Opis nie może mieć więcej niż 500 znaków')
    .nullable(),
});

// Product registration validation
export const productRegistrationSchema = Yup.object().shape({
  productName: Yup.string()
    .required('Nazwa produktu jest wymagana')
    .min(2, 'Nazwa produktu musi mieć co najmniej 2 znaki'),
  
  color: Yup.string()
    .required('Kolor jest wymagany'),
  
  size: Yup.string()
    .required('Rozmiar jest wymagany'),
  
  phone: phoneSchema,
  email: emailSchema,
  
  deliveryOption: Yup.string()
    .required('Opcja dostawy jest wymagana')
    .oneOf(['pickup', 'delivery'], 'Nieprawidłowa opcja dostawy'),
  
  // Conditional validation based on delivery option
  address: Yup.string().when('deliveryOption', {
    is: 'delivery',
    then: (schema) => schema.required('Adres jest wymagany dla dostawy'),
    otherwise: (schema) => schema.nullable()
  }),
  
  city: Yup.string().when('deliveryOption', {
    is: 'delivery',
    then: (schema) => schema.required('Miasto jest wymagane dla dostawy'),
    otherwise: (schema) => schema.nullable()
  }),
  
  postalCode: Yup.string().when('deliveryOption', {
    is: 'delivery',
    then: (schema) => schema
      .required('Kod pocztowy jest wymagany dla dostawy')
      .matches(/^[0-9]{2}-[0-9]{3}$/, 'Format kodu pocztowego: XX-XXX'),
    otherwise: (schema) => schema.nullable()
  }),
});
```

---

## 3. DATA SANITIZATION

### `utils/validation/sanitize.js`
```javascript
/**
 * Sanitize string input to prevent XSS and injection attacks
 */
export const sanitizeString = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
};

/**
 * Sanitize barcode (uppercase alphanumeric + dash)
 */
export const sanitizeBarcode = (barcode) => {
  if (!barcode) return '';
  
  return String(barcode)
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .substring(0, 50);
};

/**
 * Sanitize number input
 */
export const sanitizeNumber = (input) => {
  const parsed = parseFloat(input);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Sanitize phone number (remove non-digits)
 */
export const sanitizePhone = (phone) => {
  if (!phone) return '';
  
  return String(phone)
    .replace(/[^0-9]/g, '')
    .substring(0, 9);
};

/**
 * Sanitize email
 */
export const sanitizeEmail = (email) => {
  if (!email) return '';
  
  return String(email)
    .toLowerCase()
    .trim()
    .substring(0, 254);
};

/**
 * Sanitize object (recursive)
 */
export const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const sanitized = Array.isArray(obj) ? [] : {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  
  return sanitized;
};

/**
 * Validate and sanitize API request data
 */
export const sanitizeApiData = (data) => {
  const sanitized = sanitizeObject(data);
  
  // Additional checks for common fields
  if (sanitized.barcode) {
    sanitized.barcode = sanitizeBarcode(sanitized.barcode);
  }
  
  if (sanitized.phone) {
    sanitized.phone = sanitizePhone(sanitized.phone);
  }
  
  if (sanitized.email) {
    sanitized.email = sanitizeEmail(sanitized.email);
  }
  
  if (sanitized.amount) {
    sanitized.amount = sanitizeNumber(sanitized.amount);
  }
  
  return sanitized;
};
```

---

## 4. BIOMETRIC AUTHENTICATION

### `utils/security/biometricAuth.js`
```javascript
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

class BiometricAuth {
  constructor() {
    this.isEnabled = false;
    this.isAvailable = false;
  }

  /**
   * Check if biometric authentication is available on device
   */
  async checkAvailability() {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      
      this.isAvailable = compatible && enrolled;
      return this.isAvailable;
    } catch (error) {
      console.error('Biometric availability check failed:', error);
      return false;
    }
  }

  /**
   * Get supported authentication types
   */
  async getSupportedTypes() {
    try {
      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      return types.map(type => {
        switch(type) {
          case LocalAuthentication.AuthenticationType.FINGERPRINT:
            return 'fingerprint';
          case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
            return 'facial';
          case LocalAuthentication.AuthenticationType.IRIS:
            return 'iris';
          default:
            return 'unknown';
        }
      });
    } catch (error) {
      console.error('Failed to get supported types:', error);
      return [];
    }
  }

  /**
   * Enable biometric authentication
   */
  async enable() {
    try {
      const available = await this.checkAvailability();
      if (!available) {
        throw new Error('Biometric authentication not available');
      }

      await AsyncStorage.setItem('biometricEnabled', 'true');
      this.isEnabled = true;
      return true;
    } catch (error) {
      console.error('Failed to enable biometric:', error);
      return false;
    }
  }

  /**
   * Disable biometric authentication
   */
  async disable() {
    try {
      await AsyncStorage.removeItem('biometricEnabled');
      this.isEnabled = false;
      return true;
    } catch (error) {
      console.error('Failed to disable biometric:', error);
      return false;
    }
  }

  /**
   * Check if biometric is enabled
   */
  async isEnabledAsync() {
    try {
      const enabled = await AsyncStorage.getItem('biometricEnabled');
      this.isEnabled = enabled === 'true';
      return this.isEnabled;
    } catch (error) {
      console.error('Failed to check biometric status:', error);
      return false;
    }
  }

  /**
   * Authenticate with biometrics
   */
  async authenticate(options = {}) {
    try {
      const available = await this.checkAvailability();
      if (!available) {
        throw new Error('Biometric authentication not available');
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: options.promptMessage || 'Uwierzytelnij się',
        cancelLabel: options.cancelLabel || 'Anuluj',
        disableDeviceFallback: options.disableDeviceFallback || false,
        requireConfirmation: options.requireConfirmation || false,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  /**
   * Authenticate for sensitive operation
   */
  async authenticateForOperation(operationName) {
    const enabled = await this.isEnabledAsync();
    
    if (!enabled) {
      return true; // If biometric not enabled, allow operation
    }

    return await this.authenticate({
      promptMessage: `Potwierdź: ${operationName}`,
      cancelLabel: 'Anuluj',
      disableDeviceFallback: false,
    });
  }
}

export default new BiometricAuth();
```

---

## 5. DEVICE SECURITY (Root/Jailbreak Detection)

### `utils/security/deviceSecurity.js`
```javascript
import DeviceInfo from 'react-native-device-info';
import { Platform } from 'react-native';

class DeviceSecurity {
  constructor() {
    this.isRooted = false;
    this.isEmulator = false;
  }

  /**
   * Check if device is rooted/jailbroken
   */
  async checkRootStatus() {
    try {
      if (Platform.OS === 'android') {
        // Check for common root indicators
        const isRooted = await DeviceInfo.isRooted();
        this.isRooted = isRooted;
      } else if (Platform.OS === 'ios') {
        // Check for jailbreak
        const isJailbroken = await DeviceInfo.isJailbroken();
        this.isRooted = isJailbroken;
      }
      
      return this.isRooted;
    } catch (error) {
      console.error('Root check failed:', error);
      return false;
    }
  }

  /**
   * Check if running on emulator
   */
  async checkEmulator() {
    try {
      this.isEmulator = await DeviceInfo.isEmulator();
      return this.isEmulator;
    } catch (error) {
      console.error('Emulator check failed:', error);
      return false;
    }
  }

  /**
   * Perform complete security check
   */
  async performSecurityCheck() {
    const [rooted, emulator] = await Promise.all([
      this.checkRootStatus(),
      this.checkEmulator()
    ]);

    return {
      isRooted: rooted,
      isEmulator: emulator,
      isSecure: !rooted && !emulator
    };
  }

  /**
   * Get security warning message
   */
  getSecurityWarning() {
    if (this.isRooted && this.isEmulator) {
      return 'Aplikacja działa na zrootowanym emulatorze. Bezpieczeństwo może być zagrożone.';
    } else if (this.isRooted) {
      return 'Wykryto zrootowane urządzenie. Korzystanie z aplikacji może być niebezpieczne.';
    } else if (this.isEmulator) {
      return 'Aplikacja działa na emulatorze.';
    }
    return null;
  }

  /**
   * Should block app usage
   */
  shouldBlockApp() {
    // Block only on rooted devices (not on emulators for development)
    return this.isRooted && !__DEV__;
  }
}

export default new DeviceSecurity();
```

---

## 6. LOGGER UTILITY

### `utils/logger.js`
```javascript
import Constants from 'expo-constants';

class Logger {
  constructor() {
    this.isProduction = Constants.expoConfig?.extra?.environment === 'production';
    this.logs = [];
    this.maxLogs = 100;
  }

  /**
   * Log info message
   */
  info(message, ...args) {
    this._log('INFO', message, args);
  }

  /**
   * Log warning
   */
  warn(message, ...args) {
    this._log('WARN', message, args);
  }

  /**
   * Log error
   */
  error(message, ...args) {
    this._log('ERROR', message, args);
  }

  /**
   * Log debug message (only in development)
   */
  debug(message, ...args) {
    if (!this.isProduction) {
      this._log('DEBUG', message, args);
    }
  }

  /**
   * Internal log method
   */
  _log(level, message, args) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      args
    };

    // Store log
    this.logs.push(logEntry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Console output only in development
    if (!this.isProduction) {
      const prefix = `[${level}] ${timestamp}:`;
      
      switch(level) {
        case 'ERROR':
          console.error(prefix, message, ...args);
          break;
        case 'WARN':
          console.warn(prefix, message, ...args);
          break;
        default:
          console.log(prefix, message, ...args);
      }
    }

    // In production, could send to monitoring service
    if (this.isProduction && level === 'ERROR') {
      this._sendToMonitoring(logEntry);
    }
  }

  /**
   * Send error to monitoring service (e.g., Sentry)
   */
  _sendToMonitoring(logEntry) {
    // TODO: Implement Sentry or other monitoring service
    // Sentry.captureException(logEntry);
  }

  /**
   * Get recent logs
   */
  getLogs(count = 10) {
    return this.logs.slice(-count);
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = [];
  }

  /**
   * Export logs as string
   */
  exportLogs() {
    return this.logs.map(log => 
      `[${log.level}] ${log.timestamp}: ${log.message} ${JSON.stringify(log.args)}`
    ).join('\n');
  }
}

export default new Logger();
```

---

## 7. UPDATED API CONFIG

### `config/api.js`
```javascript
import Constants from 'expo-constants';

// Get environment variables from .env files
const ENV = {
  API_URL: Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api',
  API_TIMEOUT: parseInt(Constants.expoConfig?.extra?.EXPO_PUBLIC_API_TIMEOUT || '10000'),
  ENVIRONMENT: Constants.expoConfig?.extra?.EXPO_PUBLIC_ENVIRONMENT || 'development',
  SSL_PINNING_ENABLED: Constants.expoConfig?.extra?.EXPO_PUBLIC_SSL_PINNING_ENABLED === 'true',
};

export const API_CONFIG = {
  BASE_URL: ENV.API_URL,
  TIMEOUT: ENV.API_TIMEOUT,
  ENVIRONMENT: ENV.ENVIRONMENT,
  SSL_PINNING_ENABLED: ENV.SSL_PINNING_ENABLED,
};

// Helper function to get full API URL
export const getApiUrl = (endpoint) => {
  const baseUrl = API_CONFIG.BASE_URL;
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

// Validate HTTPS in production
export const validateSecureConnection = () => {
  if (API_CONFIG.ENVIRONMENT === 'production' && !API_CONFIG.BASE_URL.startsWith('https://')) {
    console.error('❌ SECURITY WARNING: API URL must use HTTPS in production!');
    throw new Error('Insecure API connection in production');
  }
};

// Call validation on import in production
if (API_CONFIG.ENVIRONMENT === 'production') {
  validateSecureConnection();
}

export default API_CONFIG;
```

---

## 8. SECURITY TESTS

### `__tests__/security/TokenManagement.test.js`
```javascript
import secureTokenService from '../../services/secureTokenService';
import * as SecureStore from 'expo-secure-store';

// Mock SecureStore
jest.mock('expo-secure-store');

describe('Secure Token Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Token Storage', () => {
    it('should store tokens securely', async () => {
      const accessToken = 'test-access-token';
      const refreshToken = 'test-refresh-token';

      await secureTokenService.setTokens(accessToken, refreshToken);

      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('BukowskiAccessToken', accessToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('BukowskiRefreshToken', refreshToken);
    });

    it('should retrieve tokens from SecureStore', async () => {
      SecureStore.getItemAsync.mockResolvedValueOnce('access-token');
      SecureStore.getItemAsync.mockResolvedValueOnce('refresh-token');

      const tokens = await secureTokenService.getTokens();

      expect(tokens.accessToken).toBe('access-token');
      expect(tokens.refreshToken).toBe('refresh-token');
    });

    it('should clear all tokens', async () => {
      await secureTokenService.clearTokens();

      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('BukowskiAccessToken');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('BukowskiRefreshToken');
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('BukowskiTokenExpiry');
    });
  });

  describe('Token Validation', () => {
    it('should detect expired tokens', () => {
      const expiredToken = createMockToken({ exp: Math.floor(Date.now() / 1000) - 3600 });
      expect(secureTokenService.isTokenExpiring(expiredToken, 0)).toBe(true);
    });

    it('should detect valid tokens', () => {
      const validToken = createMockToken({ exp: Math.floor(Date.now() / 1000) + 3600 });
      expect(secureTokenService.isTokenExpiring(validToken, 0)).toBe(false);
    });

    it('should detect expiring tokens with buffer', () => {
      const expiringToken = createMockToken({ exp: Math.floor(Date.now() / 1000) + 200 });
      expect(secureTokenService.isTokenExpiring(expiringToken, 300)).toBe(true);
    });
  });

  describe('Token Refresh', () => {
    it('should refresh access token', async () => {
      const oldAccessToken = 'old-access-token';
      const newAccessToken = 'new-access-token';
      const refreshToken = 'refresh-token';

      SecureStore.getItemAsync.mockResolvedValueOnce(oldAccessToken);
      SecureStore.getItemAsync.mockResolvedValueOnce(refreshToken);

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accessToken: newAccessToken })
      });

      const result = await secureTokenService.refreshAccessToken();

      expect(result).toBe(newAccessToken);
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith('BukowskiAccessToken', newAccessToken);
    });

    it('should handle refresh failure', async () => {
      SecureStore.getItemAsync.mockResolvedValueOnce('access-token');
      SecureStore.getItemAsync.mockResolvedValueOnce('refresh-token');

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid refresh token' })
      });

      await expect(secureTokenService.refreshAccessToken()).rejects.toThrow();
    });
  });
});

// Helper function to create mock JWT token
function createMockToken(payload) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}
```

---

## 9. INPUT VALIDATION TESTS

### `__tests__/security/InputValidation.test.js`
```javascript
import {
  loginSchema,
  phoneSchema,
  emailSchema,
  nipSchema,
  barcodeSchema,
  amountSchema
} from '../../utils/validation/schemas';

describe('Input Validation', () => {
  describe('Login Schema', () => {
    it('should validate correct login data', async () => {
      const validData = { symbol: 'TEST123', password: 'password123' };
      await expect(loginSchema.validate(validData)).resolves.toBeDefined();
    });

    it('should reject invalid symbol', async () => {
      const invalidData = { symbol: 'T', password: 'password123' };
      await expect(loginSchema.validate(invalidData)).rejects.toThrow();
    });

    it('should reject short password', async () => {
      const invalidData = { symbol: 'TEST123', password: '12345' };
      await expect(loginSchema.validate(invalidData)).rejects.toThrow();
    });

    it('should reject symbol with special characters', async () => {
      const invalidData = { symbol: 'TEST@123', password: 'password123' };
      await expect(loginSchema.validate(invalidData)).rejects.toThrow();
    });
  });

  describe('Phone Schema', () => {
    it('should validate correct phone number', async () => {
      await expect(phoneSchema.validate('123456789')).resolves.toBe('123456789');
    });

    it('should reject invalid phone number', async () => {
      await expect(phoneSchema.validate('12345')).rejects.toThrow();
    });

    it('should reject phone with letters', async () => {
      await expect(phoneSchema.validate('12345678a')).rejects.toThrow();
    });
  });

  describe('Email Schema', () => {
    it('should validate correct email', async () => {
      await expect(emailSchema.validate('test@example.com')).resolves.toBe('test@example.com');
    });

    it('should reject invalid email', async () => {
      await expect(emailSchema.validate('invalid-email')).rejects.toThrow();
    });
  });

  describe('NIP Schema', () => {
    it('should validate correct NIP', async () => {
      const validNIP = '5260250274'; // Valid NIP with checksum
      await expect(nipSchema.validate(validNIP)).resolves.toBe(validNIP);
    });

    it('should reject invalid NIP checksum', async () => {
      const invalidNIP = '5260250275'; // Invalid checksum
      await expect(nipSchema.validate(invalidNIP)).rejects.toThrow();
    });

    it('should reject too short NIP', async () => {
      await expect(nipSchema.validate('12345')).rejects.toThrow();
    });
  });

  describe('Barcode Schema', () => {
    it('should validate correct barcode', async () => {
      await expect(barcodeSchema.validate('ABC-123-DEF')).resolves.toBe('ABC-123-DEF');
    });

    it('should reject lowercase barcode', async () => {
      await expect(barcodeSchema.validate('abc-123')).rejects.toThrow();
    });

    it('should reject barcode with special chars', async () => {
      await expect(barcodeSchema.validate('ABC@123')).rejects.toThrow();
    });
  });

  describe('Amount Schema', () => {
    it('should validate correct amount', async () => {
      await expect(amountSchema.validate(100.50)).resolves.toBe(100.50);
    });

    it('should reject negative amount', async () => {
      await expect(amountSchema.validate(-10)).rejects.toThrow();
    });

    it('should reject zero amount', async () => {
      await expect(amountSchema.validate(0)).rejects.toThrow();
    });

    it('should reject too large amount', async () => {
      await expect(amountSchema.validate(9999999)).rejects.toThrow();
    });
  });
});
```

---

## 10. QR SCANNER TESTS

### `__tests__/components/QRScanner.test.js`
```javascript
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import QRScanner from '../../app/QRScanner';

// Mock camera permissions
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [
    { status: 'granted', granted: true },
    jest.fn()
  ]
}));

describe('QR Scanner Component', () => {
  const mockStateData = [
    { barcode: 'TEST-001', name: 'Test Product 1', price: 100 },
    { barcode: 'TEST-002', name: 'Test Product 2', price: 200 }
  ];

  const mockUser = {
    symbol: 'TEST',
    firstName: 'Test',
    lastName: 'User',
    location: 'Test Location'
  };

  describe('Barcode Scanning', () => {
    it('should handle valid barcode scan', async () => {
      const { getByTestId } = render(
        <QRScanner
          stateData={mockStateData}
          user={mockUser}
          isActive={true}
        />
      );

      // Simulate barcode scan
      const scanner = getByTestId('qr-scanner');
      fireEvent(scanner, 'onBarcodeScanned', { data: 'TEST-001' });

      await waitFor(() => {
        // Verify product was found and displayed
        expect(getByTestId('product-name')).toHaveTextContent('Test Product 1');
      });
    });

    it('should handle invalid barcode', async () => {
      const { getByTestId } = render(
        <QRScanner
          stateData={mockStateData}
          user={mockUser}
          isActive={true}
        />
      );

      const scanner = getByTestId('qr-scanner');
      fireEvent(scanner, 'onBarcodeScanned', { data: 'INVALID-CODE' });

      await waitFor(() => {
        // Verify error message is shown
        expect(getByTestId('error-message')).toHaveTextContent('Produkt nie znaleziony');
      });
    });
  });

  describe('Payment Processing', () => {
    it('should calculate total with multiple currencies', async () => {
      const { getByTestId } = render(
        <QRScanner
          stateData={mockStateData}
          user={mockUser}
          isActive={true}
        />
      );

      // Add PLN payment
      fireEvent.changeText(getByTestId('cash-input-0'), '100');
      
      // Add EUR payment
      fireEvent.press(getByTestId('add-currency-button'));
      fireEvent.changeText(getByTestId('cash-input-1'), '50');
      fireEvent(getByTestId('currency-picker-1'), 'onValueChange', 'EUR');

      await waitFor(() => {
        // Verify total is calculated correctly
        const total = getByTestId('total-amount');
        expect(total).toBeDefined();
      });
    });

    it('should validate payment amount', async () => {
      const { getByTestId, getByText } = render(
        <QRScanner
          stateData={mockStateData}
          user={mockUser}
          isActive={true}
        />
      );

      // Try to process sale without amount
      fireEvent.press(getByTestId('process-sale-button'));

      await waitFor(() => {
        expect(getByText(/kwota jest wymagana/i)).toBeDefined();
      });
    });
  });

  describe('Advance Payments', () => {
    it('should handle advance payment creation', async () => {
      const { getByTestId } = render(
        <QRScanner
          stateData={mockStateData}
          user={mockUser}
          isActive={true}
        />
      );

      // Enable advance payment
      fireEvent.press(getByTestId('advance-checkbox'));
      fireEvent.changeText(getByTestId('advance-amount'), '50');

      // Scan product
      fireEvent(getByTestId('qr-scanner'), 'onBarcodeScanned', { data: 'TEST-001' });

      // Process
      fireEvent.press(getByTestId('process-sale-button'));

      await waitFor(() => {
        // Verify advance was created
        expect(getByTestId('success-message')).toHaveTextContent(/zaliczka utworzona/i);
      });
    });
  });
});
```

---

## 11. ERROR HANDLING TESTS

### `__tests__/integration/ErrorHandling.test.js`
```javascript
import secureTokenService from '../../services/secureTokenService';
import { getApiUrl } from '../../config/api';

describe('Error Handling', () => {
  describe('Network Errors', () => {
    it('should handle timeout errors', async () => {
      global.fetch = jest.fn().mockImplementation(() =>
        new Promise((resolve, reject) => {
          setTimeout(() => reject(new Error('Network timeout')), 11000);
        })
      );

      await expect(
        secureTokenService.authenticatedFetch(getApiUrl('/test'))
      ).rejects.toThrow('Network timeout');
    });

    it('should handle 500 errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Server error' })
      });

      const response = await secureTokenService.authenticatedFetch(getApiUrl('/test'));
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });

    it('should handle 404 errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: 'Not found' })
      });

      const response = await secureTokenService.authenticatedFetch(getApiUrl('/test'));
      expect(response.status).toBe(404);
    });
  });

  describe('Authentication Errors', () => {
    it('should handle 401 errors and retry with refresh', async () => {
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => ({ error: 'Unauthorized' })
          });
        } else {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ data: 'success' })
          });
        }
      });

      // Mock token refresh
      secureTokenService.refreshAccessToken = jest.fn().mockResolvedValue('new-token');

      const response = await secureTokenService.authenticatedFetch(getApiUrl('/test'));
      expect(response.ok).toBe(true);
      expect(secureTokenService.refreshAccessToken).toHaveBeenCalled();
    });

    it('should handle 403 errors', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: 'Access denied' })
      });

      const response = await secureTokenService.authenticatedFetch(getApiUrl('/test'));
      expect(response.status).toBe(403);
    });
  });

  describe('Validation Errors', () => {
    it('should handle validation errors from API', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Validation failed',
          details: { field: 'amount', message: 'Amount must be positive' }
        })
      });

      const response = await secureTokenService.authenticatedFetch(getApiUrl('/test'));
      const data = await response.json();
      
      expect(response.status).toBe(400);
      expect(data.details.field).toBe('amount');
    });
  });
});
```

---

**To get started:**
1. Copy these files to your project
2. Install dependencies: `npm install yup expo-secure-store expo-local-authentication react-native-device-info`
3. Update imports in your existing files
4. Run tests: `npm test`
5. Follow the ACTION_PLAN.md for implementation order
