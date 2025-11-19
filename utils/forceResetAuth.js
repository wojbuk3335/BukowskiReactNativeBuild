// Force clear all tokens and reset authentication
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from '../services/logger';

export const forceResetAuth = async () => {
    try {
        Logger.debug('🔄 FORCE RESET: Clearing all auth data...');
        
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
        
        Logger.debug('✅ FORCE RESET: All tokens cleared');
        
        // Show all remaining keys for debugging
        const allKeys = await AsyncStorage.getAllKeys();
        Logger.debug('🔍 FORCE RESET: Remaining AsyncStorage keys:', allKeys);
        
        return true;
    } catch (error) {
        Logger.error('❌ FORCE RESET: Error clearing tokens:', error);
        return false;
    }
};
