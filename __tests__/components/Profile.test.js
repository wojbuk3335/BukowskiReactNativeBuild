import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import Profile from '../../app/(tabs)/profile';
import { GlobalStateContext } from '../../context/GlobalState';
import tokenService from '../../services/tokenService';
import { getApiUrl } from '../../config/api';

// Mock dependencies
jest.mock('../../services/tokenService');
jest.mock('../../config/api');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('Profile Component - Order Form', () => {
  const mockUser = { email: 'test@example.com' };
  const mockProducts = [
    { _id: '1', Tow_Opis: 'Kurtka skórzana damska', Tow_Kod: 'KSD001' },
    { _id: '2', Tow_Opis: 'Kurtka skórzana męska', Tow_Kod: 'KSM001' },
  ];
  const mockColors = [
    { _id: 'c1', Kol_Opis: 'Czarny', Kol_Kod: 'CZA' },
    { _id: 'c2', Kol_Opis: 'Brązowy', Kol_Kod: 'BRA' },
  ];
  const mockSizes = [
    { _id: 's1', Roz_Opis: 'XL', Roz_Kod: 'XL' },
    { _id: 's2', Roz_Opis: 'L', Roz_Kod: 'L' },
    { _id: 's3', Roz_Opis: '2XL', Roz_Kod: '2XL' },
    { _id: 's4', Roz_Opis: '3XL', Roz_Kod: '3XL' },
  ];

  const mockContextValue = {
    user: mockUser,
    logout: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getApiUrl.mockImplementation((path) => `http://test.com${path}`);
    Alert.alert.mockClear();
    
    // Mock successful data fetching
    tokenService.authenticatedFetch.mockImplementation((url) => {
      if (url.includes('/stock')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockProducts,
        });
      }
      if (url.includes('/color')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockColors,
        });
      }
      if (url.includes('/size')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockSizes,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      });
    });
  });

  const renderComponent = (contextOverrides = {}) => {
    return render(
      <GlobalStateContext.Provider value={{ ...mockContextValue, ...contextOverrides }}>
        <Profile />
      </GlobalStateContext.Provider>
    );
  };

  describe('Initial Render', () => {
    it('should render component successfully', async () => {
      const { getByText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('Zamówienia')).toBeTruthy();
        expect(getByText('Produkt')).toBeTruthy();
        expect(getByText('Dane klienta')).toBeTruthy();
        expect(getByText('Rozliczenie')).toBeTruthy();
      });
    });

    it('should display user email', async () => {
      const { getByText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText(/test@example.com/)).toBeTruthy();
      });
    });

    it('should load products, colors and sizes from API', async () => {
      renderComponent();
      
      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          expect.stringContaining('/stock')
        );
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          expect.stringContaining('/color')
        );
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          expect.stringContaining('/size')
        );
      });
    });
  });

  describe('Product Selection', () => {
    it('should show product dropdown when typing', async () => {
      const { getByPlaceholderText, getByText } = renderComponent();
      
      await waitFor(() => {
        expect(getByPlaceholderText('Wyszukaj produkt...')).toBeTruthy();
      });

      const productInput = getByPlaceholderText('Wyszukaj produkt...');
      
      await act(async () => {
        fireEvent.changeText(productInput, 'Kurtka');
      });

      await waitFor(() => {
        expect(getByText('Kurtka skórzana damska')).toBeTruthy();
        expect(getByText('Kurtka skórzana męska')).toBeTruthy();
      });
    });

    it('should select product from dropdown', async () => {
      const { getByPlaceholderText, getByText } = renderComponent();
      
      await waitFor(() => {
        expect(getByPlaceholderText('Wyszukaj produkt...')).toBeTruthy();
      });

      const productInput = getByPlaceholderText('Wyszukaj produkt...');
      
      await act(async () => {
        fireEvent.changeText(productInput, 'Kurtka');
      });

      await waitFor(() => {
        expect(getByText('Kurtka skórzana damska')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Kurtka skórzana damska'));
      });

      expect(productInput.props.value).toBe('Kurtka skórzana damska');
    });

    it('should close dropdown when clicking close button', async () => {
      const { getByPlaceholderText, getByText, queryByText } = renderComponent();
      
      await waitFor(() => {
        expect(getByPlaceholderText('Wyszukaj produkt...')).toBeTruthy();
      });

      const productInput = getByPlaceholderText('Wyszukaj produkt...');
      
      await act(async () => {
        fireEvent.changeText(productInput, 'Kurtka');
      });

      await waitFor(() => {
        expect(getByText('Kurtka skórzana damska')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Zamknij'));
      });

      await waitFor(() => {
        expect(queryByText('Kurtka skórzana damska')).toBeNull();
      });
    });
  });

  describe('Color Selection', () => {
    it('should show color dropdown when typing', async () => {
      const { getByPlaceholderText, getByText } = renderComponent();
      
      await waitFor(() => {
        expect(getByPlaceholderText('Wyszukaj kolor...')).toBeTruthy();
      });

      const colorInput = getByPlaceholderText('Wyszukaj kolor...');
      
      await act(async () => {
        fireEvent.changeText(colorInput, 'Czar');
      });

      await waitFor(() => {
        expect(getByText('Czarny')).toBeTruthy();
      });
    });

    it('should select color from dropdown', async () => {
      const { getByPlaceholderText, getByText } = renderComponent();
      
      await waitFor(() => {
        expect(getByPlaceholderText('Wyszukaj kolor...')).toBeTruthy();
      });

      const colorInput = getByPlaceholderText('Wyszukaj kolor...');
      
      await act(async () => {
        fireEvent.changeText(colorInput, 'Czar');
      });

      await waitFor(() => {
        expect(getByText('Czarny')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Czarny'));
      });

      expect(colorInput.props.value).toBe('Czarny');
    });
  });

  describe('Size Selection with Exact Match', () => {
    it('should show only exact matches for XL (not 2XL, 3XL)', async () => {
      const { getByPlaceholderText, getByText, queryByText } = renderComponent();
      
      await waitFor(() => {
        expect(getByPlaceholderText('Wyszukaj rozmiar...')).toBeTruthy();
      });

      const sizeInput = getByPlaceholderText('Wyszukaj rozmiar...');
      
      await act(async () => {
        fireEvent.changeText(sizeInput, 'XL');
      });

      await waitFor(() => {
        expect(getByText('XL')).toBeTruthy();
      });

      // Should NOT show 2XL or 3XL
      expect(queryByText('2XL')).toBeNull();
      expect(queryByText('3XL')).toBeNull();
    });

    it('should select size from dropdown', async () => {
      const { getByPlaceholderText, getByText } = renderComponent();
      
      await waitFor(() => {
        expect(getByPlaceholderText('Wyszukaj rozmiar...')).toBeTruthy();
      });

      const sizeInput = getByPlaceholderText('Wyszukaj rozmiar...');
      
      await act(async () => {
        fireEvent.changeText(sizeInput, 'L');
      });

      await waitFor(() => {
        expect(getByText('L')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('L'));
      });

      expect(sizeInput.props.value).toBe('L');
    });
  });

  describe('Customer Data', () => {
    it('should update customer name', async () => {
      const { getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        expect(getByPlaceholderText('Wprowadź imię i nazwisko')).toBeTruthy();
      });

      const nameInput = getByPlaceholderText('Wprowadź imię i nazwisko');
      
      await act(async () => {
        fireEvent.changeText(nameInput, 'Jan Kowalski');
      });

      expect(nameInput.props.value).toBe('Jan Kowalski');
    });

    it('should format phone number', async () => {
      const { getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        expect(getByPlaceholderText(/123 456 789/)).toBeTruthy();
      });

      const phoneInput = getByPlaceholderText(/123 456 789/);
      
      await act(async () => {
        fireEvent.changeText(phoneInput, '501234567');
      });

      expect(phoneInput.props.value).toBe('501 234 567');
    });

    it('should validate email format', async () => {
      const { getByPlaceholderText, getByText } = renderComponent();
      
      await waitFor(() => {
        expect(getByPlaceholderText(/jan.kowalski@example.com/)).toBeTruthy();
      });

      const emailInput = getByPlaceholderText(/jan.kowalski@example.com/);
      
      await act(async () => {
        fireEvent.changeText(emailInput, 'invalid-email');
      });

      await waitFor(() => {
        expect(getByText('Nieprawidłowy format adresu email')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.changeText(emailInput, 'valid@email.com');
      });

      await waitFor(() => {
        expect(getByText('Opcjonalnie - do kontaktu w sprawie zamówienia')).toBeTruthy();
      });
    });
  });

  describe('Delivery Options', () => {
    it('should show postal code and city fields for shipping', async () => {
      const { getByText, getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('Wysyłka')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Wysyłka'));
      });

      await waitFor(() => {
        expect(getByPlaceholderText('XX-XXX')).toBeTruthy();
        expect(getByPlaceholderText('Wpisz miejscowość...')).toBeTruthy();
      });
    });

    it('should format postal code with dash', async () => {
      const { getByText, getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('Wysyłka')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Wysyłka'));
      });

      await waitFor(() => {
        expect(getByPlaceholderText('XX-XXX')).toBeTruthy();
      });

      const postalInput = getByPlaceholderText('XX-XXX');
      
      await act(async () => {
        fireEvent.changeText(postalInput, '12345');
      });

      expect(postalInput.props.value).toBe('12-345');
    });

    it('should NOT call API when postal code is entered', async () => {
      const { getByText, getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('Wysyłka')).toBeTruthy();
      });

      // Clear mock calls from initial render
      tokenService.authenticatedFetch.mockClear();

      await act(async () => {
        fireEvent.press(getByText('Wysyłka'));
      });

      const postalInput = getByPlaceholderText('XX-XXX');
      
      await act(async () => {
        fireEvent.changeText(postalInput, '12-345');
      });

      // Should not make API calls for postal code lookup (API disabled)
      expect(tokenService.authenticatedFetch).not.toHaveBeenCalled();
    });

    it('should allow manual city input without API', async () => {
      const { getByText, getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('Wysyłka')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Wysyłka'));
      });

      const cityInput = getByPlaceholderText('Wpisz miejscowość...');
      
      await act(async () => {
        fireEvent.changeText(cityInput, 'Warszawa');
      });

      expect(cityInput.props.value).toBe('Warszawa');
    });

    it('should show street field for shipping', async () => {
      const { getByText, getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('Wysyłka')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Wysyłka'));
      });

      await waitFor(() => {
        expect(getByPlaceholderText('Wpisz ulicę...')).toBeTruthy();
      });
    });

    it('should show delivery fields for delivery option', async () => {
      const { getByText, getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('Dostawa')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Dostawa'));
      });

      await waitFor(() => {
        expect(getByPlaceholderText('Wprowadź miejscowość')).toBeTruthy();
        expect(getByPlaceholderText('Wprowadź nazwę ulicy')).toBeTruthy();
        expect(getByPlaceholderText(/12, 12A, 12\/3/)).toBeTruthy();
      });
    });

    it('should hide address fields for pickup option', async () => {
      const { getByText, queryByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('Odbiór osobisty')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Odbiór osobisty'));
      });

      await waitFor(() => {
        expect(queryByPlaceholderText('XX-XXX')).toBeNull();
        expect(queryByPlaceholderText('Wpisz miejscowość...')).toBeNull();
      });
    });
  });

  describe('Payment Calculations', () => {
    it('should calculate cash on delivery for shipping', async () => {
      const { getByText, getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('Wysyłka')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Wysyłka'));
      });

      const totalPriceInput = getByPlaceholderText('np. 800 zł');
      const depositInput = getByPlaceholderText('np. 200 zł');
      
      await act(async () => {
        fireEvent.changeText(totalPriceInput, '800');
        fireEvent.changeText(depositInput, '200');
      });

      await waitFor(() => {
        // Should be (800 - 200) + 20 = 620
        expect(getByText('620.00 zł')).toBeTruthy();
      });
    });

    it('should calculate cash on delivery for delivery (no shipping cost)', async () => {
      const { getByText, getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('Dostawa')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Dostawa'));
      });

      const totalPriceInput = getByPlaceholderText('np. 800 zł');
      const depositInput = getByPlaceholderText('np. 200 zł');
      
      await act(async () => {
        fireEvent.changeText(totalPriceInput, '800');
        fireEvent.changeText(depositInput, '200');
      });

      await waitFor(() => {
        // Should be (800 - 200) = 600 (no shipping cost)
        expect(getByText('600.00 zł')).toBeTruthy();
      });
    });

    it('should show NIP field when invoice is selected', async () => {
      const { getByText, getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('Faktura')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Faktura'));
      });

      await waitFor(() => {
        expect(getByPlaceholderText('XXX-XXX-XX-XX')).toBeTruthy();
      });
    });

    it('should format NIP with dashes', async () => {
      const { getByText, getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('Faktura')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Faktura'));
      });

      const nipInput = getByPlaceholderText('XXX-XXX-XX-XX');
      
      await act(async () => {
        fireEvent.changeText(nipInput, '7351003432');
      });

      // Should format as XXX-XXX-XX-XX
      expect(nipInput.props.value).toBe('735-100-34-32');
    });
  });

  describe('Form Validation', () => {
    it('should show error when submitting without product', async () => {
      const { getByText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('Zatwierdź zamówienie')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Zatwierdź zamówienie'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Błąd',
          expect.stringContaining('produkt')
        );
      });
    });

    it('should show error when submitting without customer name', async () => {
      const { getByText, getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        expect(getByPlaceholderText('Wyszukaj produkt...')).toBeTruthy();
      });

      // Select product
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Wyszukaj produkt...'), 'Kurtka skórzana damska');
      });

      await waitFor(() => {
        expect(getByText('Kurtka skórzana damska')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Kurtka skórzana damska'));
      });

      // Select color
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Wyszukaj kolor...'), 'Czarny');
      });

      await waitFor(() => {
        expect(getByText('Czarny')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('Czarny'));
      });

      // Select size
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Wyszukaj rozmiar...'), 'XL');
      });

      await waitFor(() => {
        expect(getByText('XL')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('XL'));
      });

      // Try to submit without name
      await act(async () => {
        fireEvent.press(getByText('Zatwierdź zamówienie'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Błąd',
          expect.stringContaining('imię i nazwisko')
        );
      });
    });

    it('should show error when submitting without phone number', async () => {
      const { getByText, getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        expect(getByPlaceholderText('Wyszukaj produkt...')).toBeTruthy();
      });

      // Select product, color, size
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Wyszukaj produkt...'), 'Kurtka skórzana damska');
      });
      await waitFor(() => fireEvent.press(getByText('Kurtka skórzana damska')));
      
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Wyszukaj kolor...'), 'Czarny');
      });
      await waitFor(() => fireEvent.press(getByText('Czarny')));
      
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Wyszukaj rozmiar...'), 'XL');
      });
      await waitFor(() => fireEvent.press(getByText('XL')));

      // Add customer name
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Wprowadź imię i nazwisko'), 'Jan Kowalski');
      });

      // Try to submit without phone
      await act(async () => {
        fireEvent.press(getByText('Zatwierdź zamówienie'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Błąd',
          expect.stringContaining('telefon')
        );
      });
    });

    it('should show error when shipping without postal code', async () => {
      const { getByText, getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        expect(getByPlaceholderText('Wyszukaj produkt...')).toBeTruthy();
      });

      // Fill required fields
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Wyszukaj produkt...'), 'Kurtka skórzana damska');
      });
      await waitFor(() => fireEvent.press(getByText('Kurtka skórzana damska')));
      
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Wyszukaj kolor...'), 'Czarny');
      });
      await waitFor(() => fireEvent.press(getByText('Czarny')));
      
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Wyszukaj rozmiar...'), 'XL');
      });
      await waitFor(() => fireEvent.press(getByText('XL')));

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Wprowadź imię i nazwisko'), 'Jan Kowalski');
      });

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText(/123 456 789/), '501234567');
      });

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('np. 800 zł'), '800');
      });

      // Select shipping
      await act(async () => {
        fireEvent.press(getByText('Wysyłka'));
      });

      // Try to submit without postal code
      await act(async () => {
        fireEvent.press(getByText('Zatwierdź zamówienie'));
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Błąd',
          expect.stringContaining('Kod pocztowy')
        );
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit order successfully', async () => {
      tokenService.authenticatedFetch.mockImplementation((url) => {
        if (url.includes('/orders') && !url.includes('/send-email')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ orderId: 'ORD-12345', data: {} }),
          });
        }
        if (url.includes('/send-email')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ success: true }),
          });
        }
        // Default for initial data fetch
        if (url.includes('/stock')) return Promise.resolve({ ok: true, json: async () => mockProducts });
        if (url.includes('/color')) return Promise.resolve({ ok: true, json: async () => mockColors });
        if (url.includes('/size')) return Promise.resolve({ ok: true, json: async () => mockSizes });
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

      const { getByText, getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        expect(getByPlaceholderText('Wyszukaj produkt...')).toBeTruthy();
      });

      // Fill all required fields
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Wyszukaj produkt...'), 'Kurtka skórzana damska');
      });
      await waitFor(() => fireEvent.press(getByText('Kurtka skórzana damska')));
      
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Wyszukaj kolor...'), 'Czarny');
      });
      await waitFor(() => fireEvent.press(getByText('Czarny')));
      
      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Wyszukaj rozmiar...'), 'XL');
      });
      await waitFor(() => fireEvent.press(getByText('XL')));

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('Wprowadź imię i nazwisko'), 'Jan Kowalski');
      });

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText(/123 456 789/), '501234567');
      });

      await act(async () => {
        fireEvent.changeText(getByPlaceholderText('np. 800 zł'), '800');
      });

      // Submit
      await act(async () => {
        fireEvent.press(getByText('Zatwierdź zamówienie'));
      });

      // Should show success modal instead of Alert
      await waitFor(() => {
        expect(getByText(/Zamówienie zostało złożone/i)).toBeTruthy();
      }, { timeout: 3000 });
      
      // Verify order ID is shown
      await waitFor(() => {
        expect(getByText(/ORD-12345/i)).toBeTruthy();
      });
    });
  });
});
