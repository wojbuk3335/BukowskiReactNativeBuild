import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TwoFactorScreen from '../app/(auth)/two-factor';
import { GlobalStateContext } from '../context/GlobalState';
import { AuthContext } from '../context/AuthContext';

const mockReplace = jest.fn();
const mockUseParams = jest.fn();

jest.mock('expo-router', () => ({
  router: {
    replace: (...args) => mockReplace(...args),
  },
  useLocalSearchParams: () => mockUseParams(),
}));

jest.mock('../config/api', () => ({
  getApiUrl: (endpoint) => `http://localhost:3000/api${endpoint}`,
  API_CONFIG: { BASE_URL: 'http://localhost:3000/api' },
}));

const renderWithProviders = (ui, { globalState, auth } = {}) => render(
  <AuthContext.Provider value={auth || { login: jest.fn() }}>
    <GlobalStateContext.Provider value={globalState || { setUser: jest.fn(), setIsLoggedIn: jest.fn() }}>
      {ui}
    </GlobalStateContext.Provider>
  </AuthContext.Provider>
);

describe('TwoFactorScreen (mobile)', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockUseParams.mockReset();
    global.fetch = jest.fn();
  });

  test('renders setup details after loading secret', async () => {
    mockUseParams.mockReturnValue({
      userId: 'user_1',
      email: 'admin@test.pl',
      step: '2fa_setup',
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        secret: 'SECRET123',
        otpauthUrl: 'otpauth://totp/BukowskiApp?secret=SECRET123',
      }),
    });

    const screen = renderWithProviders(<TwoFactorScreen />);

    await waitFor(() => {
      expect(screen.getByText('Dodaj konto w Authenticatorze jako:')).toBeTruthy();
    });

    expect(screen.getByText('Klucz ręczny: SECRET123')).toBeTruthy();
    expect(screen.getByText('Otwórz w Authenticatorze')).toBeTruthy();
  });

  test('submits verification code and navigates to admin panel', async () => {
    mockUseParams.mockReturnValue({
      userId: 'user_1',
      email: 'admin@test.pl',
      step: '2fa_verification',
    });

    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        role: 'admin',
        email: 'admin@test.pl',
      }),
    });

    const setUser = jest.fn();
    const setIsLoggedIn = jest.fn();

    const screen = renderWithProviders(<TwoFactorScreen />, {
      globalState: { setUser, setIsLoggedIn },
      auth: { login: jest.fn() },
    });

    const inputs = screen.getAllByPlaceholderText('-');
    ['1', '2', '3', '4', '5', '6'].forEach((digit, index) => {
      fireEvent.changeText(inputs[index], digit);
    });

    fireEvent.press(screen.getByText('Zweryfikuj kod'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/user/verify-2fa',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            userId: 'user_1',
            verificationCode: '123456',
            rememberMe: false,
          }),
        })
      );
    });

    expect(setUser).toHaveBeenCalled();
    expect(setIsLoggedIn).toHaveBeenCalledWith(true);
    expect(mockReplace).toHaveBeenCalledWith('/(admin-tabs)/dashboard');
  });
});
