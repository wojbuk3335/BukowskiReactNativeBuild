// Test API connection without tokens to verify backend is working
const API_BASE_URL = 'http://localhost:3000/api';

async function testConnection() {
    try {
        // Test 1: Login (should work without token)
        console.log('🔐 Testing login...');
        const loginResponse = await fetch(`${API_BASE_URL}/user/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'tata@wp.pl',
                password: 'Bukowski1234'
            })
        });
        
        if (loginResponse.ok) {
            const loginData = await loginResponse.json();
            console.log('✅ Login successful!');
            console.log('Full response:', JSON.stringify(loginData, null, 2));
            console.log('Token received:', !!loginData.token);
            console.log('AccessToken received:', !!loginData.accessToken);
            console.log('RefreshToken received:', !!loginData.refreshToken);
            
            // Test 2: Try to access protected endpoint without token
            console.log('\n🚫 Testing protected endpoint without token...');
            const stateResponse = await fetch(`${API_BASE_URL}/state`);
            console.log('State endpoint status:', stateResponse.status);
            
            // Test 3: Try to access protected endpoint with token
            if (loginData.token || loginData.accessToken) {
                console.log('\n🔑 Testing protected endpoint with token...');
                const token = loginData.accessToken || loginData.token;
                const protectedResponse = await fetch(`${API_BASE_URL}/state`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                console.log('Protected endpoint status:', protectedResponse.status);
                
                if (protectedResponse.ok) {
                    const data = await protectedResponse.json();
                    console.log('✅ Protected endpoint accessible with token!');
                    console.log('Data received:', Array.isArray(data) ? `${data.length} items` : 'Response received');
                } else {
                    console.log('❌ Protected endpoint failed with token');
                    console.log('Response:', await protectedResponse.text().catch(() => 'Could not read response'));
                }
            }
            
        } else {
            console.log('❌ Login failed');
            console.log('Status:', loginResponse.status);
            console.log('Response:', await loginResponse.text().catch(() => 'Could not read response'));
        }
        
    } catch (error) {
        console.error('❌ Connection test failed:', error.message);
    }
}

// Run the test
testConnection();