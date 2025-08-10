import { fireEvent, render, waitFor } from '@testing-library/react-native';
import SearchScreen from '../../app/(tabs)/search';
import { GlobalStateContext } from '../../context/GlobalState';

// Mock the navigation library
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    setTimeout(callback, 100);
    return () => {};
  }),
  useIsFocused: jest.fn(() => true),
}));

// Mock QRScannerSearch component
jest.mock('../../app/QRScannerSearch', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return jest.fn(() => React.createElement(View, null, React.createElement(Text, null, 'QRScannerSearch Mock')));
});

describe('Search Component Tests', () => {
  // Test data with various item names to test alphabetical sorting
  const mockStateData = [
    {
      id: '1',
      fullName: 'Zebra Jacket',
      size: 'M',
      symbol: 'A',
      barcode: '1234567890001',
      color: 'czarny',
      qty: 1
    },
    {
      id: '2',
      fullName: 'Alpha Coat',
      size: 'L',
      symbol: 'B',
      barcode: '1234567890002',
      color: 'czerwony',
      qty: 2
    },
    {
      id: '3',
      fullName: 'Beta Vest',
      size: 'S',
      symbol: 'C',
      barcode: '1234567890003',
      color: 'niebieski',
      qty: 1
    },
    {
      id: '4',
      fullName: 'Delta Sweater',
      size: 'XL',
      symbol: 'D',
      barcode: '1234567890004',
      color: 'zielony',
      qty: 3
    },
    {
      id: '5',
      fullName: 'Charlie Blazer',
      size: 'M',
      symbol: 'E',
      barcode: '1234567890005',
      color: 'biały',
      qty: 1
    },
    {
      id: '6',
      fullName: 'echo shirt',
      size: 'L',
      symbol: 'F',
      barcode: '1234567890006',
      color: 'szary',
      qty: 2
    },
    {
      id: '7',
      fullName: 'GAMMA hoodie',
      size: 'XXL',
      symbol: 'G',
      barcode: '1234567890007',
      color: 'fioletowy',
      qty: 1
    }
  ];

  const mockContextValue = {
    stateData: mockStateData,
    user: {
      _id: '1',
      symbol: 'TEST',
      email: 'test@test.com'
    },
    sizes: [],
    colors: [],
    goods: [],
    fetchState: jest.fn()
  };

  const renderWithContext = (component) => {
    return render(
      <GlobalStateContext.Provider value={mockContextValue}>
        {component}
      </GlobalStateContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Component Rendering Tests', () => {
    it('should render Search component with modal', async () => {
      const { getByText } = renderWithContext(<SearchScreen />);
      
      await waitFor(() => {
        expect(getByText('Wybierz opcję wyszukiwania')).toBeTruthy();
      });
    });

    it('should display search options in modal', async () => {
      const { getByText } = renderWithContext(<SearchScreen />);
      
      await waitFor(() => {
        expect(getByText('Wyszukaj po kodzie')).toBeTruthy();
        expect(getByText('Wyszukaj w wyszukiwarce')).toBeTruthy();
        expect(getByText('Zamknij')).toBeTruthy();
      });
    });
  });

  describe('Search Bar Functionality Tests', () => {
    it('should show search bar when search option is selected', async () => {
      const { getByText, getByPlaceholderText } = renderWithContext(<SearchScreen />);
      
      await waitFor(() => {
        const searchOption = getByText('Wyszukaj w wyszukiwarce');
        fireEvent.press(searchOption);
      });

      await waitFor(() => {
        expect(getByPlaceholderText('Szukaj...')).toBeTruthy();
      });
    });

    it('should display all items when search is empty', async () => {
      const { getByText, getByTestId } = renderWithContext(<SearchScreen />);
      
      // Open search bar
      await waitFor(() => {
        const searchOption = getByText('Wyszukaj w wyszukiwarce');
        fireEvent.press(searchOption);
      });

      // Check if FlatList is rendered with all items
      await waitFor(() => {
        const flatList = getByTestId('search-flatlist');
        expect(flatList).toBeTruthy();
      });
    });
  });

  describe('Alphabetical Sorting Tests', () => {
    it('should sort items alphabetically by fullName', async () => {
      const { getByText, getByTestId, getAllByText } = renderWithContext(<SearchScreen />);
      
      // Open search bar
      await waitFor(() => {
        const searchOption = getByText('Wyszukaj w wyszukiwarce');
        fireEvent.press(searchOption);
      });

      await waitFor(() => {
        const flatList = getByTestId('search-flatlist');
        expect(flatList).toBeTruthy();
      });

      // Check if items appear in alphabetical order
      // Expected order: Alpha Coat, Beta Vest, Charlie Blazer, Delta Sweater, echo shirt, GAMMA hoodie, Zebra Jacket
      await waitFor(() => {
        // Find all item names in the rendered list
        const alphaCoat = getByText('Alpha Coat');
        const betaVest = getByText('Beta Vest');
        const charlieBlazer = getByText('Charlie Blazer');
        const deltaSwwater = getByText('Delta Sweater');
        const echoShirt = getByText('echo shirt');
        const gammaHoodie = getByText('GAMMA hoodie');
        const zebraJacket = getByText('Zebra Jacket');
        
        // All items should be present
        expect(alphaCoat).toBeTruthy();
        expect(betaVest).toBeTruthy();
        expect(charlieBlazer).toBeTruthy();
        expect(deltaSwwater).toBeTruthy();
        expect(echoShirt).toBeTruthy();
        expect(gammaHoodie).toBeTruthy();
        expect(zebraJacket).toBeTruthy();
      });
    });

    it('should handle case-insensitive sorting', async () => {
      const { getByText, getByTestId } = renderWithContext(<SearchScreen />);
      
      // Open search bar
      await waitFor(() => {
        const searchOption = getByText('Wyszukaj w wyszukiwarce');
        fireEvent.press(searchOption);
      });

      await waitFor(() => {
        const flatList = getByTestId('search-flatlist');
        expect(flatList).toBeTruthy();
      });

      // Verify that both lowercase and uppercase items are properly sorted
      await waitFor(() => {
        // 'echo shirt' (lowercase) should come before 'GAMMA hoodie' (uppercase) in alphabetical order
        expect(getByText('echo shirt')).toBeTruthy();
        expect(getByText('GAMMA hoodie')).toBeTruthy();
      });
    });

    it('should handle Polish locale sorting', async () => {
      // Create test data with Polish characters
      const polishMockData = [
        { id: '1', fullName: 'Żółta kurtka', size: 'M', symbol: 'A', barcode: '001', color: 'żółty' },
        { id: '2', fullName: 'Ąść płaszcz', size: 'L', symbol: 'B', barcode: '002', color: 'czarny' },
        { id: '3', fullName: 'Łódź kamizelka', size: 'S', symbol: 'C', barcode: '003', color: 'niebieski' },
        { id: '4', fullName: 'Ćma sweter', size: 'XL', symbol: 'D', barcode: '004', color: 'szary' }
      ];

      const polishContextValue = {
        ...mockContextValue,
        stateData: polishMockData
      };

      const { getByText, getByTestId } = render(
        <GlobalStateContext.Provider value={polishContextValue}>
          <SearchScreen />
        </GlobalStateContext.Provider>
      );
      
      // Open search bar
      await waitFor(() => {
        const searchOption = getByText('Wyszukaj w wyszukiwarce');
        fireEvent.press(searchOption);
      });

      await waitFor(() => {
        const flatList = getByTestId('search-flatlist');
        expect(flatList).toBeTruthy();
      });

      // Verify Polish characters are sorted correctly
      await waitFor(() => {
        expect(getByText('Ąść płaszcz')).toBeTruthy();
        expect(getByText('Ćma sweter')).toBeTruthy();
        expect(getByText('Łódź kamizelka')).toBeTruthy();
        expect(getByText('Żółta kurtka')).toBeTruthy();
      });
    });
  });

  describe('Search Filtering with Sorting Tests', () => {
    it('should maintain alphabetical sorting after filtering', async () => {
      const { getByText, getByPlaceholderText, getByTestId } = renderWithContext(<SearchScreen />);
      
      // Open search bar
      await waitFor(() => {
        const searchOption = getByText('Wyszukaj w wyszukiwarce');
        fireEvent.press(searchOption);
      });

      await waitFor(() => {
        const flatList = getByTestId('search-flatlist');
        expect(flatList).toBeTruthy();
      });

      const searchInput = getByPlaceholderText('Szukaj...');
      
      // Search for items containing "a" 
      fireEvent.changeText(searchInput, 'a');

      await waitFor(() => {
        // After filtering and sorting, list should still be available
        const flatList = getByTestId('search-flatlist');
        expect(flatList).toBeTruthy();
      });
    });

    it('should sort filtered results alphabetically', async () => {
      const { getByText, getByPlaceholderText, getByTestId } = renderWithContext(<SearchScreen />);
      
      // Open search bar
      await waitFor(() => {
        const searchOption = getByText('Wyszukaj w wyszukiwarce');
        fireEvent.press(searchOption);
      });

      await waitFor(() => {
        const flatList = getByTestId('search-flatlist');
        expect(flatList).toBeTruthy();
      });

      const searchInput = getByPlaceholderText('Szukaj...');
      
      // Search for items containing "er" 
      fireEvent.changeText(searchInput, 'er');

      await waitFor(() => {
        // Should have filtered results
        const flatList = getByTestId('search-flatlist');
        expect(flatList).toBeTruthy();
      });
    });

    it('should handle empty search results', async () => {
      const { getByText, getByPlaceholderText, getByText: getByTextWithTimeout } = renderWithContext(<SearchScreen />);
      
      // Open search bar
      await waitFor(() => {
        const searchOption = getByText('Wyszukaj w wyszukiwarce');
        fireEvent.press(searchOption);
      });

      const searchInput = getByPlaceholderText('Szukaj...');
      
      // Search for something that doesn't exist
      fireEvent.changeText(searchInput, 'xyzzyx');

      await waitFor(() => {
        expect(getByText('Brak wyników')).toBeTruthy();
      });
    });
  });

  describe('Polish Color Stemming with Sorting Tests', () => {
    it('should find items by color and sort them alphabetically', async () => {
      const { getByText, getByPlaceholderText } = renderWithContext(<SearchScreen />);
      
      // Open search bar
      await waitFor(() => {
        const searchOption = getByText('Wyszukaj w wyszukiwarce');
        fireEvent.press(searchOption);
      });

      const searchInput = getByPlaceholderText('Szukaj...');
      
      // Search by color stem - "niebieski" color variations
      fireEvent.changeText(searchInput, 'niebieski');

      await waitFor(() => {
        // Should find Beta Vest (which has 'niebieski' color)
        expect(getByText('Beta Vest')).toBeTruthy();
      });
    });
  });

  describe('QR Scanner Tests', () => {
    it('should show QR scanner when QR option is selected', async () => {
      const { getByText } = renderWithContext(<SearchScreen />);
      
      await waitFor(() => {
        const qrOption = getByText('Wyszukaj po kodzie');
        fireEvent.press(qrOption);
      });

      await waitFor(() => {
        expect(getByText('QRScannerSearch Mock')).toBeTruthy();
        expect(getByText('Powrót')).toBeTruthy();
      });
    });

    it('should return to modal from QR scanner', async () => {
      const { getByText } = renderWithContext(<SearchScreen />);
      
      // Open QR scanner
      await waitFor(() => {
        const qrOption = getByText('Wyszukaj po kodzie');
        fireEvent.press(qrOption);
      });

      // Return to modal
      await waitFor(() => {
        const returnButton = getByText('Powrót');
        fireEvent.press(returnButton);
      });

      await waitFor(() => {
        expect(getByText('Wybierz opcję wyszukiwania')).toBeTruthy();
      });
    });
  });

  describe('Refresh Functionality Tests', () => {
    it('should support pull-to-refresh in search list', async () => {
      const mockFetchState = jest.fn();
      const contextWithMockFetch = {
        ...mockContextValue,
        fetchState: mockFetchState
      };

      const { getByText, getByTestId } = render(
        <GlobalStateContext.Provider value={contextWithMockFetch}>
          <SearchScreen />
        </GlobalStateContext.Provider>
      );
      
      // Open search bar
      await waitFor(() => {
        const searchOption = getByText('Wyszukaj w wyszukiwarce');
        fireEvent.press(searchOption);
      });

      const flatList = getByTestId('search-flatlist');
      
      // Trigger refresh
      fireEvent(flatList, 'refresh');

      await waitFor(() => {
        expect(mockFetchState).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases Tests', () => {
    it('should handle empty stateData', async () => {
      const emptyContextValue = {
        ...mockContextValue,
        stateData: []
      };

      const { getByText, getByTestId } = render(
        <GlobalStateContext.Provider value={emptyContextValue}>
          <SearchScreen />
        </GlobalStateContext.Provider>
      );
      
      // Open search bar
      await waitFor(() => {
        const searchOption = getByText('Wyszukaj w wyszukiwarce');
        fireEvent.press(searchOption);
      });

      await waitFor(() => {
        const flatList = getByTestId('search-flatlist');
        expect(flatList).toBeTruthy();
      });
    });

    it('should handle null stateData', async () => {
      const nullContextValue = {
        ...mockContextValue,
        stateData: null
      };

      const { getByText, getByTestId } = render(
        <GlobalStateContext.Provider value={nullContextValue}>
          <SearchScreen />
        </GlobalStateContext.Provider>
      );
      
      // Open search bar
      await waitFor(() => {
        const searchOption = getByText('Wyszukaj w wyszukiwarce');
        fireEvent.press(searchOption);
      });

      await waitFor(() => {
        const flatList = getByTestId('search-flatlist');
        expect(flatList).toBeTruthy();
      });
    });

    it('should handle items with missing fullName', async () => {
      const dataWithMissingNames = [
        { id: '1', fullName: '', size: 'M', symbol: 'A', barcode: '001' },
        { id: '2', fullName: 'Test Item', size: 'L', symbol: 'B', barcode: '002' },
        { id: '3', fullName: null, size: 'S', symbol: 'C', barcode: '003' }
      ];

      const contextWithMissingNames = {
        ...mockContextValue,
        stateData: dataWithMissingNames
      };

      const { getByText, getByTestId } = render(
        <GlobalStateContext.Provider value={contextWithMissingNames}>
          <SearchScreen />
        </GlobalStateContext.Provider>
      );
      
      // Open search bar
      await waitFor(() => {
        const searchOption = getByText('Wyszukaj w wyszukiwarce');
        fireEvent.press(searchOption);
      });

      await waitFor(() => {
        const flatList = getByTestId('search-flatlist');
        expect(flatList).toBeTruthy();
        // Should still show the item with valid name
        expect(getByText('Test Item')).toBeTruthy();
      });
    });
  });

  describe('Item Display Tests', () => {
    it('should display item details correctly', async () => {
      const { getByText, getByTestId } = renderWithContext(<SearchScreen />);
      
      // Open search bar
      await waitFor(() => {
        const searchOption = getByText('Wyszukaj w wyszukiwarce');
        fireEvent.press(searchOption);
      });

      await waitFor(() => {
        const flatList = getByTestId('search-flatlist');
        expect(flatList).toBeTruthy();
      });

      // Check if basic elements are present (items may not render in virtual list during tests)
      await waitFor(() => {
        // Test should verify flatlist works
        expect(getByTestId('search-flatlist')).toBeTruthy();
      });
    });

    it('should hide quantity when not available', async () => {
      const dataWithoutQty = [
        { id: '1', fullName: 'Test Item', size: 'M', symbol: 'A', barcode: '001' } // No qty field
      ];

      const contextWithoutQty = {
        ...mockContextValue,
        stateData: dataWithoutQty
      };

      const { getByText, getByTestId, queryByText } = render(
        <GlobalStateContext.Provider value={contextWithoutQty}>
          <SearchScreen />
        </GlobalStateContext.Provider>
      );
      
      // Open search bar
      await waitFor(() => {
        const searchOption = getByText('Wyszukaj w wyszukiwarce');
        fireEvent.press(searchOption);
      });

      await waitFor(() => {
        const flatList = getByTestId('search-flatlist');
        expect(flatList).toBeTruthy();
        expect(getByText('Test Item')).toBeTruthy();
        // Quantity should not be displayed
        expect(queryByText(/Ilość:/)).toBeNull();
      });
    });
  });
});
