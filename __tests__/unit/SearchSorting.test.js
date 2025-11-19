/**
 * Unit tests for alphabetical sorting functionality in Search component
 * Tests the core sorting logic in isolation
 */

describe('Search Alphabetical Sorting Unit Tests', () => {
  // Test data designed to test various sorting scenarios
  const testItems = [
    { id: '1', fullName: 'Zebra Jacket', size: 'M' },
    { id: '2', fullName: 'alpha coat', size: 'L' },
    { id: '3', fullName: 'BETA VEST', size: 'S' },
    { id: '4', fullName: 'charlie blazer', size: 'XL' },
    { id: '5', fullName: 'Delta Sweater', size: 'M' },
    { id: '6', fullName: '', size: 'L' }, // Empty name
    { id: '7', fullName: null, size: 'S' }, // Null name
    { id: '8', fullName: undefined, size: 'XL' }, // Undefined name
    { id: '9', fullName: '123 Numeric Item', size: 'M' },
    { id: '10', fullName: 'Ąćęłńóśźż Polish', size: 'L' }, // Polish characters
    { id: '11', fullName: 'ąćęłńóśźż polish lowercase', size: 'S' }
  ];

  /**
   * Extract and test the sorting logic from the Search component
   */
  const alphabeticalSort = (items) => {
    return items.sort((a, b) => {
      const nameA = (a.fullName || '').toLowerCase();
      const nameB = (b.fullName || '').toLowerCase();
      return nameA.localeCompare(nameB, 'pl', { sensitivity: 'base' });
    });
  };

  describe('Basic Alphabetical Sorting', () => {
    it('should sort items alphabetically by fullName', () => {
      const basicItems = [
        { id: '1', fullName: 'Zebra' },
        { id: '2', fullName: 'Alpha' },
        { id: '3', fullName: 'Beta' },
        { id: '4', fullName: 'Charlie' }
      ];

      const sorted = alphabeticalSort([...basicItems]);
      
      expect(sorted[0].fullName).toBe('Alpha');
      expect(sorted[1].fullName).toBe('Beta');
      expect(sorted[2].fullName).toBe('Charlie');
      expect(sorted[3].fullName).toBe('Zebra');
    });

    it('should handle case-insensitive sorting', () => {
      const caseItems = [
        { id: '1', fullName: 'zebra' },
        { id: '2', fullName: 'ALPHA' },
        { id: '3', fullName: 'Beta' },
        { id: '4', fullName: 'charlie' }
      ];

      const sorted = alphabeticalSort([...caseItems]);
      
      expect(sorted[0].fullName).toBe('ALPHA');
      expect(sorted[1].fullName).toBe('Beta');
      expect(sorted[2].fullName).toBe('charlie');
      expect(sorted[3].fullName).toBe('zebra');
    });

    it('should handle mixed case sorting correctly', () => {
      const mixedItems = [
        { id: '1', fullName: 'zEBRA jacket' },
        { id: '2', fullName: 'Alpha COAT' },
        { id: '3', fullName: 'BETA vest' },
        { id: '4', fullName: 'charlie BLAZER' }
      ];

      const sorted = alphabeticalSort([...mixedItems]);
      
      expect(sorted[0].fullName).toBe('Alpha COAT');
      expect(sorted[1].fullName).toBe('BETA vest');
      expect(sorted[2].fullName).toBe('charlie BLAZER');
      expect(sorted[3].fullName).toBe('zEBRA jacket');
    });
  });

  describe('Polish Locale Sorting', () => {
    it('should sort Polish characters correctly', () => {
      const polishItems = [
        { id: '1', fullName: 'Żółty' },
        { id: '2', fullName: 'Ąpfel' },
        { id: '3', fullName: 'Łódź' },
        { id: '4', fullName: 'Ćwierć' },
        { id: '5', fullName: 'Niebieski' },
        { id: '6', fullName: 'Śmiały' }
      ];

      const sorted = alphabeticalSort([...polishItems]);
      
      // Expected order in Polish: Ąpfel, Ćwierć, Łódź, Niebieski, Śmiały, Żółty
      expect(sorted[0].fullName).toBe('Ąpfel');
      expect(sorted[1].fullName).toBe('Ćwierć');
      expect(sorted[2].fullName).toBe('Łódź');
      expect(sorted[3].fullName).toBe('Niebieski');
      expect(sorted[4].fullName).toBe('Śmiały');
      expect(sorted[5].fullName).toBe('Żółty');
    });

    it('should handle mixed Polish and English characters', () => {
      const mixedItems = [
        { id: '1', fullName: 'Żółta kurtka' },
        { id: '2', fullName: 'Alpha coat' },
        { id: '3', fullName: 'Ćma sweater' },
        { id: '4', fullName: 'Beta vest' }
      ];

      const sorted = alphabeticalSort([...mixedItems]);
      
      expect(sorted[0].fullName).toBe('Alpha coat');
      expect(sorted[1].fullName).toBe('Beta vest');
      expect(sorted[2].fullName).toBe('Ćma sweater');
      expect(sorted[3].fullName).toBe('Żółta kurtka');
    });
  });

  describe('Edge Cases Handling', () => {
    it('should handle empty strings', () => {
      const emptyItems = [
        { id: '1', fullName: 'Zebra' },
        { id: '2', fullName: '' },
        { id: '3', fullName: 'Alpha' },
        { id: '4', fullName: '' }
      ];

      const sorted = alphabeticalSort([...emptyItems]);
      
      // Empty strings should come first
      expect(sorted[0].fullName).toBe('');
      expect(sorted[1].fullName).toBe('');
      expect(sorted[2].fullName).toBe('Alpha');
      expect(sorted[3].fullName).toBe('Zebra');
    });

    it('should handle null and undefined values', () => {
      const nullItems = [
        { id: '1', fullName: 'Zebra' },
        { id: '2', fullName: null },
        { id: '3', fullName: 'Alpha' },
        { id: '4', fullName: undefined }
      ];

      const sorted = alphabeticalSort([...nullItems]);
      
      // null and undefined should be treated as empty strings and come first
      expect(sorted[0].fullName).toBe(null);
      expect(sorted[1].fullName).toBe(undefined);
      expect(sorted[2].fullName).toBe('Alpha');
      expect(sorted[3].fullName).toBe('Zebra');
    });

    it('should handle numeric strings', () => {
      const numericItems = [
        { id: '1', fullName: 'Zebra' },
        { id: '2', fullName: '123 Item' },
        { id: '3', fullName: 'Alpha' },
        { id: '4', fullName: '456 Product' }
      ];

      const sorted = alphabeticalSort([...numericItems]);
      
      // Numeric strings should be sorted as strings
      expect(sorted[0].fullName).toBe('123 Item');
      expect(sorted[1].fullName).toBe('456 Product');
      expect(sorted[2].fullName).toBe('Alpha');
      expect(sorted[3].fullName).toBe('Zebra');
    });

    it('should handle special characters', () => {
      const specialItems = [
        { id: '1', fullName: 'Zebra-Jacket' },
        { id: '2', fullName: 'Alpha_Coat' },
        { id: '3', fullName: 'Beta@Vest' },
        { id: '4', fullName: 'Charlie#Blazer' }
      ];

      const sorted = alphabeticalSort([...specialItems]);
      
      expect(sorted[0].fullName).toBe('Alpha_Coat');
      expect(sorted[1].fullName).toBe('Beta@Vest');
      expect(sorted[2].fullName).toBe('Charlie#Blazer');
      expect(sorted[3].fullName).toBe('Zebra-Jacket');
    });

    it('should maintain stable sorting for identical names', () => {
      const identicalItems = [
        { id: '1', fullName: 'Same Name', size: 'M' },
        { id: '2', fullName: 'Same Name', size: 'L' },
        { id: '3', fullName: 'Same Name', size: 'S' }
      ];

      const sorted = alphabeticalSort([...identicalItems]);
      
      // All items should be present
      expect(sorted).toHaveLength(3);
      expect(sorted.every(item => item.fullName === 'Same Name')).toBe(true);
      
      // Original order should be maintained for identical values (stable sort)
      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('2');
      expect(sorted[2].id).toBe('3');
    });
  });

  describe('Performance and Stress Tests', () => {
    it('should handle large arrays efficiently', () => {
      // Create a large array of items
      const largeArray = Array.from({ length: 1000 }, (_, index) => ({
        id: index.toString(),
        fullName: `Item ${Math.random().toString(36).substring(7)}`
      }));

      const startTime = performance.now();
      const sorted = alphabeticalSort([...largeArray]);
      const endTime = performance.now();
      
      // Should complete within reasonable time (less than 200ms)
      expect(endTime - startTime).toBeLessThan(200);
      expect(sorted).toHaveLength(1000);
      
      // Verify it's actually sorted
      for (let i = 1; i < sorted.length; i++) {
        const nameA = (sorted[i - 1].fullName || '').toLowerCase();
        const nameB = (sorted[i].fullName || '').toLowerCase();
        expect(nameA.localeCompare(nameB, 'pl', { sensitivity: 'base' })).toBeLessThanOrEqual(0);
      }
    });

    it('should handle empty array', () => {
      const emptyArray = [];
      const sorted = alphabeticalSort([...emptyArray]);
      
      expect(sorted).toEqual([]);
      expect(sorted).toHaveLength(0);
    });

    it('should handle single item array', () => {
      const singleArray = [{ id: '1', fullName: 'Single Item' }];
      const sorted = alphabeticalSort([...singleArray]);
      
      expect(sorted).toHaveLength(1);
      expect(sorted[0].fullName).toBe('Single Item');
    });
  });

  describe('Real-world Scenario Tests', () => {
    it('should sort realistic clothing item names', () => {
      const clothingItems = [
        { id: '1', fullName: 'Zimowa kurtka puchowa' },
        { id: '2', fullName: 'Letnia sukienka' },
        { id: '3', fullName: 'Jesienny płaszcz' },
        { id: '4', fullName: 'Wiosenna kamizelka' },
        { id: '5', fullName: 'Bluza z kapturem' },
        { id: '6', fullName: 'Elegancka marynarka' },
        { id: '7', fullName: 'Sportowe spodnie' },
        { id: '8', fullName: 'Ciepły sweter' }
      ];

      const sorted = alphabeticalSort([...clothingItems]);
      
      expect(sorted[0].fullName).toBe('Bluza z kapturem');
      expect(sorted[1].fullName).toBe('Ciepły sweter');
      expect(sorted[2].fullName).toBe('Elegancka marynarka');
      expect(sorted[3].fullName).toBe('Jesienny płaszcz');
      expect(sorted[4].fullName).toBe('Letnia sukienka');
      expect(sorted[5].fullName).toBe('Sportowe spodnie');
      expect(sorted[6].fullName).toBe('Wiosenna kamizelka');
      expect(sorted[7].fullName).toBe('Zimowa kurtka puchowa');
    });

    it('should handle brand names and models', () => {
      const brandItems = [
        { id: '1', fullName: 'Nike Air Max' },
        { id: '2', fullName: 'Adidas Ultraboost' },
        { id: '3', fullName: 'Puma Suede' },
        { id: '4', fullName: 'Converse All Star' },
        { id: '5', fullName: 'Vans Old Skool' },
        { id: '6', fullName: 'New Balance 990' }
      ];

      const sorted = alphabeticalSort([...brandItems]);
      
      expect(sorted[0].fullName).toBe('Adidas Ultraboost');
      expect(sorted[1].fullName).toBe('Converse All Star');
      expect(sorted[2].fullName).toBe('New Balance 990');
      expect(sorted[3].fullName).toBe('Nike Air Max');
      expect(sorted[4].fullName).toBe('Puma Suede');
      expect(sorted[5].fullName).toBe('Vans Old Skool');
    });
  });

  describe('Integration with Filtering Tests', () => {
    it('should sort filtered results correctly', () => {
      const allItems = [
        { id: '1', fullName: 'Zebra Red Jacket' },
        { id: '2', fullName: 'Alpha Blue Coat' },
        { id: '3', fullName: 'Beta Red Vest' },
        { id: '4', fullName: 'Charlie Green Blazer' },
        { id: '5', fullName: 'Delta Red Sweater' }
      ];

      // Simulate filtering for "Red" items
      const filteredItems = allItems.filter(item => 
        item.fullName.toLowerCase().includes('red')
      );

      const sorted = alphabeticalSort([...filteredItems]);
      
      expect(sorted).toHaveLength(3);
      expect(sorted[0].fullName).toBe('Beta Red Vest');
      expect(sorted[1].fullName).toBe('Delta Red Sweater');
      expect(sorted[2].fullName).toBe('Zebra Red Jacket');
    });
  });
});
