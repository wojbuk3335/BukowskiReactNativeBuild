// Force clear all tokens and reset authentication
import AsyncStorage from '@react-native-async-storage/async-storage';

export const forceResetAuth = async () => {
    try {
        console.log('🔄 FORCE RESET: Clearing all auth data...');
        
        // Clear ALL possible token keys (old and new)
        await AsyncStorage.multiRemove([
            'accessToken',           // Old key
            'refreshToken',          // Old key  
            'BukowskiAccessToken',   // New key
            'BukowskiRefreshToken',  // New key
            'BukowskiTokenExpiry',   // Token expiry
            'user',                  // User data
            'AdminToken'             // Admin token if exists
        ]);
        
        console.log('✅ FORCE RESET: All tokens cleared');
        
        // Show all remaining keys for debugging
        const allKeys = await AsyncStorage.getAllKeys();
        console.log('🔍 FORCE RESET: Remaining AsyncStorage keys:', allKeys);
        
        return true;
    } catch (error) {
        console.error('❌ FORCE RESET: Error clearing tokens:', error);
        return false;
    }
};