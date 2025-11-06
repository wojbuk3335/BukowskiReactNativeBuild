/**
 * @fileoverview Test utilities and mock components for Jest tests
 * This is NOT a test file - it contains helpers for other tests
 */
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { render } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Mock Alert globally
global.Alert = {
  alert: jest.fn(),
};

// Mock expo-router navigation
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  usePathname: () => '/',
  useFocusEffect: jest.fn(),
}));

// Mock @react-navigation/native hooks
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

// Import real GlobalStateContext
import { GlobalStateContext } from '../../context/GlobalState';

// Mock GlobalStateProvider
export const GlobalStateProvider = ({ children, value }) => {
  const mockContextValue = {
    // User data
    user: { name: 'Test User', company: 'Bukowski Sp. z o.o.', symbol: value?.user?.symbol || 'PLN', sellingPoint: 'PLN' },
    currentUser: { name: 'Test User', company: 'Bukowski Sp. z o.o.' },
    setCurrentUser: jest.fn(),
    isLoggedIn: true,
    setIsLoggedIn: jest.fn(),
    logout: jest.fn(),
    
    // State data
    stateData: [],
    users: [{ id: 1, name: 'Test User' }],
    
    // Products and goods
    products: [],
    setProducts: jest.fn(),
    goods: [
      { id: 1, name: 'Test Good 1', price: 100 },
      { id: 2, name: 'Test Good 2', price: 200 }
    ],
    setGoods: jest.fn(),
    
    // Financial operations with sample data for tests
    financialOperations: [
      { id: 1, amount: 500, type: 'dopisanie', reason: 'Test income', date: '2025-11-05', symbol: 'PLN' },
      { id: 2, amount: -200, type: 'odpisanie', reason: 'Test expense', date: '2025-11-05', symbol: 'PLN' }
    ],
    setFinancialOperations: jest.fn(),
    filteredData: [
      { id: 1, amount: 500, type: 'dopisanie', reason: 'Test income', date: '2025-11-05', symbol: 'PLN' },
      { id: 2, amount: -200, type: 'odpisanie', reason: 'Test expense', date: '2025-11-05', symbol: 'PLN' }
    ],
    setFilteredData: jest.fn(),
    
    // Form data
    inputValue: '',
    setInputValue: jest.fn(),
    selectedSymbol: 'PLN',
    setSelectedSymbol: jest.fn(),
    reason: '',
    setReason: jest.fn(),
    
    // UI state
    showForm: false,
    setShowForm: jest.fn(),
    loading: false,
    setLoading: jest.fn(),
    
    // Functions
    calculateTotals: jest.fn(() => ({ cash: 300, card: 0, total: 300 })),
    clearForm: jest.fn(),
    handleFinancialOperation: jest.fn().mockResolvedValue(true),
    refreshFinancialOperations: jest.fn().mockResolvedValue(),
    fetchGoods: jest.fn().mockResolvedValue([]),
    fetchUsers: jest.fn().mockResolvedValue([]),
    fetchSalesData: jest.fn().mockResolvedValue([]),
    fetchTransferredItems: jest.fn().mockResolvedValue([]),
    fetchReceivedItems: jest.fn().mockResolvedValue([]),
    fetchAdvances: jest.fn().mockResolvedValue([]),
    fetchFinancialOperations: jest.fn().mockResolvedValue([]),
    
    // Mock goods data with proper structure
    goods: [
      {
        _id: 'product1',
        fullName: 'Test Product 1',
        size: 'M',
        from: 'TestSupplier',
        source: 'Internal',
        cash: [],
        card: []
      },
      {
        _id: 'product2', 
        fullName: 'Test Product 2',
        size: 'L',
        from: 'TestSupplier2',
        source: 'External',
        cash: [],
        card: []
      }
    ],
    getApiUrl: jest.fn().mockReturnValue('https://mock-api.com'),
    
    // Additional context values
    ...value
  };

  return (
    <GlobalStateContext.Provider value={mockContextValue}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const TestWrapper = ({ children, contextValue }) => {
  return (
    <NavigationContainer>
      <GlobalStateProvider value={contextValue}>
        {children}
      </GlobalStateProvider>
    </NavigationContainer>
  );
};

// Helper function for rendering with context
export const renderWithContext = (component, contextValue = {}) => {
  return render(
    <TestWrapper contextValue={contextValue}>
      {component}
    </TestWrapper>
  );
};

export { GlobalStateContext };
export default TestWrapper;

// Test utilities - moved to avoid Jest treating as test file

// Dummy test to prevent Jest error
describe('TestUtils', () => {
  it('should be a utility file', () => {
    expect(true).toBe(true);
  });
});