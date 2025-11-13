// Mock AppContext for testing
import React from 'react';

const mockContext = {
  employees: [
    { id: 'EMP001', name: 'Jan Kowalski', active: true },
    { id: 'EMP002', name: 'Anna Nowak', active: true }
  ],
  user: { id: 'USER001', name: 'Admin' },
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  addEmployee: jest.fn(),
  updateEmployee: jest.fn(),
  deleteEmployee: jest.fn()
};

export const AppProvider = ({ children }) => {
  return (
    <AppContext.Provider value={mockContext}>
      {children}
    </AppContext.Provider>
  );
};

export const AppContext = React.createContext(mockContext);

export const useAppContext = () => mockContext;