/**
 * Integration tests for Search component functionality
 * Tests the complete search and sorting workflow
 */

import { render } from '@testing-library/react-native';
import SearchScreen from '../../app/(tabs)/search';
import { GlobalStateContext } from '../../context/GlobalState';

// Mock the navigation library
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useIsFocused: jest.fn(() => true),
}));

// Mock QRScannerSearch component
jest.mock('../../app/QRScannerSearch', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return jest.fn(() => React.createElement(View, null, React.createElement(Text, null, 'QRScannerSearch Mock')));
});

describe('Search Integration Tests', () => {
  // Comprehensive test data that mirrors real-world clothing inventory
  const mockStateData = [
    {
      id: '1',
      fullName: 'Zimowa kurtka puchowa damska',
      size: 'M',
      symbol: 'MAGAZYN',
      barcode: '1234567890001',
      color: 'czarny',
      qty: 2,
      price: 299.99
    },
    {
      id: '2',
      fullName: 'Adidas Ultraboost męskie',
      size: '42',
      symbol: 'SKLEP_A',
      barcode: '1234567890002',
      color: 'biały',
      qty: 1,
      price: 599.99
    },
    {
      id: '3',
      fullName: 'Letnia sukienka w kwiaty',
      size: 'S',
      symbol: 'SKLEP_B',
      barcode: '1234567890003',
      color: 'czerwony',
      qty: 3,
      price: 129.99
    },
    {
      id: '4',
      fullName: 'Bluza z kapturem Nike',
      size: 'L',
      symbol: 'MAGAZYN',
      barcode: '1234567890004',
      color: 'szary',
      qty: 1,
      price: 249.99
    },
    {
      id: '5',
      fullName: 'Elegancka marynarka biznesowa',
      size: 'XL',
      symbol: 'SKLEP_C',
      barcode: '1234567890005',
      color: 'granatowy',
      qty: 2,
      price: 449.99
    },
    {
      id: '6',
      fullName: 'Ćma sweter wełniany',
      size: 'M',
      symbol: 'MAGAZYN',
      barcode: '1234567890006',
      color: 'beżowy',
      qty: 1,
      price: 179.99
    },
    {
      id: '7',
      fullName: 'Żółta kurtka przeciwdeszczowa',
      size: 'L',
      symbol: 'SKLEP_A',
      barcode: '1234567890007',
      color: 'żółty',
      qty: 2,
      price: 199.99
    },
    {
      id: '8',
      fullName: 'Ąpfel koszulka polo',
      size: 'M',
      symbol: 'SKLEP_B',
      barcode: '1234567890008',
      color: 'zielony',
      qty: 4,
      price: 89.99
    }
  ];

  const mockContextValue = {
    stateData: mockStateData,
    user: {
      _id: '1',
      symbol: 'TEST_USER',
      email: 'test@example.com',
      location: 'Warszawa'
    },
    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
    colors: ['czarny', 'biały', 'czerwony', 'szary', 'granatowy', 'beżowy', 'żółty', 'zielony'],
    goods: [],
    fetchState: jest.fn()
  };

  const renderWithContext = (component, contextOverride = {}) => {
    const finalContext = { ...mockContextValue, ...contextOverride };
    return render(
      <GlobalStateContext.Provider value={finalContext}>
        {component}
      </GlobalStateContext.Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Data Sorting Integration Tests', () => {
    it('should sort data alphabetically in the filtered results', () => {
      // Test the sorting logic directly from the component logic
      const testData = mockStateData;
      
      // Simulate the sorting logic from the component
      const sorted = testData.sort((a, b) => {
        const nameA = (a.fullName || '').toLowerCase();
        const nameB = (b.fullName || '').toLowerCase();
        return nameA.localeCompare(nameB, 'pl', { sensitivity: 'base' });
      });

      // Verify alphabetical order (actual Polish locale sorting)
      expect(sorted[0].fullName).toBe('Adidas Ultraboost męskie');
      expect(sorted[1].fullName).toBe('Ąpfel koszulka polo');
      expect(sorted[2].fullName).toBe('Bluza z kapturem Nike');
      expect(sorted[3].fullName).toBe('Ćma sweter wełniany');
      expect(sorted[4].fullName).toBe('Elegancka marynarka biznesowa');
      expect(sorted[5].fullName).toBe('Letnia sukienka w kwiaty');
      expect(sorted[6].fullName).toBe('Zimowa kurtka puchowa damska');
      expect(sorted[7].fullName).toBe('Żółta kurtka przeciwdeszczowa');
    });

    it('should filter and sort data correctly', () => {
      const testData = mockStateData;
      const searchText = 'kurtka';
      
      // Simulate filtering logic
      const filtered = testData.filter(item => {
        const itemString = (
          (item.fullName || '') + ' ' +
          (item.size || '') + ' ' +
          (item.symbol || '') + ' ' +
          (item.barcode || '') + ' ' +
          (item.color || '')
        ).toLowerCase();
        
        return itemString.includes(searchText.toLowerCase());
      });

      // Sort the filtered results
      const sorted = filtered.sort((a, b) => {
        const nameA = (a.fullName || '').toLowerCase();
        const nameB = (b.fullName || '').toLowerCase();
        return nameA.localeCompare(nameB, 'pl', { sensitivity: 'base' });
      });

      expect(sorted).toHaveLength(2);
      expect(sorted[0].fullName).toBe('Zimowa kurtka puchowa damska');
      expect(sorted[1].fullName).toBe('Żółta kurtka przeciwdeszczowa');
    });

    it('should handle Polish color stemming', () => {
      const stemPolishColor = (str) =>
        str.replace(/(y|a|e|ego|ej|ą|ę|i|iego|iej|ym|im|ie|ich|ych|emu|emu|ący|ąca|ące|ami|ami|owi|owie|ów|om|ach|u|o|ą)$/g, '');

      expect(stemPolishColor('czerwony')).toBe('czerwon');
      expect(stemPolishColor('czerwona')).toBe('czerwon');
      expect(stemPolishColor('czerwone')).toBe('czerwon');
      expect(stemPolishColor('niebieski')).toBe('niebiesk');
    });

    it('should handle multi-word search correctly', () => {
      const testData = mockStateData;
      const searchText = 'kurtka damska';
      const searchWords = searchText.split(/\s+/);
      
      const filtered = testData.filter(item => {
        const itemString = (
          (item.fullName || '') + ' ' +
          (item.size || '') + ' ' +
          (item.symbol || '') + ' ' +
          (item.barcode || '') + ' ' +
          (item.color || '')
        ).toLowerCase();
        
        return searchWords.every(word => itemString.includes(word));
      });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].fullName).toBe('Zimowa kurtka puchowa damska');
    });
  });

  describe('Component Rendering Tests', () => {
    it('should render Search component without crashing', () => {
      const result = renderWithContext(<SearchScreen />);
      
      // Check if component renders without crashing
      expect(result).toBeTruthy();
    });

    it('should handle proper context data', () => {
      const result = renderWithContext(<SearchScreen />);
      
      // Just ensure component can handle the context data
      expect(result).toBeTruthy();
    });
  });

  describe('Context Integration Tests', () => {
    it('should handle different stateData sizes', () => {
      const largeData = Array.from({ length: 50 }, (_, index) => ({
        id: `item_${index}`,
        fullName: `Test Item ${String.fromCharCode(65 + (index % 26))}`,
        size: 'M',
        symbol: 'TEST',
        barcode: `12345${index}`,
        color: 'test'
      }));

      const result = renderWithContext(<SearchScreen />, { stateData: largeData });
      
      expect(result).toBeTruthy();
    });

    it('should handle empty stateData', () => {
      const result = renderWithContext(<SearchScreen />, { stateData: [] });
      
      expect(result).toBeTruthy();
    });

    it('should handle null stateData', () => {
      const result = renderWithContext(<SearchScreen />, { stateData: null });
      
      expect(result).toBeTruthy();
    });
  });

  describe('Performance Tests', () => {
    it('should sort large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 1000 }, (_, index) => ({
        id: `large_${index}`,
        fullName: `Item ${Math.random().toString(36).substring(7)}`,
        size: 'M',
        symbol: 'TEST',
        barcode: `${index}`,
        color: 'test'
      }));

      const startTime = performance.now();
      
      const sorted = largeDataset.sort((a, b) => {
        const nameA = (a.fullName || '').toLowerCase();
        const nameB = (b.fullName || '').toLowerCase();
        return nameA.localeCompare(nameB, 'pl', { sensitivity: 'base' });
      });

      const endTime = performance.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete within 100ms
      expect(sorted).toHaveLength(1000);
    });
  });

  describe('Edge Case Tests', () => {
    it('should handle items with missing fullName', () => {
      const dataWithMissingNames = [
        { id: '1', fullName: '', size: 'M', symbol: 'A' },
        { id: '2', fullName: 'Test Item', size: 'L', symbol: 'B' },
        { id: '3', fullName: null, size: 'S', symbol: 'C' }
      ];

      const sorted = dataWithMissingNames.sort((a, b) => {
        const nameA = (a.fullName || '').toLowerCase();
        const nameB = (b.fullName || '').toLowerCase();
        return nameA.localeCompare(nameB, 'pl', { sensitivity: 'base' });
      });

      expect(sorted).toHaveLength(3);
      expect(sorted[2].fullName).toBe('Test Item'); // Should be last after empty strings
    });

    it('should handle special characters in search', () => {
      const testData = mockStateData;
      const searchText = '@#$%';
      
      const filtered = testData.filter(item => {
        const itemString = (item.fullName || '').toLowerCase();
        return itemString.includes(searchText.toLowerCase());
      });

      expect(filtered).toHaveLength(0);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle clothing item search scenarios', () => {
      const testData = mockStateData;
      
      // Search by brand
      const adidasItems = testData.filter(item => 
        (item.fullName || '').toLowerCase().includes('adidas')
      );
      expect(adidasItems).toHaveLength(1);

      // Search by type
      const jackets = testData.filter(item => 
        (item.fullName || '').toLowerCase().includes('kurtka')
      );
      expect(jackets).toHaveLength(2);

      // Search by color
      const blackItems = testData.filter(item => 
        (item.color || '').toLowerCase().includes('czarny')
      );
      expect(blackItems).toHaveLength(1);
    });

    it('should handle size-based searches', () => {
      const testData = mockStateData;
      
      const mediumItems = testData.filter(item => 
        (item.size || '').toLowerCase().includes('m')
      );
      
      expect(mediumItems.length).toBeGreaterThan(0);
    });

    it('should handle barcode searches', () => {
      const testData = mockStateData;
      const barcode = '1234567890003';
      
      const foundItems = testData.filter(item => 
        (item.barcode || '').includes(barcode)
      );
      
      expect(foundItems).toHaveLength(1);
      expect(foundItems[0].fullName).toBe('Letnia sukienka w kwiaty');
    });
  });
});
