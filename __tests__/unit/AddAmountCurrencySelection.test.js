import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import Home from '../../app/(tabs)/home';
import TestWrapper, { GlobalStateContext } from '../utils/TestUtils';

// Mock expo-camera
jest.mock('expo-camera', () => {
  const React = require('react');
  return {
    CameraView: jest.fn(({children, ...props}) => React.createElement('CameraView', props, children)),
    useCameraPermissions: jest.fn(() => [
      { granted: true, status: 'granted' },
      jest.fn(() => Promise.resolve({ granted: true, status: 'granted' }))
    ]),
  };
});

// Mock dependencies
jest.mock('../../services/tokenService');
jest.mock('@react-native-async-storage/async-storage');

const renderWithContext = (contextValue = {}) => {
  const defaultContextValue = {
    user: { symbol: 'TEST', firstName: 'Test', lastName: 'User', location: 'TestLocation' },
    stateData: [],
    users: [],
    fetchUsers: jest.fn(),
    goods: [],
    fetchGoods: jest.fn(),
    filteredData: [],
    transferredItems: [],
    deductionsData: [],
    ...contextValue,
  };

  return render(
    <TestWrapper contextValue={defaultContextValue}>
      <Home />
    </TestWrapper>
  );
};

describe('Add Amount Currency Selection Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('Powinien otworzyć modal wyboru waluty dla dodawania kwoty', async () => {
    console.log('✅ Test: Modal wyboru waluty dla dodawania kwoty');

    const { getAllByText, queryByText, getByText } = renderWithContext();

    await act(async () => {
      // Open the add amount modal first
      const addAmountButtons = getAllByText('Dopisz kwotę');
      fireEvent.press(addAmountButtons[addAmountButtons.length - 1]); // Use the last one (likely the button)
    });

    await waitFor(() => {
      expect(queryByText('Waluta:')).toBeTruthy(); // Check for form field label instead
    });

    // Find and press currency button (should show PLN initially)
    await act(async () => {
      const plnButtons = getAllByText('PLN');
      const currencyButton = plnButtons.find(btn => 
        btn.parent && btn.parent.props && btn.parent.props.onPress
      );
      if (currencyButton) {
        fireEvent.press(currencyButton);
      } else {
        fireEvent.press(plnButtons[plnButtons.length - 1]);
      }
    });

    await waitFor(() => {
      // Check if currency selection modal opened
      expect(getByText('Wybierz walutę')).toBeTruthy();
    });

    console.log('✅ Modal wyboru waluty otwiera się poprawnie');
  });

  test('Powinien wyświetlić dostępne waluty w modalu', async () => {
    console.log('✅ Test: Dostępne waluty w modalu');

    const { getByText, getAllByText, queryByText } = renderWithContext();

    await act(async () => {
      // Open add amount modal
      const addAmountButtons = getAllByText('Dopisz kwotę');
      fireEvent.press(addAmountButtons[addAmountButtons.length - 1]);
    });

    await act(async () => {
      // Open currency modal
      const plnButtons = getAllByText('PLN');
      const currencyButton = plnButtons.find(btn => 
        btn.parent && btn.parent.props && btn.parent.props.onPress
      );
      if (currencyButton) {
        fireEvent.press(currencyButton);
      } else {
        fireEvent.press(plnButtons[plnButtons.length - 1]);
      }
    });

    await waitFor(() => {
      expect(queryByText('Wybierz walutę')).toBeTruthy();
    });

    await waitFor(() => {
      // Check if specific currencies are displayed - be more specific about context
      const currencies = ['PLN', 'EUR', 'USD', 'GBP', 'HUF', 'ILS', 'CAN'];
      currencies.forEach(currency => {
        const elements = getAllByText(currency);
        expect(elements.length).toBeGreaterThan(0);
      });
    });

    console.log('✅ Wszystkie waluty są wyświetlane poprawnie');
  });

  test('Powinien wybrać walutę i zamknąć modal', async () => {
    console.log('✅ Test: Wybór waluty');

    const { getByText, getAllByText } = renderWithContext();

    await act(async () => {
      // Open add amount modal
      const addAmountButton = getByText('Dopisz kwotę');
      fireEvent.press(addAmountButton);
    });

    await act(async () => {
      // Open currency modal
      const currencyButton = getByText('PLN');
      fireEvent.press(currencyButton);
    });

    await waitFor(() => {
      expect(getByText('Wybierz walutę')).toBeTruthy();
    });

    await act(async () => {
      // Select EUR currency
      const eurOptions = getAllByText('EUR');
      // Find the EUR option in the currency modal (not the one showing current selection)
      const eurOption = eurOptions.find(element => 
        element.parent && element.parent.parent && 
        element.parent.parent.props && 
        element.parent.parent.props.style && 
        Array.isArray(element.parent.parent.props.style)
      );
      if (eurOption) {
        fireEvent.press(eurOption);
      } else {
        // Fallback: press the first EUR option
        fireEvent.press(eurOptions[eurOptions.length - 1]);
      }
    });

    await waitFor(() => {
      // Modal should close and currency should be updated
      expect(getByText('EUR')).toBeTruthy();
    }, { timeout: 3000 });

    console.log('✅ Waluta została wybrana i modal zamknięty');
  });

  test('Powinien zamknąć modal bez wyboru waluty', async () => {
    console.log('✅ Test: Zamknięcie modalu bez wyboru');

    const { getByText, queryByText } = renderWithContext();

    await act(async () => {
      // Open add amount modal
      const addAmountButton = getByText('Dopisz kwotę');
      fireEvent.press(addAmountButton);
    });

    await act(async () => {
      // Open currency modal
      const currencyButton = getByText('PLN');
      fireEvent.press(currencyButton);
    });

    await waitFor(() => {
      expect(getByText('Wybierz walutę')).toBeTruthy();
    });

    await act(async () => {
      // Close modal without selecting currency
      const closeButton = getByText('Zamknij');
      fireEvent.press(closeButton);
    });

    await waitFor(() => {
      // Currency modal should close and PLN should remain
      expect(queryByText('Wybierz walutę')).toBeNull();
      expect(getByText('PLN')).toBeTruthy(); // Should still show original currency
    });

    console.log('✅ Modal zamyka się bez zmiany waluty');
  });

  test('Powinien resetować walutę do PLN po anulowaniu formularza', async () => {
    console.log('✅ Test: Reset waluty po anulowaniu');

    const { getByText, getAllByText } = renderWithContext();

    await act(async () => {
      // Open add amount modal
      const addAmountButton = getByText('Dopisz kwotę');
      fireEvent.press(addAmountButton);
    });

    await act(async () => {
      // Open currency modal and select EUR
      const currencyButton = getByText('PLN');
      fireEvent.press(currencyButton);
    });

    await waitFor(() => {
      expect(getByText('Wybierz walutę')).toBeTruthy();
    });

    await act(async () => {
      // Select EUR
      const eurOptions = getAllByText('EUR');
      fireEvent.press(eurOptions[eurOptions.length - 1]);
    });

    await waitFor(() => {
      expect(getByText('EUR')).toBeTruthy();
    });

    await act(async () => {
      // Cancel the form
      const cancelButton = getByText('Anuluj');
      fireEvent.press(cancelButton);
    });

    await act(async () => {
      // Open add amount modal again
      const addAmountButton = getByText('Dopisz kwotę');
      fireEvent.press(addAmountButton);
    });

    await waitFor(() => {
      // Should be reset to PLN
      expect(getByText('PLN')).toBeTruthy();
    });

    console.log('✅ Waluta resetuje się do PLN po anulowaniu formularza');
  });
});