// Global State Context for the application
import React, { createContext, useState, useContext } from 'react';

const mockGlobalState = {
  user: { 
    id: 'USER001', 
    name: 'Admin User',
    email: 'test@test.com' 
  },
  stateData: [
    { id: 1, employeeName: 'Jan Kowalski', saleValue: 1000 },
    { id: 2, employeeName: 'Anna Nowak', saleValue: 1500 }
  ],
  users: [
    { id: 'EMP001', name: 'Jan Kowalski', active: true },
    { id: 'EMP002', name: 'Anna Nowak', active: true }
  ],
  goods: [
    { id: 'GOOD001', name: 'Testowy produkt', price: 100 }
  ],
  filteredData: [
    { id: 1, employeeName: 'Jan Kowalski', saleValue: 1000 },
    { id: 2, employeeName: 'Anna Nowak', saleValue: 1500 }
  ],
  transferredItems: [],
  deductionsData: [],
  logout: jest ? jest.fn() : () => {},
  fetchUsers: jest ? jest.fn().mockResolvedValue([]) : async () => [],
  fetchGoods: jest ? jest.fn().mockResolvedValue([]) : async () => [],
  setStateData: jest ? jest.fn() : () => {},
  setUsers: jest ? jest.fn() : () => {},
  setGoods: jest ? jest.fn() : () => {},
  // Add work hours related state
  workHours: {},
  setWorkHours: jest ? jest.fn() : () => {},
  saveWorkHours: jest ? jest.fn().mockResolvedValue(true) : async () => true,
  loadWorkHours: jest ? jest.fn().mockResolvedValue(null) : async () => null
};

export const GlobalStateContext = createContext(mockGlobalState);

export const GlobalStateProvider = ({ children, testValue }) => {
  const [state, setState] = useState(testValue || mockGlobalState);
  
  return (
    <GlobalStateContext.Provider value={state}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (context === undefined && typeof jest !== 'undefined') {
    // In test environment, return mock data
    return mockGlobalState;
  }
  return context || mockGlobalState;
};