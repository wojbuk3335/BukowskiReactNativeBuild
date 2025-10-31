// Quick test to check authentication status
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tokenService from '../services/tokenService';
import { getApiUrl } from '../config/api';
import { forceResetAuth } from '../utils/forceResetAuth';

const AuthTest = () => {
    const [authStatus, setAuthStatus] = useState('Checking...');
    const [tokenInfo, setTokenInfo] = useState('');

    const checkAuthStatus = async () => {
        try {
            console.log('🔍 AUTH TEST: Starting...');
            
            // Check AsyncStorage
            const accessToken = await AsyncStorage.getItem('accessToken');
            const refreshToken = await AsyncStorage.getItem('refreshToken');
            const user = await AsyncStorage.getItem('user');
            
            console.log('🔍 AUTH TEST: Access token exists:', !!accessToken);
            console.log('🔍 AUTH TEST: Refresh token exists:', !!refreshToken);
            console.log('🔍 AUTH TEST: User exists:', !!user);
            
            if (!accessToken) {
                setAuthStatus('❌ No access token found');
                setTokenInfo('Please login first');
                return;
            }
            
            // Test authenticated request
            const response = await tokenService.authenticatedFetch(getApiUrl('/transfer'));
            console.log('🔍 AUTH TEST: Transfer API response status:', response.status);
            
            if (response.status === 200) {
                setAuthStatus('✅ Authentication working');
                setTokenInfo(`Token valid, API accessible`);
            } else if (response.status === 401) {
                setAuthStatus('❌ Token invalid or expired');
                setTokenInfo('Need to login again');
            } else {
                setAuthStatus(`⚠️ Unexpected status: ${response.status}`);
                setTokenInfo('API returned unexpected response');
            }
            
        } catch (error) {
            console.log('❌ AUTH TEST: Error:', error);
            setAuthStatus('❌ Error occurred');
            setTokenInfo(error.message);
        }
    };

    const clearTokens = async () => {
        await AsyncStorage.multiRemove(['accessToken', 'refreshToken', 'user']);
        setAuthStatus('🗑️ Tokens cleared');
        setTokenInfo('Ready for fresh login');
    };

    useEffect(() => {
        checkAuthStatus();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Authentication Test</Text>
            <Text style={styles.status}>{authStatus}</Text>
            <Text style={styles.info}>{tokenInfo}</Text>
            
            <TouchableOpacity style={styles.button} onPress={checkAuthStatus}>
                <Text style={styles.buttonText}>Re-check</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={clearTokens}>
                <Text style={styles.buttonText}>Clear Tokens</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    status: {
        fontSize: 18,
        marginBottom: 10,
        textAlign: 'center',
    },
    info: {
        fontSize: 14,
        marginBottom: 30,
        textAlign: 'center',
        color: '#666',
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        minWidth: 150,
    },
    clearButton: {
        backgroundColor: '#FF3B30',
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
    },
});

export default AuthTest;