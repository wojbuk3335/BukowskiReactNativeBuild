// Token Management Service for React Native Mobile App
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiUrl } from '../config/api';
import AuthErrorHandler from '../utils/authErrorHandler';

class TokenService {
    constructor() {
        this.refreshPromise = null; // Prevent multiple refresh requests
        this.isRefreshingToken = false;
    }

    // Get tokens from AsyncStorage
    async getTokens() {
        try {
            const accessToken = await AsyncStorage.getItem('BukowskiAccessToken');
            const refreshToken = await AsyncStorage.getItem('BukowskiRefreshToken');
            return { accessToken, refreshToken };
        } catch (error) {
            console.error('Error getting tokens from AsyncStorage:', error);
            return { accessToken: null, refreshToken: null };
        }
    }

    // Store tokens in AsyncStorage
    async setTokens(accessToken, refreshToken) {
        try {
            if (accessToken) {
                await AsyncStorage.setItem('BukowskiAccessToken', accessToken);
                
                // Also store expiry time for proactive refresh
                const payload = this.parseJWT(accessToken);
                if (payload && payload.exp) {
                    await AsyncStorage.setItem('BukowskiTokenExpiry', (payload.exp * 1000).toString());
                }
            }
            if (refreshToken) {
                await AsyncStorage.setItem('BukowskiRefreshToken', refreshToken);
            }
        } catch (error) {
            console.error('Error storing tokens in AsyncStorage:', error);
        }
    }

    // Clear all tokens
    async clearTokens() {
        try {
            await AsyncStorage.multiRemove([
                'BukowskiAccessToken',
                'BukowskiRefreshToken',
                'BukowskiTokenExpiry',
                'user' // Clear user data as well
            ]);
        } catch (error) {
            console.error('Error clearing tokens from AsyncStorage:', error);
        }
    }

    // Parse JWT token to get payload
    parseJWT(token) {
        if (!token) return null;
        
        try {
            // Split token into parts
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            
            // Decode the payload (middle part)
            const payload = parts[1];
            
            // Add padding if needed for base64 decoding
            let decodedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
            while (decodedPayload.length % 4) {
                decodedPayload += '=';
            }
            
            // Use base64 decoding that works in React Native
            let decoded;
            if (typeof atob !== 'undefined') {
                // Browser environment or React Native with polyfill
                decoded = atob(decodedPayload);
            } else {
                // React Native environment - use Buffer if available
                if (typeof Buffer !== 'undefined') {
                    decoded = Buffer.from(decodedPayload, 'base64').toString('utf8');
                } else {
                    // Manual base64 decode as fallback
                    decoded = this.base64Decode(decodedPayload);
                }
            }
            
            return JSON.parse(decoded);
        } catch (error) {
            console.error('Error parsing JWT:', error);
            return null;
        }
    }

    // Manual base64 decode for React Native fallback
    base64Decode(str) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        let i = 0;
        
        str = str.replace(/[^A-Za-z0-9+/]/g, '');
        
        while (i < str.length) {
            const encoded1 = chars.indexOf(str.charAt(i++));
            const encoded2 = chars.indexOf(str.charAt(i++));
            const encoded3 = chars.indexOf(str.charAt(i++));
            const encoded4 = chars.indexOf(str.charAt(i++));
            
            const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
            
            result += String.fromCharCode((bitmap >> 16) & 255);
            if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
            if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
        }
        
        return result;
    }

    // Check if token is expired or will expire soon
    isTokenExpiring(token, bufferMinutes = 1) {
        const payload = this.parseJWT(token);
        if (!payload || !payload.exp) return true;
        
        const expiryTime = payload.exp * 1000; // Convert to ms
        const bufferTime = bufferMinutes * 60 * 1000; // Buffer in ms
        const now = Date.now();
        
        return now >= (expiryTime - bufferTime);
    }

    // Refresh access token using refresh token
    async refreshAccessToken() {
        // Prevent multiple refresh requests
        if (this.isRefreshingToken) {
            return this.refreshPromise;
        }

        this.isRefreshingToken = true;
        
        const { refreshToken } = await this.getTokens();
        
        if (!refreshToken) {
            await this.clearTokens();
            this.isRefreshingToken = false;
            const error = new Error('No refresh token available');
            await AuthErrorHandler.handleAuthError(error, 'Token Refresh');
            throw error;
        }

        this.refreshPromise = this.performRefresh(refreshToken);
        
        try {
            const result = await this.refreshPromise;
            this.isRefreshingToken = false;
            return result;
        } catch (error) {
            this.isRefreshingToken = false;
            await this.clearTokens();
            await AuthErrorHandler.handleAuthError(error, 'Token Refresh');
            throw error;
        }
    }

    // Perform the actual refresh request
    async performRefresh(refreshToken) {
        try {
            const response = await fetch(getApiUrl('/user/refresh-token'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refreshToken })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Token refresh failed');
            }

            const data = await response.json();
            
            // Store new access token (keep existing refresh token)
            await this.setTokens(data.accessToken, refreshToken);
            
            return data.accessToken;
        } catch (error) {
            console.error('Token refresh error:', error);
            throw error;
        }
    }

    // Get valid access token (refresh if needed)
    async getValidAccessToken() {
        const { accessToken } = await this.getTokens();
        
        if (!accessToken) {
            const error = new Error('No access token available');
            await AuthErrorHandler.handleAuthError(error, 'Get Access Token');
            throw error;
        }

        // Check if token is expiring soon
        const isExpiring = this.isTokenExpiring(accessToken);
        
        if (isExpiring) {
            try {
                const newToken = await this.refreshAccessToken();
                return newToken;
            } catch (error) {
                // Refresh failed, clear tokens
                await this.clearTokens();
                await AuthErrorHandler.handleAuthError(error, 'Token Validation');
                throw error;
            }
        }

        return accessToken;
    }

    // Create authenticated headers for API requests
    async getAuthHeaders() {
        try {
            const token = await this.getValidAccessToken();
            return {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            };
        } catch (error) {
            // Only log errors in non-test environment
            if (typeof jest === 'undefined') {
                console.error('❌ getAuthHeaders error:', error);
            }
            // Return headers without authorization if token is not available
            return {
                'Content-Type': 'application/json'
            };
        }
    }

    // Enhanced fetch function with automatic token handling  
    async authenticatedFetch(url, options = {}) {
        try {
            // Get auth headers
            const authHeaders = await this.getAuthHeaders();
            
            // Merge headers
            const headers = {
                ...authHeaders,
                ...options.headers
            };

            // Make the request
            const response = await fetch(url, {
                ...options,
                headers
            });

            // If we get 401, try to refresh token and retry once
            if (response.status === 401 && !options._retry) {
                // Handle auth response error
                const wasHandled = await AuthErrorHandler.handleResponseError(response, 'Authenticated Fetch');
                if (wasHandled) {
                    throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
                }
                
                try {
                    const newToken = await this.refreshAccessToken();
                    if (newToken) {
                        // Retry the request with new token
                        const newHeaders = {
                            ...headers,
                            'Authorization': `Bearer ${newToken}`
                        };
                        
                        return await fetch(url, {
                            ...options,
                            headers: newHeaders,
                            _retry: true // Prevent infinite retry loop
                        });
                    }
                } catch (refreshError) {
                    // Refresh failed, clear tokens
                    await this.clearTokens();
                    await AuthErrorHandler.handleAuthError(refreshError, 'Fetch Retry');
                    throw refreshError;
                }
            }

            return response;
        } catch (error) {
            // Handle auth errors with automatic redirect
            const wasHandled = await AuthErrorHandler.handleFetchError(error, 'Authenticated Fetch');
            
            // Only log errors in non-test environment if not auth-related
            if (typeof jest === 'undefined' && !wasHandled) {
                console.error('❌ authenticatedFetch error:', error);
            }
            throw error;
        }
    }

    // Helper method to check if user is authenticated
    async isAuthenticated() {
        try {
            const { accessToken } = await this.getTokens();
            return !!accessToken && !this.isTokenExpiring(accessToken, 0);
        } catch (error) {
            return false;
        }
    }

    // Manual logout
    async logout() {
        const { refreshToken } = await this.getTokens();
        
        // Inform server about logout (best effort)
        if (refreshToken) {
            try {
                await fetch(getApiUrl('/user/logout'), {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ refreshToken })
                });
            } catch (error) {
                // Server logout failed, continuing with local logout
                console.error('Server logout failed:', error);
            }
        }

        await this.clearTokens();
    }
}

// Create singleton instance
const tokenService = new TokenService();

export default tokenService;