// Debug script to test API connection
import { getApiUrl } from './config/api';

export const testApiConnection = async () => {
    console.log('🔍 Testing API connection...');
    console.log('🌐 API Base URL:', getApiUrl(''));
    
    try {
        // Test basic connection
        const response = await fetch(getApiUrl('/'), {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        console.log('📡 Response Status:', response.status);
        console.log('📡 Response OK:', response.ok);
        
        if (response.ok) {
            const data = await response.text();
            console.log('✅ API Connection successful!');
            console.log('📄 Response:', data);
        } else {
            console.log('❌ API Connection failed:', response.statusText);
        }
        
        return response.ok;
        
    } catch (error) {
        console.log('❌ API Connection error:', error.message);
        return false;
    }
};

// Test login endpoint specifically
export const testLoginEndpoint = async () => {
    console.log('🔍 Testing login endpoint...');
    
    try {
        const response = await fetch(getApiUrl('/user/login'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'test@test.com',
                password: 'test123'
            }),
        });
        
        console.log('📡 Login endpoint status:', response.status);
        
        if (response.status === 401 || response.status === 400) {
            console.log('✅ Login endpoint is reachable (got auth error as expected)');
            return true;
        } else if (response.ok) {
            console.log('✅ Login endpoint is working');
            return true;
        } else {
            console.log('❌ Login endpoint issue:', response.statusText);
            return false;
        }
        
    } catch (error) {
        console.log('❌ Login endpoint error:', error.message);
        return false;
    }
};