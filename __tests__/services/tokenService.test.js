// Simple test to verify SecureStore migration
describe('TokenService - SecureStore Migration Verification', () => {
  test('✅ tokenService.js importuje expo-secure-store zamiast AsyncStorage', () => {
    const fs = require('fs');
    const path = require('path');
    
    const tokenServicePath = path.join(__dirname, '../../services/tokenService.js');
    const fileContent = fs.readFileSync(tokenServicePath, 'utf8');
    
    // Verify SecureStore is imported
    expect(fileContent).toContain("import * as SecureStore from 'expo-secure-store'");
    
    // Verify AsyncStorage is NOT imported
    expect(fileContent).not.toContain("import AsyncStorage from '@react-native-async-storage/async-storage'");
    expect(fileContent).not.toContain("from 'async-storage'");
  });

  test('✅ Wszystkie metody używają SecureStore API', () => {
    const fs = require('fs');
    const path = require('path');
    
    const tokenServicePath = path.join(__dirname, '../../services/tokenService.js');
    const fileContent = fs.readFileSync(tokenServicePath, 'utf8');
    
    // Verify SecureStore methods are used
    expect(fileContent).toContain('SecureStore.getItemAsync');
    expect(fileContent).toContain('SecureStore.setItemAsync');
    expect(fileContent).toContain('SecureStore.deleteItemAsync');
    
    // Verify old AsyncStorage methods are NOT used
    expect(fileContent).not.toContain('AsyncStorage.getItem(');
    expect(fileContent).not.toContain('AsyncStorage.setItem(');
    expect(fileContent).not.toContain('AsyncStorage.removeItem(');
    expect(fileContent).not.toContain('AsyncStorage.multiRemove(');
  });

  test('✅ Klucze tokenów są poprawnie używane', () => {
    const fs = require('fs');
    const path = require('path');
    
    const tokenServicePath = path.join(__dirname, '../../services/tokenService.js');
    const fileContent = fs.readFileSync(tokenServicePath, 'utf8');
    
    // Verify correct keys are used
    expect(fileContent).toContain("'BukowskiAccessToken'");
    expect(fileContent).toContain("'BukowskiRefreshToken'");
    expect(fileContent).toContain("'BukowskiTokenExpiry'");
  });

  test('✅ package.json zawiera expo-secure-store', () => {
    const fs = require('fs');
    const path = require('path');
    
    const packageJsonPath = path.join(__dirname, '../../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    expect(packageJson.dependencies['expo-secure-store']).toBeDefined();
    expect(packageJson.dependencies['expo-secure-store']).toBeTruthy();
  });
});
