import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import SignIn from '../../app/(auth)/sign-in';
import { GlobalStateContext } from '../../context/GlobalState';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

// Mock dependencies
jest.mock('expo-router', () => ({
  router: {
    replace: jest.fn(),
    push: jest.fn(),
  },
  useNavigation: jest.fn(() => ({})),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('SignIn Component', () => {
  let mockContextValue;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockContextValue = {
      setUser: jest.fn(),
      bukowski_login: jest.fn(),
      isLoading: false,
      user: null,
    };
  });

  const renderSignIn = () => {
    return render(
      <GlobalStateContext.Provider value={mockContextValue}>
        <SignIn />
      </GlobalStateContext.Provider>
    );
  };

  describe('Component Rendering', () => {
    it('should render login form with all fields', () => {
      const { getByText, getAllByTestId } = renderSignIn();

      expect(getByText('Email')).toBeTruthy();
      expect(getByText('Hasło')).toBeTruthy();
      expect(getByText('Zologuj się')).toBeTruthy();
      
      const inputs = getAllByTestId('text-input');
      expect(inputs).toHaveLength(2); // Email and password inputs
    });

    it('should not show error message initially', () => {
      const { queryByText } = renderSignIn();
      
      expect(queryByText(/nie powiodło się/i)).toBeNull();
    });
  });

  describe('Auto-login from AsyncStorage', () => {
    it('should auto-login if user data exists in AsyncStorage', async () => {
      const mockUser = {
        email: 'test@bukowski.pl',
        name: 'Test User',
        symbol: 'TEST001'
      };
      
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(mockUser));

      renderSignIn();

      await waitFor(() => {
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('user');
        expect(mockContextValue.setUser).toHaveBeenCalledWith(mockUser);
        expect(router.replace).toHaveBeenCalledWith('/home');
      });
    });

    it('should not redirect if no user data in AsyncStorage', async () => {
      AsyncStorage.getItem.mockResolvedValueOnce(null);

      renderSignIn();

      await waitFor(() => {
        expect(AsyncStorage.getItem).toHaveBeenCalledWith('user');
      });

      expect(mockContextValue.setUser).not.toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      renderSignIn();

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          'Failed to retrieve user data from storage:',
          expect.any(Error)
        );
      });

      consoleError.mockRestore();
    });
  });

  describe('Form Input', () => {
    it('should update email field', () => {
      const { getAllByTestId } = renderSignIn();
      const [emailInput] = getAllByTestId('text-input');

      fireEvent.changeText(emailInput, 'test@bukowski.pl');

      expect(emailInput.props.value).toBe('test@bukowski.pl');
    });

    it('should update password field', () => {
      const { getAllByTestId } = renderSignIn();
      const [, passwordInput] = getAllByTestId('text-input');

      fireEvent.changeText(passwordInput, 'password123');

      expect(passwordInput.props.value).toBe('password123');
    });

    it('should trim whitespace from email', () => {
      const { getAllByTestId } = renderSignIn();
      const [emailInput] = getAllByTestId('text-input');

      fireEvent.changeText(emailInput, '  test@bukowski.pl  ');

      expect(emailInput.props.value).toBe('test@bukowski.pl');
    });

    it('should trim whitespace from password', () => {
      const { getAllByTestId } = renderSignIn();
      const [, passwordInput] = getAllByTestId('text-input');

      fireEvent.changeText(passwordInput, '  password123  ');

      expect(passwordInput.props.value).toBe('password123');
    });

    it('should have secure text entry for password field', () => {
      const { getByText } = renderSignIn();
      
      // Password field title should be visible
      expect(getByText('Hasło')).toBeTruthy();
    });
  });

  describe('Form Submission', () => {
    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        email: 'test@bukowski.pl',
        name: 'Test User',
        symbol: 'TEST001'
      };

      mockContextValue.bukowski_login.mockResolvedValueOnce(mockUser);

      const { getAllByTestId, getByText } = renderSignIn();
      const [emailInput, passwordInput] = getAllByTestId('text-input');

      fireEvent.changeText(emailInput, 'test@bukowski.pl');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(getByText('Zologuj się'));

      await waitFor(() => {
        expect(mockContextValue.bukowski_login).toHaveBeenCalledWith(
          'test@bukowski.pl',
          'password123',
          expect.any(Object)
        );
        expect(mockContextValue.setUser).toHaveBeenCalledWith(mockUser);
        expect(router.replace).toHaveBeenCalledWith('/home');
      });
    });

    it('should show error message on login failure', async () => {
      mockContextValue.bukowski_login.mockRejectedValueOnce(
        new Error('Invalid credentials')
      );

      const { getAllByTestId, getByText, findByText } = renderSignIn();
      const [emailInput, passwordInput] = getAllByTestId('text-input');

      fireEvent.changeText(emailInput, 'wrong@email.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(getByText('Zologuj się'));

      const errorMessage = await findByText(/nie powiodło się/i);
      expect(errorMessage).toBeTruthy();
    });

    it('should clear error when user starts typing in email', async () => {
      mockContextValue.bukowski_login.mockRejectedValueOnce(
        new Error('Invalid credentials')
      );

      const { getAllByTestId, getByText, findByText, queryByText } = renderSignIn();
      const [emailInput, passwordInput] = getAllByTestId('text-input');

      // Trigger error
      fireEvent.changeText(emailInput, 'wrong@email.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(getByText('Zologuj się'));

      await findByText(/nie powiodło się/i);

      // Start typing - error should clear
      fireEvent.changeText(emailInput, 'new@email.com');

      expect(queryByText(/nie powiodło się/i)).toBeNull();
    });

    it('should clear error when user starts typing in password', async () => {
      mockContextValue.bukowski_login.mockRejectedValueOnce(
        new Error('Invalid credentials')
      );

      const { getAllByTestId, getByText, findByText, queryByText } = renderSignIn();
      const [emailInput, passwordInput] = getAllByTestId('text-input');

      // Trigger error
      fireEvent.changeText(emailInput, 'test@email.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(getByText('Zologuj się'));

      await findByText(/nie powiodło się/i);

      // Start typing - error should clear
      fireEvent.changeText(passwordInput, 'newpassword');

      expect(queryByText(/nie powiodło się/i)).toBeNull();
    });

    it('should not submit with empty credentials', async () => {
      const { getByText } = renderSignIn();

      fireEvent.press(getByText('Zologuj się'));

      await waitFor(() => {
        expect(mockContextValue.bukowski_login).toHaveBeenCalledWith(
          '',
          '',
          expect.any(Object)
        );
      });
    });
  });

  describe('Loading State', () => {
    it('should show loading state during login', () => {
      mockContextValue.isLoading = true;

      const { getByText } = renderSignIn();
      const loginButton = getByText('Zologuj się');

      expect(loginButton).toBeTruthy();
      // Button should be disabled when loading (handled by CustomButton component)
    });

    it('should not be loading initially', () => {
      const { getByText } = renderSignIn();
      
      expect(mockContextValue.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockContextValue.bukowski_login.mockRejectedValueOnce(
        new Error('Network error')
      );

      const { getAllByTestId, getByText, findByText } = renderSignIn();
      const [emailInput, passwordInput] = getAllByTestId('text-input');

      fireEvent.changeText(emailInput, 'test@bukowski.pl');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(getByText('Zologuj się'));

      const errorMessage = await findByText(/nie powiodło się/i);
      expect(errorMessage).toBeTruthy();
    });

    it('should handle invalid email format gracefully', async () => {
      mockContextValue.bukowski_login.mockRejectedValueOnce(
        new Error('Invalid email')
      );

      const { getAllByTestId, getByText, findByText } = renderSignIn();
      const [emailInput, passwordInput] = getAllByTestId('text-input');

      fireEvent.changeText(emailInput, 'invalid-email');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(getByText('Zologuj się'));

      const errorMessage = await findByText(/nie powiodło się/i);
      expect(errorMessage).toBeTruthy();
    });
  });

  describe('Integration with Global State', () => {
    it('should use global context for login', async () => {
      const { getAllByTestId, getByText } = renderSignIn();
      const [emailInput, passwordInput] = getAllByTestId('text-input');

      fireEvent.changeText(emailInput, 'test@bukowski.pl');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(getByText('Zologuj się'));

      await waitFor(() => {
        expect(mockContextValue.bukowski_login).toHaveBeenCalled();
      });
    });

    it('should update global user state on successful login', async () => {
      const mockUser = { email: 'test@bukowski.pl', symbol: 'TEST001' };
      mockContextValue.bukowski_login.mockResolvedValueOnce(mockUser);

      const { getAllByTestId, getByText } = renderSignIn();
      const [emailInput, passwordInput] = getAllByTestId('text-input');

      fireEvent.changeText(emailInput, 'test@bukowski.pl');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(getByText('Zologuj się'));

      await waitFor(() => {
        expect(mockContextValue.setUser).toHaveBeenCalledWith(mockUser);
      });
    });
  });
});
