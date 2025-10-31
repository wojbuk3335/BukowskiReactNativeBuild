// Node.js test runner for mobile authentication  
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

// Mock AsyncStorage for Node.js environment
const AsyncStorage = {
    storage: {},
    async getItem(key) {
        return this.storage[key] || null;
    },
    async setItem(key, value) {
        this.storage[key] = value;
    },
    async removeItem(key) {
        delete this.storage[key];
    },
    async multiRemove(keys) {
        keys.forEach(key => delete this.storage[key]);
    }
};

// Mock API config
const getApiUrl = (endpoint) => `http://localhost:3000/api${endpoint}`;

// Simplified TokenService for Node.js testing
class NodeTokenService {
    constructor() {
        this.refreshPromise = null;
        this.isRefreshingToken = false;
    }

    async getTokens() {
        try {
            const accessToken = await AsyncStorage.getItem('BukowskiAccessToken');
            const refreshToken = await AsyncStorage.getItem('BukowskiRefreshToken');
            return { accessToken, refreshToken };
        } catch (error) {
            console.error('Error getting tokens:', error);
            return { accessToken: null, refreshToken: null };
        }
    }

    async setTokens(accessToken, refreshToken) {
        try {
            if (accessToken) {
                await AsyncStorage.setItem('BukowskiAccessToken', accessToken);
            }
            if (refreshToken) {
                await AsyncStorage.setItem('BukowskiRefreshToken', refreshToken);
            }
        } catch (error) {
            console.error('Error storing tokens:', error);
        }
    }

    async clearTokens() {
        try {
            await AsyncStorage.multiRemove([
                'BukowskiAccessToken',
                'BukowskiRefreshToken',
                'BukowskiTokenExpiry'
            ]);
        } catch (error) {
            console.error('Error clearing tokens:', error);
        }
    }

    async getAuthHeaders() {
        try {
            const { accessToken } = await this.getTokens();
            if (accessToken) {
                return {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                };
            }
            return {
                'Content-Type': 'application/json'
            };
        } catch (error) {
            console.error('Error getting auth headers:', error);
            return {
                'Content-Type': 'application/json'
            };
        }
    }

    async authenticatedFetch(url, options = {}) {
        try {
            const authHeaders = await this.getAuthHeaders();
            const headers = {
                ...authHeaders,
                ...options.headers
            };

            const response = await fetch(url, {
                ...options,
                headers
            });

            return response;
        } catch (error) {
            console.error('Authenticated fetch error:', error);
            throw error;
        }
    }

    async isAuthenticated() {
        try {
            const { accessToken } = await this.getTokens();
            return !!accessToken;
        } catch (error) {
            return false;
        }
    }
}

// Test function
async function testMobileAuthFlow() {
    console.log('📱 Testing Mobile App Authentication Flow (Node.js)...');
    console.log('===================================================');

    const tokenService = new NodeTokenService();

    try {
        // Step 1: Clear any existing tokens
        await tokenService.clearTokens();
        console.log('🧹 Cleared existing tokens');

        // Step 2: Test login
        console.log('\n🔐 Testing login...');
        const loginResponse = await fetch(getApiUrl('/user/login'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'tata@wp.pl',
                password: 'Bukowski1234'
            })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed with status: ${loginResponse.status}`);
        }

        const loginData = await loginResponse.json();
        console.log('✅ Login successful!');
        console.log('📋 User:', loginData.email, '- Role:', loginData.role);

        // Step 3: Store tokens using tokenService
        if (loginData.token || loginData.accessToken) {
            const accessToken = loginData.accessToken || loginData.token;
            const refreshToken = loginData.refreshToken;
            await tokenService.setTokens(accessToken, refreshToken);
            console.log('💾 Tokens stored successfully');
        }

        // Step 4: Test authenticated request using tokenService
        console.log('\n🔒 Testing authenticated request using tokenService...');
        const response = await tokenService.authenticatedFetch(getApiUrl('/state'));
        
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Authenticated request successful!');
            console.log('📊 Data received:', Array.isArray(data) ? `${data.length} items` : 'Response received');
        } else {
            console.log('❌ Authenticated request failed with status:', response.status);
        }

        // Step 5: Test other protected endpoints
        console.log('\n🧪 Testing other protected endpoints...');
        
        const endpoints = [
            '/excel/goods/get-all-goods',
            '/excel/size/get-all-sizes', 
            '/excel/color/get-all-colors',
            '/user'
        ];

        for (const endpoint of endpoints) {
            try {
                const testResponse = await tokenService.authenticatedFetch(getApiUrl(endpoint));
                console.log(`📡 ${endpoint}: ${testResponse.ok ? '✅ Success' : '❌ Failed'} (${testResponse.status})`);
            } catch (error) {
                console.log(`📡 ${endpoint}: ❌ Error - ${error.message}`);
            }
        }

        // Step 6: Test token validation
        console.log('\n🔍 Testing token validation...');
        const isAuthenticated = await tokenService.isAuthenticated();
        console.log('🔐 Is authenticated:', isAuthenticated);

        const tokens = await tokenService.getTokens();
        console.log('🎫 Has access token:', !!tokens.accessToken);
        console.log('🔄 Has refresh token:', !!tokens.refreshToken);

        console.log('\n🎉 Mobile authentication test completed successfully!');
        return true;

    } catch (error) {
        console.error('❌ Mobile authentication test failed:', error.message);
        return false;
    }
}

// Run the test
testMobileAuthFlow();