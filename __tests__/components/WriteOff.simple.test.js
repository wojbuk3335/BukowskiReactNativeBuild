import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import WriteOff from '../../app/(tabs)/writeoff';
import { GlobalStateContext } from '../../context/GlobalState';

// Mock the navigation library - auto-trigger focus effect
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    // Call callback immediately to trigger data loading
    setTimeout(callback, 100);
    return () => {};
  }),
}));

// Mock fetch
global.fetch = jest.fn();

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('WriteOff Simplified Tests', () => {
  const mockContextValue = {
    user: {
      _id: '1',
      symbol: 'T',
      email: 'test@test.com',
      location: 'Zakopane',
      sellingPoint: 'Point T'
    },
    stateData: [
      {
        id: '1',
        symbol: 'T',
        fullName: 'Ada',
        size: '2XL',
        color: 'CZERWONY',
        barcode: '0010702300001'
      },
      {
        id: '2',
        symbol: 'T',
        fullName: 'Bella',
        size: 'L',
        color: 'NIEBIESKI',
        barcode: '0010702300002'
      }
    ],
    users: [
      {
        _id: '2',
        symbol: 'K',
        location: 'Zakopane',
        role: 'seller',
        sellingPoint: 'Point K'
      },
      {
        _id: '3',
        symbol: 'D',
        location: 'Zakopane',
        role: 'dom',
        sellingPoint: 'Dom'
      }
    ],
    fetchState: jest.fn(() => Promise.resolve()),
    fetchUsers: jest.fn(() => Promise.resolve()),
    getFilteredSellingPoints: jest.fn(() => [
      { _id: '2', symbol: 'K', location: 'Zakopane', role: 'seller', sellingPoint: 'Point K' },
      { _id: '3', symbol: 'D', location: 'Zakopane', role: 'dom', sellingPoint: 'Dom' }
    ])
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fetch.mockClear();
    Alert.alert.mockClear();
    
    // Mock successful API responses
    fetch.mockImplementation((url) => {
      if (url.includes('/transfer')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      if (url.includes('/sales/get-all-sales')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([])
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
    });
  });

  const renderWithContext = (component) => {
    return render(
      <GlobalStateContext.Provider value={mockContextValue}>
        {component}
      </GlobalStateContext.Provider>
    );
  };

  describe('Basic Component Tests', () => {
    it('should render component after loading', async () => {
      const { getByTestId } = renderWithContext(<WriteOff />);
      
      await waitFor(() => {
        expect(getByTestId('writeoff-flatlist')).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should display user email', async () => {
      const { getByText } = renderWithContext(<WriteOff />);
      
      await waitFor(() => {
        expect(getByText('Stan użytkownika: test@test.com')).toBeTruthy();
      }, { timeout: 3000 });
    });

    it('should display filtered items', async () => {
      const { getByText } = renderWithContext(<WriteOff />);
      
      await waitFor(() => {
        expect(getByText('1. Ada   2XL')).toBeTruthy();
        expect(getByText('2. Bella   L')).toBeTruthy();
      }, { timeout: 3000 });
    });
  });

  describe('Menu Interaction Tests', () => {
    it('should open modal when menu is clicked', async () => {
      const { getByText, getAllByText } = renderWithContext(<WriteOff />);
      
      await waitFor(() => {
        const menuButtons = getAllByText('⋮');
        fireEvent.press(menuButtons[0]);
      }, { timeout: 3000 });
      
      await waitFor(() => {
        expect(getByText('Opcje')).toBeTruthy();
      });
    });

    it('should show transfer option for items', async () => {
      const { getByText, getAllByText } = renderWithContext(<WriteOff />);
      
      await waitFor(() => {
        const menuButtons = getAllByText('⋮');
        fireEvent.press(menuButtons[0]);
      }, { timeout: 3000 });
      
      await waitFor(() => {
        expect(getByText('Przepisz do')).toBeTruthy();
      });
    });

    it('should open user selection modal', async () => {
      const { getByText, getAllByText } = renderWithContext(<WriteOff />);
      
      await waitFor(() => {
        const menuButtons = getAllByText('⋮');
        fireEvent.press(menuButtons[0]);
      }, { timeout: 3000 });
      
      await waitFor(() => {
        fireEvent.press(getByText('Przepisz do'));
      });
      
      await waitFor(() => {
        expect(getByText('Wybierz użytkownika')).toBeTruthy();
      });
    });
  });

  describe('API Integration Tests', () => {
    it('should call APIs after mount', async () => {
      renderWithContext(<WriteOff />);
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalled();
      }, { timeout: 3000 });
    });

    it('should handle successful transfer creation', async () => {
      fetch.mockImplementation((url, options) => {
        if (options?.method === 'POST' && url.includes('/transfer')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });
      
      const { getByText, getAllByText } = renderWithContext(<WriteOff />);
      
      await waitFor(() => {
        const menuButtons = getAllByText('⋮');
        fireEvent.press(menuButtons[0]);
      }, { timeout: 3000 });
      
      await waitFor(() => {
        fireEvent.press(getByText('Przepisz do'));
      });
      
      await waitFor(() => {
        fireEvent.press(getByText('K'));
      });
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Sukces', 'Transfer został pomyślnie utworzony!');
      });
    });

    it('should handle transfer errors', async () => {
      fetch.mockImplementation((url, options) => {
        if (options?.method === 'POST' && url.includes('/transfer')) {
          return Promise.resolve({
            ok: false,
            status: 400,
            json: () => Promise.resolve({ error: 'E11000 duplicate key error' })
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      });
      
      const { getByText, getAllByText } = renderWithContext(<WriteOff />);
      
      await waitFor(() => {
        const menuButtons = getAllByText('⋮');
        fireEvent.press(menuButtons[0]);
      }, { timeout: 3000 });
      
      await waitFor(() => {
        fireEvent.press(getByText('Przepisz do'));
      });
      
      await waitFor(() => {
        fireEvent.press(getByText('K'));
      });
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Kurtka już przeniesiona',
          'Ta kurtka została już wcześniej przeniesiona dzisiaj. Spróbuj jutro.'
        );
      });
    });
  });

  describe('Dom Transfer Tests', () => {
    it('should show reason modal for Dom transfers', async () => {
      const { getByText, getAllByText } = renderWithContext(<WriteOff />);
      
      await waitFor(() => {
        const menuButtons = getAllByText('⋮');
        fireEvent.press(menuButtons[0]);
      }, { timeout: 3000 });
      
      await waitFor(() => {
        fireEvent.press(getByText('Przepisz do'));
      });
      
      await waitFor(() => {
        fireEvent.press(getByText('D'));
      });
      
      await waitFor(() => {
        expect(getByText('Powód przepisania do domu')).toBeTruthy();
        expect(getByText('Skracanie rękawów')).toBeTruthy();
        expect(getByText('Przeróbka')).toBeTruthy();
        expect(getByText('Wysyłka')).toBeTruthy();
      });
    });

    it('should show advance payment section', async () => {
      const { getByText, getAllByText } = renderWithContext(<WriteOff />);
      
      await waitFor(() => {
        const menuButtons = getAllByText('⋮');
        fireEvent.press(menuButtons[0]);
      }, { timeout: 3000 });
      
      await waitFor(() => {
        fireEvent.press(getByText('Przepisz do'));
      });
      
      await waitFor(() => {
        fireEvent.press(getByText('D'));
      });
      
      await waitFor(() => {
        expect(getByText('Zaliczka (opcjonalnie)')).toBeTruthy();
        expect(getByText('PLN')).toBeTruthy();
      });
    });
  });
});
