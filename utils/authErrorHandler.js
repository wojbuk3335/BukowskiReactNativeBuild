// Authentication Error Handler for Mobile App
import { router } from "expo-router";
import tokenService from "../services/tokenService";

class AuthErrorHandler {
    // Check if error is related to authentication/token issues
    static isAuthError(error) {
        if (!error) return false;
        
        const errorMessage = error.message?.toLowerCase() || '';
        const errorString = error.toString().toLowerCase();
        
        // Common authentication error patterns
        const authErrorPatterns = [
            'no refresh token available',
            'no access token available',
            'token refresh failed',
            'unauthorized',
            'authentication failed',
            'invalid token',
            'token expired',
            'jwt',
            'refresh token',
            'access token'
        ];
        
        return authErrorPatterns.some(pattern => 
            errorMessage.includes(pattern) || errorString.includes(pattern)
        );
    }
    
    // Check if response indicates authentication error
    static isAuthResponse(response) {
        if (!response) return false;
        return response.status === 401 || response.status === 403;
    }
    
    // Handle authentication errors with automatic redirect
    static async handleAuthError(error, context = 'Unknown') {
        // Don't log during logout process to keep console clean
        if (!tokenService.isLoggingOut) {
            console.log(`🔄 Auth error detected in ${context}:`, error?.message || error);
        }
        
        try {
            // Clear all tokens and user data
            await tokenService.clearTokens();
            
            // Redirect to login page
            router.replace("/(auth)/sign-in");
            
            // Don't log during logout process
            if (!tokenService.isLoggingOut) {
                console.log('✅ User redirected to login page');
            }
        } catch (redirectError) {
            console.error('❌ Error during redirect:', redirectError);
            // Fallback - try to go to root
            try {
                router.replace("/");
            } catch (fallbackError) {
                console.error('❌ Fallback redirect failed:', fallbackError);
            }
        }
    }
    
    // Wrapper for fetch operations with automatic auth error handling
    static async handleFetchError(error, context = 'API Request') {
        if (this.isAuthError(error)) {
            await this.handleAuthError(error, context);
            return true; // Indicates error was handled
        }
        return false; // Indicates error was not auth-related
    }
    
    // Wrapper for response handling with automatic auth error handling
    static async handleResponseError(response, context = 'API Response') {
        if (this.isAuthResponse(response)) {
            const error = new Error(`Authentication failed: ${response.status} ${response.statusText}`);
            await this.handleAuthError(error, context);
            return true; // Indicates error was handled
        }
        return false; // Indicates response was not auth-related error
    }
}

export default AuthErrorHandler;