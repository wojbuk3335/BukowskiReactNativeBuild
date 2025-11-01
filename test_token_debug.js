// Quick token debugging script
import AsyncStorage from '@react-native-async-storage/async-storage';
import tokenService from './services/tokenService';

async function debugTokens() {
    try {
        console.log('=== TOKEN DEBUG ===');
        
        // Check stored tokens
        const tokens = await tokenService.getTokens();
        console.log('🔐 Stored tokens:', {
            hasAccessToken: !!tokens.accessToken,
            hasRefreshToken: !!tokens.refreshToken,
            accessTokenLength: tokens.accessToken?.length || 0,
            refreshTokenLength: tokens.refreshToken?.length || 0
        });
        
        if (tokens.accessToken) {
            // Parse token payload
            const payload = tokenService.parseJWT(tokens.accessToken);
            console.log('📝 Token payload:', payload);
            
            // Check expiry
            const isExpiring = tokenService.isTokenExpiring(tokens.accessToken);
            console.log('⏰ Token expiring:', isExpiring);
            
            if (payload && payload.exp) {
                const expiryDate = new Date(payload.exp * 1000);
                console.log('📅 Token expires at:', expiryDate.toLocaleString());
                console.log('⏱️ Time until expiry:', Math.round((expiryDate.getTime() - Date.now()) / 1000 / 60), 'minutes');
            }
        }
        
        // Test authentication status
        const isAuthenticated = await tokenService.isAuthenticated();
        console.log('🔑 Is authenticated:', isAuthenticated);
        
        // Test getting valid access token
        try {
            const validToken = await tokenService.getValidAccessToken();
            console.log('✅ Can get valid access token:', !!validToken);
        } catch (error) {
            console.log('❌ Error getting valid access token:', error.message);
        }
        
        // Test creating auth headers
        try {
            const headers = await tokenService.getAuthHeaders();
            console.log('📋 Auth headers created:', {
                hasAuthorization: !!headers.Authorization,
                authorizationPreview: headers.Authorization ? headers.Authorization.substring(0, 20) + '...' : 'None'
            });
        } catch (error) {
            console.log('❌ Error creating auth headers:', error.message);
        }
        
    } catch (error) {
        console.error('❌ Debug error:', error);
    }
}

// Export the debug function
export default debugTokens;

// If running directly in Node.js for testing
if (typeof require !== 'undefined' && require.main === module) {
    debugTokens();
}