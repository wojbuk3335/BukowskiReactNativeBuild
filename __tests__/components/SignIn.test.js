import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SignIn from '../../app/(auth)/sign-in';
import { GlobalStateContext } from '../../context/GlobalState';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock expo-router
jest.mock('expo-router', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  router: {
    replace: jest.fn(),
    push: jest.fn(),
    back: jest.fn(),
  },
}));

// Mock image imports
jest.mock('../../app/(auth)/bukowski.png', () => 'mock-bukowski-logo');

// Mock constants
jest.mock('../../constants', () => ({
  icons: {
    eye: 'mock-eye-icon',
    eyeHide: 'mock-eye-hide-icon',
  },
}));

describe('SignIn Component', () => {
  const mockSetUser = jest.fn();
  const mockBukowskiLogin = jest.fn();
  const mockNavigation = { navigate: jest.fn() };

  const mockContextValue = {
    setUser: mockSetUser,
    bukowski_login: mockBukowskiLogin,
    isLoading: false,
    user: null,
  };

  const renderSignIn = (contextOverrides = {}) => {
    const contextValue = { ...mockContextValue, ...contextOverrides };
    return render(
      <GlobalStateContext.Provider value={contextValue}>
        <SignIn />
      </GlobalStateContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Error handling', () => {
    it('should display error message when login fails', async () => {
      // Mock bukowski_login to throw an error
      mockBukowskiLogin.mockRejectedValueOnce(new Error('Login failed'));

      const { getByText, getAllByTestId, queryByText } = renderSignIn();

      // Fill in the form
      const textInputs = getAllByTestId('text-input');
      const emailInput = textInputs[0]; // First input is email
      const passwordInput = textInputs[1]; // Second input is password
      const loginButton = getByText('Zologuj się');

      // Assuming we have two text inputs - email and password
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');

      // Error should not be visible initially
      expect(queryByText('Logowanie nie powiodło się. Sprawdź swoje dane i spróbuj ponownie.')).toBeNull();

      // Press login button
      fireEvent.press(loginButton);

      // Wait for error message to appear
      await waitFor(() => {
        expect(getByText('Logowanie nie powiodło się. Sprawdź swoje dane i spróbuj ponownie.')).toBeTruthy();
      });

      // Verify the error message text styles
      const errorText = getByText('Logowanie nie powiodło się. Sprawdź swoje dane i spróbuj ponownie.');
      expect(errorText.props.style).toMatchObject({
        color: '#fff',
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
      });
    });

    it('should clear error message when user starts typing in email field', async () => {
      // Mock bukowski_login to throw an error first
      mockBukowskiLogin.mockRejectedValueOnce(new Error('Login failed'));

      const { getByText, getAllByTestId, queryByText } = renderSignIn();

      const emailInput = getAllByTestId('text-input')[0];
      const passwordInput = getAllByTestId('text-input')[1];
      const loginButton = getByText('Zologuj się');

      // Fill form and trigger error
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(loginButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(getByText('Logowanie nie powiodło się. Sprawdź swoje dane i spróbuj ponownie.')).toBeTruthy();
      });

      // Start typing in email field
      fireEvent.changeText(emailInput, 'test2@example.com');

      // Error should disappear
      await waitFor(() => {
        expect(queryByText('Logowanie nie powiodło się. Sprawdź swoje dane i spróbuj ponownie.')).toBeNull();
      });
    });

    it('should clear error message when user starts typing in password field', async () => {
      // Mock bukowski_login to throw an error first
      mockBukowskiLogin.mockRejectedValueOnce(new Error('Login failed'));

      const { getByText, getAllByTestId, queryByText } = renderSignIn();

      const emailInput = getAllByTestId('text-input')[0];
      const passwordInput = getAllByTestId('text-input')[1];
      const loginButton = getByText('Zologuj się');

      // Fill form and trigger error
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(loginButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(getByText('Logowanie nie powiodło się. Sprawdź swoje dane i spróbuj ponownie.')).toBeTruthy();
      });

      // Start typing in password field
      fireEvent.changeText(passwordInput, 'newpassword');

      // Error should disappear
      await waitFor(() => {
        expect(queryByText('Logowanie nie powiodło się. Sprawdź swoje dane i spróbuj ponownie.')).toBeNull();
      });
    });

    it('should not display error message when login is successful', async () => {
      // Mock successful login
      mockBukowskiLogin.mockResolvedValueOnce({ id: 1, email: 'test@example.com' });

      const { getByText, getAllByTestId, queryByText } = renderSignIn();

      const emailInput = getAllByTestId('text-input')[0];
      const passwordInput = getAllByTestId('text-input')[1];
      const loginButton = getByText('Zologuj się');

      // Fill form with correct credentials
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'correctpassword');

      // Press login button
      fireEvent.press(loginButton);

      // Wait a bit and ensure no error message appears
      await waitFor(() => {
        expect(queryByText('Logowanie nie powiodło się. Sprawdź swoje dane i spróbuj ponownie.')).toBeNull();
      });

      // Verify that bukowski_login was called with correct parameters
      expect(mockBukowskiLogin).toHaveBeenCalledWith('test@example.com', 'correctpassword', expect.any(Object));
    });

    it('should clear previous error when submitting again', async () => {
      const { getByText, getAllByTestId, queryByText } = renderSignIn();

      const emailInput = getAllByTestId('text-input')[0];
      const passwordInput = getAllByTestId('text-input')[1];
      const loginButton = getByText('Zologuj się');

      // First failed attempt
      mockBukowskiLogin.mockRejectedValueOnce(new Error('Login failed'));
      fireEvent.changeText(emailInput, 'test@example.com');
      fireEvent.changeText(passwordInput, 'wrongpassword');
      fireEvent.press(loginButton);

      // Wait for error to appear
      await waitFor(() => {
        expect(getByText('Logowanie nie powiodło się. Sprawdź swoje dane i spróbuj ponownie.')).toBeTruthy();
      });

      // Second successful attempt
      mockBukowskiLogin.mockResolvedValueOnce({ id: 1, email: 'test@example.com' });
      fireEvent.changeText(passwordInput, 'correctpassword');
      fireEvent.press(loginButton);

      // Error should be cleared
      await waitFor(() => {
        expect(queryByText('Logowanie nie powiodło się. Sprawdź swoje dane i spróbuj ponownie.')).toBeNull();
      });
    });
  });
});
