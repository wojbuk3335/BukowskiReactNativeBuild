// Test file for mobile authentication
import { getApiUrl } from '../config/api';
import tokenService from '../services/tokenService';

// Test function to verify authentication works
export const testAuthentication = async () => {
    console.log('🧪 Testing mobile authentication...');
    
    try {
        // Check if we have stored tokens
        const { accessToken, refreshToken } = await tokenService.getTokens();
        console.log('📱 Stored tokens:', { 
            hasAccessToken: !!accessToken, 
            hasRefreshToken: !!refreshToken 
        });
        
        if (accessToken) {
            console.log('🔍 Parsed token data:', tokenService.parseJWT(accessToken));
        }
        
        // Test authenticated request to get state data
        console.log('🌐 Testing authenticated request to /api/state...');
        const response = await tokenService.authenticatedFetch(getApiUrl('/state'));
        
        console.log('📊 Response status:', response.status);
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Authentication successful! Data received:', data.length, 'items');
            return { success: true, data };
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.log('❌ Authentication failed:', response.status, errorData);
            return { success: false, error: errorData };
        }
        
    } catch (error) {
        console.log('💥 Test error:', error.message);
        return { success: false, error: error.message };
    }
};

// Test login function
export const testLogin = async (email, password) => {
    console.log('🧪 Testing login process...');
    
    try {
        const response = await fetch(getApiUrl('/user/login'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Login successful:', data);
            
            // Store tokens
            if (data.token || data.accessToken) {
                const accessToken = data.accessToken || data.token;
                const refreshToken = data.refreshToken;
                await tokenService.setTokens(accessToken, refreshToken);
                console.log('💾 Tokens stored successfully');
            }
            
            return { success: true, data };
        } else {
            const errorData = await response.json();
            console.log('❌ Login failed:', errorData);
            return { success: false, error: errorData };
        }
        
    } catch (error) {
        console.log('💥 Login error:', error.message);
        return { success: false, error: error.message };
    }
};

// Test function to check if authentication is required
export const testPublicEndpoint = async () => {
    console.log('🧪 Testing public endpoint (should work without auth)...');
    
    try {
        // Test the login endpoint - this should be public
        const response = await fetch(getApiUrl('/user/login'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email: 'test@example.com', password: 'wrongpassword' }),
        });
        
        console.log('📊 Public endpoint response status:', response.status);
        
        if (response.status === 401) {
            console.log('✅ Public endpoint working (got expected 401 for wrong credentials)');
            return { success: true, message: 'Public endpoint accessible' };
        } else {
            console.log('⚠️ Unexpected response from public endpoint');
            return { success: false, message: 'Unexpected response' };
        }
        
    } catch (error) {
        console.log('💥 Public endpoint test error:', error.message);
        return { success: false, error: error.message };
    }
};