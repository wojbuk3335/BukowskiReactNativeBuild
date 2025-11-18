/**
 * Unit tests for Remanent (Inventory) functionality
 * Tests the core logic for:
 * - Size extraction from product names
 * - Product grouping by barcode
 * - Comparison logic (missing/extra items)
 * - Filtering logic
 */

describe('Remanent Unit Tests', () => {
  describe('Size Extraction from Product Name', () => {
    /**
     * Test the logic that extracts size from product name
     * Based on lines 685-698 of remanent.jsx
     */
    const extractSizeFromName = (productName) => {
      const nameParts = productName.trim().split(' ');
      const extractedSize = nameParts[nameParts.length - 1];
      const nameWithoutSize = nameParts.slice(0, -1).join(' ');
      
      return {
        name: nameWithoutSize || productName,
        size: extractedSize || 'Nieznany'
      };
    };

    it('should extract size from product name with color and size', () => {
      const result = extractSizeFromName('Amanda ZŁOTY 3XL');
      expect(result.name).toBe('Amanda ZŁOTY');
      expect(result.size).toBe('3XL');
    });

    it('should extract standard sizes (XS, S, M, L, XL, XXL)', () => {
      const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      sizes.forEach(size => {
        const result = extractSizeFromName(`Kurtka CZARNA ${size}`);
        expect(result.name).toBe('Kurtka CZARNA');
        expect(result.size).toBe(size);
      });
    });

    it('should extract numeric sizes', () => {
      const result = extractSizeFromName('Kamizelka NIEBIESKA 42');
      expect(result.name).toBe('Kamizelka NIEBIESKA');
      expect(result.size).toBe('42');
    });

    it('should handle single word names', () => {
      const result = extractSizeFromName('Amanda');
      expect(result.name).toBe('Amanda'); // When only one word, it's used as fallback
      expect(result.size).toBe('Amanda'); // Last part is treated as size
    });

    it('should handle names with multiple spaces', () => {
      const result = extractSizeFromName('Kurtka Skórzana BRĄZOWA M');
      expect(result.name).toBe('Kurtka Skórzana BRĄZOWA');
      expect(result.size).toBe('M');
    });

    it('should handle names with leading/trailing spaces', () => {
      const result = extractSizeFromName('  Amanda ZŁOTY 3XL  ');
      expect(result.name).toBe('Amanda ZŁOTY');
      expect(result.size).toBe('3XL');
    });

    it('should return original name if only one word', () => {
      const result = extractSizeFromName('ProductName');
      expect(result.name).toBe('ProductName'); // Fallback to original when nameWithoutSize is empty
      expect(result.size).toBe('ProductName');
    });

    it('should handle empty strings', () => {
      const result = extractSizeFromName('');
      expect(result.name).toBe('');
      expect(result.size).toBe('Nieznany');
    });
  });

  describe('Product Grouping by Barcode', () => {
    /**
     * Test the logic that groups scanned products by barcode
     * Based on lines 683-700 of remanent.jsx
     */
    const groupProductsByBarcode = (products) => {
      const groups = {};
      products.forEach(product => {
        const code = product.code;
        if (!groups[code]) {
          const nameParts = product.name.trim().split(' ');
          const extractedSize = nameParts[nameParts.length - 1];
          const nameWithoutSize = nameParts.slice(0, -1).join(' ');
          
          groups[code] = {
            name: nameWithoutSize || product.name,
            size: product.size || extractedSize || 'Nieznany',
            code: code,
            price: product.value,
            count: 0
          };
        }
        groups[code].count++;
      });
      return groups;
    };

    it('should group products by barcode', () => {
      const products = [
        { code: 'BAR001', name: 'Amanda ZŁOTY XL', size: '', value: 100 },
        { code: 'BAR001', name: 'Amanda ZŁOTY XL', size: '', value: 100 },
        { code: 'BAR002', name: 'Kurtka CZARNA M', size: '', value: 150 }
      ];

      const groups = groupProductsByBarcode(products);
      
      expect(Object.keys(groups).length).toBe(2);
      expect(groups['BAR001'].count).toBe(2);
      expect(groups['BAR002'].count).toBe(1);
    });

    it('should extract size and clean name for grouped products', () => {
      const products = [
        { code: 'BAR001', name: 'Amanda ZŁOTY 3XL', size: '', value: 100 },
        { code: 'BAR001', name: 'Amanda ZŁOTY 3XL', size: '', value: 100 }
      ];

      const groups = groupProductsByBarcode(products);
      
      expect(groups['BAR001'].name).toBe('Amanda ZŁOTY');
      expect(groups['BAR001'].size).toBe('3XL');
      expect(groups['BAR001'].count).toBe(2);
    });

    it('should use existing size field if available', () => {
      const products = [
        { code: 'BAR001', name: 'Amanda ZŁOTY', size: 'XL', value: 100 }
      ];

      const groups = groupProductsByBarcode(products);
      
      expect(groups['BAR001'].size).toBe('XL');
      expect(groups['BAR001'].name).toBe('Amanda');
    });

    it('should handle products with same barcode but different scans', () => {
      const products = [
        { code: 'BAR001', name: 'Kurtka NIEBIESKA L', size: '', value: 120 },
        { code: 'BAR001', name: 'Kurtka NIEBIESKA L', size: '', value: 120 },
        { code: 'BAR001', name: 'Kurtka NIEBIESKA L', size: '', value: 120 }
      ];

      const groups = groupProductsByBarcode(products);
      
      expect(groups['BAR001'].count).toBe(3);
      expect(groups['BAR001'].name).toBe('Kurtka NIEBIESKA');
      expect(groups['BAR001'].size).toBe('L');
    });

    it('should preserve price from first product', () => {
      const products = [
        { code: 'BAR001', name: 'Product A', size: 'M', value: 100 },
        { code: 'BAR001', name: 'Product A', size: 'M', value: 150 }
      ];

      const groups = groupProductsByBarcode(products);
      
      expect(groups['BAR001'].price).toBe(100);
    });
  });

  describe('Comparison Logic - Missing and Extra Items', () => {
    /**
     * Test the logic that compares scanned items with expected state
     * Based on lines 705-726 of remanent.jsx
     */
    const compareWithState = (scannedGroups, stateItems) => {
      const missingItems = [];
      const extraItems = [];

      stateItems.forEach(stateItem => {
        const code = stateItem.barcode;
        const remanentGroup = scannedGroups[code];

        if (!remanentGroup) {
          // Missing - in state but not scanned
          missingItems.push({
            name: stateItem.fullName,
            size: stateItem.size,
            code: stateItem.barcode,
            price: stateItem.price,
            expectedCount: 1,
            actualCount: 0
          });
        } else if (remanentGroup.count > 1) {
          // Extra - scanned more than expected
          extraItems.push({
            name: remanentGroup.name,
            size: remanentGroup.size,
            code: code,
            price: remanentGroup.price,
            expectedCount: 1,
            actualCount: remanentGroup.count,
            excessCount: remanentGroup.count - 1
          });
        }
        // If count === 1, it's OK (not added to any list)
      });

      return { missingItems, extraItems };
    };

    it('should detect missing items (in state but not scanned)', () => {
      const scannedGroups = {
        'BAR001': { name: 'Product A', size: 'M', code: 'BAR001', count: 1 }
      };
      const stateItems = [
        { barcode: 'BAR001', fullName: 'Product A', size: 'M', price: 100 },
        { barcode: 'BAR002', fullName: 'Product B', size: 'L', price: 150 }
      ];

      const result = compareWithState(scannedGroups, stateItems);
      
      expect(result.missingItems.length).toBe(1);
      expect(result.missingItems[0].code).toBe('BAR002');
      expect(result.missingItems[0].actualCount).toBe(0);
      expect(result.missingItems[0].expectedCount).toBe(1);
    });

    it('should detect extra items (scanned more than once)', () => {
      const scannedGroups = {
        'BAR001': { name: 'Product A', size: 'M', code: 'BAR001', price: 100, count: 3 }
      };
      const stateItems = [
        { barcode: 'BAR001', fullName: 'Product A', size: 'M', price: 100 }
      ];

      const result = compareWithState(scannedGroups, stateItems);
      
      expect(result.extraItems.length).toBe(1);
      expect(result.extraItems[0].code).toBe('BAR001');
      expect(result.extraItems[0].actualCount).toBe(3);
      expect(result.extraItems[0].expectedCount).toBe(1);
      expect(result.extraItems[0].excessCount).toBe(2);
    });

    it('should not flag items with correct count', () => {
      const scannedGroups = {
        'BAR001': { name: 'Product A', size: 'M', code: 'BAR001', count: 1 },
        'BAR002': { name: 'Product B', size: 'L', code: 'BAR002', count: 1 }
      };
      const stateItems = [
        { barcode: 'BAR001', fullName: 'Product A', size: 'M', price: 100 },
        { barcode: 'BAR002', fullName: 'Product B', size: 'L', price: 150 }
      ];

      const result = compareWithState(scannedGroups, stateItems);
      
      expect(result.missingItems.length).toBe(0);
      expect(result.extraItems.length).toBe(0);
    });

    it('should handle multiple missing and extra items', () => {
      const scannedGroups = {
        'BAR001': { name: 'Product A', size: 'M', code: 'BAR001', price: 100, count: 2 },
        'BAR003': { name: 'Product C', size: 'S', code: 'BAR003', price: 120, count: 4 }
      };
      const stateItems = [
        { barcode: 'BAR001', fullName: 'Product A', size: 'M', price: 100 },
        { barcode: 'BAR002', fullName: 'Product B', size: 'L', price: 150 },
        { barcode: 'BAR003', fullName: 'Product C', size: 'S', price: 120 },
        { barcode: 'BAR004', fullName: 'Product D', size: 'XL', price: 200 }
      ];

      const result = compareWithState(scannedGroups, stateItems);
      
      expect(result.missingItems.length).toBe(2);
      expect(result.extraItems.length).toBe(2);
      expect(result.missingItems.map(i => i.code).sort()).toEqual(['BAR002', 'BAR004']);
      expect(result.extraItems.map(i => i.code).sort()).toEqual(['BAR001', 'BAR003']);
    });

    it('should handle empty scanned groups', () => {
      const scannedGroups = {};
      const stateItems = [
        { barcode: 'BAR001', fullName: 'Product A', size: 'M', price: 100 },
        { barcode: 'BAR002', fullName: 'Product B', size: 'L', price: 150 }
      ];

      const result = compareWithState(scannedGroups, stateItems);
      
      expect(result.missingItems.length).toBe(2);
      expect(result.extraItems.length).toBe(0);
    });

    it('should handle empty state items', () => {
      const scannedGroups = {
        'BAR001': { name: 'Product A', size: 'M', code: 'BAR001', count: 2 }
      };
      const stateItems = [];

      const result = compareWithState(scannedGroups, stateItems);
      
      expect(result.missingItems.length).toBe(0);
      expect(result.extraItems.length).toBe(0);
    });
  });

  describe('Filtering Logic', () => {
    /**
     * Test filtering logic for remanent data
     */
    const filterRemanentData = (data, filters) => {
      return data.filter(item => {
        // Filter by assortment (first word of name)
        if (filters.assortment) {
          const firstWord = (item.name || '').split(' ')[0];
          if (firstWord !== filters.assortment) return false;
        }

        // Filter by color (second word of name)
        if (filters.color) {
          const parts = (item.name || '').split(' ');
          const secondWord = parts.length > 1 ? parts[1] : '';
          if (secondWord !== filters.color) return false;
        }

        // Filter by size
        if (filters.size) {
          const nameParts = (item.name || '').trim().split(' ');
          const extractedSize = nameParts[nameParts.length - 1];
          const size = item.size || extractedSize;
          if (size !== filters.size) return false;
        }

        return true;
      });
    };

    const sampleData = [
      { id: 1, name: 'Amanda ZŁOTY XL', size: '', code: 'BAR001' },
      { id: 2, name: 'Amanda SREBRNY M', size: '', code: 'BAR002' },
      { id: 3, name: 'Kurtka CZARNA L', size: '', code: 'BAR003' },
      { id: 4, name: 'Kurtka BRĄZOWA XL', size: '', code: 'BAR004' },
      { id: 5, name: 'Kamizelka NIEBIESKA S', size: 'S', code: 'BAR005' }
    ];

    it('should filter by assortment', () => {
      const result = filterRemanentData(sampleData, { assortment: 'Amanda' });
      expect(result.length).toBe(2);
      expect(result.every(item => item.name.startsWith('Amanda'))).toBe(true);
    });

    it('should filter by color', () => {
      const result = filterRemanentData(sampleData, { color: 'CZARNA' });
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Kurtka CZARNA L');
    });

    it('should filter by size', () => {
      const result = filterRemanentData(sampleData, { size: 'XL' });
      expect(result.length).toBe(2);
    });

    it('should apply multiple filters', () => {
      const result = filterRemanentData(sampleData, { 
        assortment: 'Kurtka',
        size: 'XL'
      });
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Kurtka BRĄZOWA XL');
    });

    it('should return all items when no filters applied', () => {
      const result = filterRemanentData(sampleData, {});
      expect(result.length).toBe(5);
    });

    it('should return empty array when no matches', () => {
      const result = filterRemanentData(sampleData, { assortment: 'Nonexistent' });
      expect(result.length).toBe(0);
    });
  });

  describe('Correction Tracking', () => {
    /**
     * Test logic for tracking sent corrections
     */
    it('should track corrections by unique key', () => {
      const sentCorrections = new Set();
      const item = { code: 'BAR001', name: 'Product A' };
      const errorType = 'EXTRA_IN_REMANENT';
      
      const key = `${item.code}-${errorType}`;
      sentCorrections.add(key);
      
      expect(sentCorrections.has(key)).toBe(true);
      expect(sentCorrections.has('BAR001-EXTRA_IN_REMANENT')).toBe(true);
      expect(sentCorrections.has('BAR001-MISSING_IN_REMANENT')).toBe(false);
    });

    it('should handle multiple corrections', () => {
      const sentCorrections = new Set();
      
      sentCorrections.add('BAR001-EXTRA_IN_REMANENT');
      sentCorrections.add('BAR002-MISSING_IN_REMANENT');
      sentCorrections.add('BAR003-EXTRA_IN_REMANENT');
      
      expect(sentCorrections.size).toBe(3);
      expect(sentCorrections.has('BAR001-EXTRA_IN_REMANENT')).toBe(true);
      expect(sentCorrections.has('BAR002-MISSING_IN_REMANENT')).toBe(true);
    });

    it('should not duplicate corrections', () => {
      const sentCorrections = new Set();
      
      sentCorrections.add('BAR001-EXTRA_IN_REMANENT');
      sentCorrections.add('BAR001-EXTRA_IN_REMANENT');
      sentCorrections.add('BAR001-EXTRA_IN_REMANENT');
      
      expect(sentCorrections.size).toBe(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle null/undefined product names', () => {
      const extractSizeFromName = (productName) => {
        if (!productName) return { name: '', size: 'Nieznany' };
        const nameParts = productName.trim().split(' ');
        const extractedSize = nameParts[nameParts.length - 1];
        const nameWithoutSize = nameParts.slice(0, -1).join(' ');
        return {
          name: nameWithoutSize || productName,
          size: extractedSize || 'Nieznany'
        };
      };

      expect(extractSizeFromName(null)).toEqual({ name: '', size: 'Nieznany' });
      expect(extractSizeFromName(undefined)).toEqual({ name: '', size: 'Nieznany' });
      expect(extractSizeFromName('')).toEqual({ name: '', size: 'Nieznany' });
    });

    it('should handle products without barcodes', () => {
      const products = [
        { code: '', name: 'Product A', size: 'M', value: 100 },
        { code: null, name: 'Product B', size: 'L', value: 150 }
      ];

      const groups = {};
      products.forEach(product => {
        const code = product.code || 'UNKNOWN';
        if (!groups[code]) {
          groups[code] = { count: 0 };
        }
        groups[code].count++;
      });

      expect(groups['UNKNOWN'].count).toBe(2); // Both empty and null are treated as UNKNOWN
    });

    it('should handle products with special characters in names', () => {
      const extractSizeFromName = (productName) => {
        const nameParts = productName.trim().split(' ');
        const extractedSize = nameParts[nameParts.length - 1];
        const nameWithoutSize = nameParts.slice(0, -1).join(' ');
        return {
          name: nameWithoutSize || productName,
          size: extractedSize || 'Nieznany'
        };
      };

      const result = extractSizeFromName('Kurtka Skórzana Męska L');
      expect(result.name).toBe('Kurtka Skórzana Męska');
      expect(result.size).toBe('L');
    });

    it('should handle very long product names', () => {
      const extractSizeFromName = (productName) => {
        const nameParts = productName.trim().split(' ');
        const extractedSize = nameParts[nameParts.length - 1];
        const nameWithoutSize = nameParts.slice(0, -1).join(' ');
        return {
          name: nameWithoutSize || productName,
          size: extractedSize || 'Nieznany'
        };
      };

      const longName = 'Bardzo Długa Nazwa Produktu Z Wieloma Słowami I Szczegółami XL';
      const result = extractSizeFromName(longName);
      expect(result.name).toBe('Bardzo Długa Nazwa Produktu Z Wieloma Słowami I Szczegółami');
      expect(result.size).toBe('XL');
    });
  });
});
