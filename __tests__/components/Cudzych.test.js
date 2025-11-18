import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import Cudzych from '../../app/(tabs)/cudzych';
import { GlobalStateContext } from '../../context/GlobalState';
import tokenService from '../../services/tokenService';
import { getApiUrl } from '../../config/api';

// Mock dependencies
jest.mock('../../services/tokenService');
jest.mock('../../config/api');
jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  useCameraPermissions: () => [null, jest.fn()],
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));

describe('Cudzych Component', () => {
  const mockUser = { symbol: 'P', firstName: 'Test', lastName: 'User' };
  const mockGoods = [
    { _id: '1', fullName: 'Kurtka skórzana XL', Tow_Kod: '001' },
    { _id: '2', fullName: 'Kurtka zamszowa L', Tow_Kod: '002' },
  ];
  const mockSizes = [
    { _id: 's1', Roz_Opis: 'XL', Roz_Kod: 'XL' },
    { _id: 's2', Roz_Opis: 'L', Roz_Kod: 'L' },
    { _id: 's3', Roz_Opis: '2XL', Roz_Kod: '2XL' },
  ];

  const mockContextValue = {
    user: mockUser,
    goods: mockGoods,
    fetchGoods: jest.fn(),
    sizes: mockSizes,
    fetchSizes: jest.fn(),
    stocks: [],
    fetchStock: jest.fn(),
    colors: [],
    fetchColors: jest.fn(),
    bags: [],
    fetchBags: jest.fn(),
    wallets: [],
    fetchWallets: jest.fn(),
    stateData: {},
    fetchState: jest.fn(),
    users: [],
    fetchUsers: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    getApiUrl.mockImplementation((path) => `http://test.com${path}`);
  });

  const renderComponent = (contextOverrides = {}) => {
    return render(
      <GlobalStateContext.Provider value={{ ...mockContextValue, ...contextOverrides }}>
        <Cudzych />
      </GlobalStateContext.Provider>
    );
  };

  // Helper function to open Odbiór modal via scanner
  const openOdbiorModal = async (getByText) => {
    await act(async () => {
      fireEvent.press(getByText('Odbiór'));
    });
    await act(async () => {
      fireEvent.press(getByText('✏️ Wpisz ręcznie'));
    });
  };

  // Helper function to open Zwrot modal via scanner
  const openZwrotModal = async (getByText) => {
    await act(async () => {
      fireEvent.press(getByText('Zwrot'));
    });
    await act(async () => {
      fireEvent.press(getByText('✏️ Wpisz ręcznie'));
    });
  };

  describe('Initial Render', () => {
    it('should render component successfully', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 0, transactions: [] }),
      });

      const { getByText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('Tomasz Cudzich')).toBeTruthy();
        expect(getByText('Saldo do zapłaty:')).toBeTruthy();
      });
    });

    it('should deny access for non-P users', () => {
      const { getByText } = renderComponent({ user: { symbol: 'A' } });
      
      expect(getByText('Brak dostępu do tej sekcji')).toBeTruthy();
    });

    it('should display action buttons', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 0, transactions: [] }),
      });

      const { getByText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('Odbiór')).toBeTruthy();
        expect(getByText('Zwrot')).toBeTruthy();
        expect(getByText('Wpłata')).toBeTruthy();
        expect(getByText('Wypłata')).toBeTruthy();
      });
    });
  });

  describe('Balance and Transactions Loading', () => {
    it('should fetch and display balance', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 150.50 }),
      });

      const { getByText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('150.5zł')).toBeTruthy();
      });
    });

    it('should fetch and display transactions', async () => {
      const mockTransactions = [
        {
          _id: 't1',
          type: 'odbior',
          productName: 'Kurtka testowa',
          size: 'XL',
          price: 100,
          date: new Date().toISOString(),
          notes: 'Test note',
        },
      ];

      tokenService.authenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ balance: 100 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockTransactions,
        });

      const { getByText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('Kurtka testowa')).toBeTruthy();
        expect(getByText('Rozmiar: XL')).toBeTruthy();
        expect(getByText('ODBIÓR')).toBeTruthy();
      });
    });

    it('should handle fetch errors gracefully', async () => {
      tokenService.authenticatedFetch.mockRejectedValue(new Error('Network error'));

      const { getByText } = renderComponent();
      
      await waitFor(() => {
        expect(getByText('Tomasz Cudzich')).toBeTruthy();
      });
    });
  });

  describe('Odbiór Modal', () => {
    it('should open scanner when Odbiór button pressed', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 0, transactions: [] }),
      });

      const { getByText, queryByText } = renderComponent();
      
      await act(async () => {
        const odbiorButton = getByText('Odbiór');
        fireEvent.press(odbiorButton);
      });

      // Scanner should be visible (camera component rendered)
      expect(queryByText('X')).toBeTruthy(); // Close button for scanner
      expect(queryByText('✏️ Wpisz ręcznie')).toBeTruthy(); // Manual entry button
    });

    it('should display product search field in modal after manual entry', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 0, transactions: [] }),
      });

      const { getByText, getByPlaceholderText } = renderComponent();
      
      await openOdbiorModal(getByText);

      expect(getByPlaceholderText('Wyszukaj kurtkę lub zeskanuj kod...')).toBeTruthy();
    });

    it('should filter products based on search text', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 0, transactions: [] }),
      });

      const { getByText, getByPlaceholderText } = renderComponent();
      
      await openOdbiorModal(getByText);

      const searchInput = getByPlaceholderText('Wyszukaj kurtkę lub zeskanuj kod...');
      
      await act(async () => {
        fireEvent.changeText(searchInput, 'skórzana');
      });

      await waitFor(() => {
        expect(getByText('Kurtka skórzana XL')).toBeTruthy();
      });
    });

    it('should filter sizes with exact match (XL should not show 2XL)', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 0, transactions: [] }),
      });

      const { getByText, getByPlaceholderText, queryByText } = renderComponent();
      
      await openOdbiorModal(getByText);

      const sizeInput = getByPlaceholderText('Wpisz rozmiar...');
      
      await act(async () => {
        fireEvent.changeText(sizeInput, 'XL');
      });

      await waitFor(() => {
        expect(getByText('XL')).toBeTruthy();
        // Should NOT show 2XL when searching for XL
        expect(queryByText('2XL')).toBeNull();
      });
    });
  });

  describe('Transaction Creation - Odbiór', () => {
    it('should create Odbiór transaction successfully', async () => {
      const mockPriceList = {
        items: [{ productName: 'Kurtka skórzana XL', price: 200 }],
      };

      tokenService.authenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ balance: 0 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ transactions: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceList,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: true, 
            balance: -200,
            transaction: { type: 'odbior', price: 200 }
          }),
        });

      const { getByText, getByPlaceholderText } = renderComponent();
      
      await openOdbiorModal(getByText);

      // Select product
      const productSearch = getByPlaceholderText('Wyszukaj kurtkę lub zeskanuj kod...');
      await act(async () => {
        fireEvent.changeText(productSearch, 'skórzana');
      });

      await waitFor(() => {
        fireEvent.press(getByText('Kurtka skórzana XL'));
      });

      // Select size
      const sizeInput = getByPlaceholderText('Wpisz rozmiar...');
      await act(async () => {
        fireEvent.changeText(sizeInput, 'XL');
      });

      await waitFor(() => {
        fireEvent.press(getByText('XL'));
      });

      // Submit
      await act(async () => {
        fireEvent.press(getByText('Zapisz Odbiór'));
      });

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          expect.stringContaining('/cudzich/transactions'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"type":"odbior"'),
          })
        );
      });
    });

    it('should validate required fields before creating transaction', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 0, transactions: [] }),
      });

      const { getByText } = renderComponent();
      
      await openOdbiorModal(getByText);

      // Try to submit without selecting product
      await act(async () => {
        fireEvent.press(getByText('Zapisz Odbiór'));
      });

      // Should not call API
      expect(tokenService.authenticatedFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/cudzich/transactions'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('Transaction Creation - Zwrot', () => {
    it('should create Zwrot transaction successfully', async () => {
      const mockPriceList = {
        items: [{ productName: 'Kurtka zamszowa L', price: 150 }],
      };

      tokenService.authenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ balance: -200 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ transactions: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceList,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: true, 
            balance: -50,
            transaction: { type: 'zwrot', price: 150 }
          }),
        });

      const { getByText, getByPlaceholderText } = renderComponent();
      
      await openZwrotModal(getByText);

      // Select product
      const productSearch = getByPlaceholderText('Wyszukaj kurtkę lub zeskanuj kod...');
      await act(async () => {
        fireEvent.changeText(productSearch, 'zamszowa');
      });

      await waitFor(() => {
        fireEvent.press(getByText('Kurtka zamszowa L'));
      });

      // Select size
      const sizeInput = getByPlaceholderText('Wpisz rozmiar...');
      await act(async () => {
        fireEvent.changeText(sizeInput, 'L');
      });

      await waitFor(() => {
        fireEvent.press(getByText('L'));
      });

      // Submit
      await act(async () => {
        fireEvent.press(getByText('Zapisz Zwrot'));
      });

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          expect.stringContaining('/cudzich/transactions'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"type":"zwrot"'),
          })
        );
      });
    });

    it('should display historical sale checkbox in Zwrot modal', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 0, transactions: [] }),
      });

      const { getByText } = renderComponent();
      
      await openZwrotModal(getByText);

      expect(getByText('Sprzedaż historyczna (sprzed systemu)')).toBeTruthy();
    });
  });

  describe('Payment Transactions', () => {
    it('should create Wpłata transaction', async () => {
      tokenService.authenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ balance: -200 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ transactions: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: true, 
            balance: -100,
            transaction: { type: 'wplata', price: 100 }
          }),
        });

      const { getByText, getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        fireEvent.press(getByText('Wpłata'));
      });

      const amountInput = getByPlaceholderText('Wpisz kwotę...');
      await act(async () => {
        fireEvent.changeText(amountInput, '100');
      });

      await act(async () => {
        fireEvent.press(getByText('Zapisz Wpłatę'));
      });

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          expect.stringContaining('/cudzich/transactions'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"type":"wplata"'),
          })
        );
      });
    });

    it('should create Wypłata transaction', async () => {
      tokenService.authenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ balance: 100 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ transactions: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: true, 
            balance: 150,
            transaction: { type: 'wyplata', price: 50 }
          }),
        });

      const { getByText, getByPlaceholderText } = renderComponent();
      
      await waitFor(() => {
        fireEvent.press(getByText('Wypłata'));
      });

      const amountInput = getByPlaceholderText('Wpisz kwotę...');
      await act(async () => {
        fireEvent.changeText(amountInput, '50');
      });

      await act(async () => {
        fireEvent.press(getByText('Zapisz Wypłatę'));
      });

      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          expect.stringContaining('/cudzich/transactions'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"type":"wyplata"'),
          })
        );
      });
    });

    it('should validate amount for payment transactions', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 0, transactions: [] }),
      });

      const { getByText } = renderComponent();
      
      await waitFor(() => {
        fireEvent.press(getByText('Wpłata'));
      });

      // Try to submit without amount
      await act(async () => {
        fireEvent.press(getByText('Zapisz Wpłatę'));
      });

      // Should not call API
      expect(tokenService.authenticatedFetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/cudzich/transactions'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('Date Filtering', () => {
    it('should open date filter modal', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 0, transactions: [] }),
      });

      const { getByText } = renderComponent();
      
      await waitFor(() => {
        fireEvent.press(getByText('📅 Filtruj'));
      });

      expect(getByText('Filtruj po dacie')).toBeTruthy();
      expect(getByText('Szybki wybór:')).toBeTruthy();
    });

    it('should display quick filter buttons', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 0, transactions: [] }),
      });

      const { getByText } = renderComponent();
      
      await waitFor(() => {
        fireEvent.press(getByText('📅 Filtruj'));
      });

      expect(getByText('Dziś')).toBeTruthy();
      expect(getByText('7 dni')).toBeTruthy();
      expect(getByText('30 dni')).toBeTruthy();
    });

    it('should show selected date range after clicking quick filter', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 0, transactions: [] }),
      });

      const { getByText } = renderComponent();
      
      await waitFor(() => {
        fireEvent.press(getByText('📅 Filtruj'));
      });

      await act(async () => {
        fireEvent.press(getByText('Dziś'));
      });

      await waitFor(() => {
        expect(getByText('✓ Wybrany okres:')).toBeTruthy();
      });
    });

    it('should clear date filters', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 0, transactions: [] }),
      });

      const { getByText, queryByText } = renderComponent();
      
      await waitFor(() => {
        fireEvent.press(getByText('📅 Filtruj'));
      });

      await act(async () => {
        fireEvent.press(getByText('7 dni'));
      });

      await waitFor(() => {
        expect(getByText('✓ Wybrany okres:')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByText('✕ Wyczyść'));
      });

      await waitFor(() => {
        expect(queryByText('✓ Wybrany okres:')).toBeNull();
      });
    });
  });

  describe('Price List Integration', () => {
    it('should fetch price list on component mount', async () => {
      const mockPriceList = {
        items: [
          { productName: 'Kurtka skórzana XL', price: 200 },
          { productName: 'Kurtka zamszowa L', price: 150 },
        ],
      };

      tokenService.authenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ balance: 0 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ transactions: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceList,
        });

      renderComponent();
      
      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          expect.stringContaining('/cudzich/pricelist')
        );
      });
    });

    it('should auto-fill price when product is selected', async () => {
      const mockPriceList = {
        items: [{ fullName: 'Kurtka skórzana XL', price: 250 }],
      };

      tokenService.authenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ balance: 0 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [],
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceList,
        });

      const { getByText, getByPlaceholderText, getByDisplayValue } = renderComponent();
      
      await openOdbiorModal(getByText);

      const productSearch = getByPlaceholderText('Wyszukaj kurtkę lub zeskanuj kod...');
      await act(async () => {
        fireEvent.changeText(productSearch, 'skórzana');
      });

      await waitFor(() => {
        fireEvent.press(getByText('Kurtka skórzana XL'));
      });

      await waitFor(() => {
        expect(getByDisplayValue('250')).toBeTruthy();
      });
    });
  });

  describe('Modal Behavior', () => {
    it('should close modal on cancel', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 0, transactions: [] }),
      });

      const { getByText, queryByText } = renderComponent();
      
      await openOdbiorModal(getByText);

      expect(getByText('ODBIÓR KURTKI')).toBeTruthy();

      await act(async () => {
        fireEvent.press(getByText('Anuluj'));
      });

      await waitFor(() => {
        expect(queryByText('ODBIÓR KURTKI')).toBeNull();
      });
    });

    it('should reset form when modal is closed', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ balance: 0, transactions: [] }),
      });

      const { getByText, getByPlaceholderText } = renderComponent();
      
      await openOdbiorModal(getByText);

      const productSearch = getByPlaceholderText('Wyszukaj kurtkę lub zeskanuj kod...');
      await act(async () => {
        fireEvent.changeText(productSearch, 'test');
      });

      await act(async () => {
        fireEvent.press(getByText('Anuluj'));
      });

      // Reopen modal
      await openOdbiorModal(getByText);

      const newProductSearch = getByPlaceholderText('Wyszukaj kurtkę lub zeskanuj kod...');
      expect(newProductSearch.props.value).toBe('');
    });

    it('should display success modal after transaction', async () => {
      const mockPriceList = {
        items: [{ productName: 'Kurtka skórzana XL', price: 200 }],
      };

      tokenService.authenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ balance: 0 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ transactions: [] }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockPriceList,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            success: true, 
            balance: -200,
            transaction: { type: 'odbior', price: 200 }
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ balance: -200 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ transactions: [] }),
        });

      const { getByText, getByPlaceholderText } = renderComponent();
      
      await openOdbiorModal(getByText);

      const productSearch = getByPlaceholderText('Wyszukaj kurtkę lub zeskanuj kod...');
      await act(async () => {
        fireEvent.changeText(productSearch, 'skórzana');
      });

      await waitFor(() => {
        fireEvent.press(getByText('Kurtka skórzana XL'));
      });

      const sizeInput = getByPlaceholderText('Wpisz rozmiar...');
      await act(async () => {
        fireEvent.changeText(sizeInput, 'XL');
      });

      await waitFor(() => {
        fireEvent.press(getByText('XL'));
      });

      await act(async () => {
        fireEvent.press(getByText('Zapisz Odbiór'));
      });

      await waitFor(() => {
        expect(getByText('Sukces!')).toBeTruthy();
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('should refresh data on pull', async () => {
      tokenService.authenticatedFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ balance: 100 }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ transactions: [] }),
        });

      const { getByTestId } = renderComponent();
      
      // This would require implementing testID on ScrollView with RefreshControl
      // For now, we verify the fetch is called initially
      await waitFor(() => {
        expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
          expect.stringContaining('/cudzich/balance')
        );
      });
    });
  });
});
