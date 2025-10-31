// Mobile App Authentication Test with Real Credentials
import tokenService from '../services/tokenService';
import { getApiUrl } from '../config/api';

export const testMobileAuth = async () => {
    console.log('📱 Testing Mobile App Authentication...');
    console.log('=====================================');

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
};