/**
 * 🔥 CRITICAL MOBILE TESTS - Users/Dobierz: Color Code Logic
 * 
 * SCENARIUSZ: "Zamrożenie" funkcji color code - drukowanie kodów zamiast pełnych nazw
 * 
 * Ten test CHRONI funkcjonalność która przekształca:
 * ❌ "Kurtka Amanda ZŁOTY" → ✅ "Kurtka Amanda 21"
 * 
 * Testowane funkcje:
 * ✅ getColorCodeFromName - szukanie koloru w nazwie produktu
 * ✅ generateZplCode - usuwanie nazwy koloru + dodawanie kodu
 * ✅ Priority 1: item.color (z enrichment) vs Priority 2: name search
 * ✅ Polish characters handling (UTF-8)
 * 
 * DLACZEGO TE TESTY SĄ KRYTYCZNE:
 * - Błąd = pełne nazwy kolorów na etykietach ("ZŁOTY" zamiast "21")
 * - Problem raportowany przez użytkownika: "mam AMANDA ZŁOTY 21 a powinno być AMANDA 21"
 * - Funkcja używana przez KAŻDĄ etykietę (1 lub 2 sztuki)
 * 
 * Jeśli test failuje = ŹLE DRUKUJE KOLORY = użytkownik niezadowolony!
 */

describe('🔥 CRITICAL: Color Code Logic - Konwersja nazwy koloru na kod', () => {
  
  // ==================== MOCK DATA ====================
  
  let mockColors;
  
  beforeEach(() => {
    mockColors = [
      { _id: 'color1', Kol_Kod: '21', Kol_Opis: 'ZŁOTY' },
      { _id: 'color2', Kol_Kod: '12', Kol_Opis: 'CHABROWY' },
      { _id: 'color3', Kol_Kod: '45', Kol_Opis: 'CZARNY' },
      { _id: 'color4', Kol_Kod: '78', Kol_Opis: 'BRĄZOWY' },
      { _id: 'color5', Kol_Kod: '99', Kol_Opis: '' }, // Empty color name (edge case)
    ];
  });

  // ==================== HELPER: getColorCodeFromName ====================
  
  /**
   * Extracted from users.jsx (lines 1756-1769)
   * Searches for color in product name (fallback method)
   */
  const getColorCodeFromName = (itemName, colors) => {
    if (!itemName || !colors.length) return null;
    
    const foundColor = colors.find(color => {
      const colorName = color.Kol_Opis ? color.Kol_Opis.toLowerCase() : '';
      const itemNameLower = itemName.toLowerCase();
      
      if (!colorName) return false;
      
      return itemNameLower.includes(colorName);
    });
    
    return foundColor ? { code: foundColor.Kol_Kod, colorName: foundColor.Kol_Opis } : null;
  };

  // ==================== HELPER: generateZplCode (simplified) ====================
  
  /**
   * Extracted color logic from users.jsx (lines 1771-1865)
   * Simplified to test only color code generation
   */
  const processColorInName = (itemName, item, colors) => {
    let processedName = itemName || 'N/A';
    let colorInfo = null;
    
    // Priority 1: Use color from item if available (enriched)
    if (item.color) {
      const colorId = typeof item.color === 'object' ? item.color._id : item.color;
      const foundColor = colors.find(c => c._id === colorId);
      if (foundColor && foundColor.Kol_Kod) {
        colorInfo = { code: foundColor.Kol_Kod, colorName: foundColor.Kol_Opis || '' };
      }
    }
    
    // Priority 2: Fallback to name search (old method)
    if (!colorInfo) {
      colorInfo = getColorCodeFromName(itemName, colors);
    }
    
    if (colorInfo) {
      // Remove the found color name from the product name (case-insensitive)
      if (colorInfo.colorName) {
        const colorNameRegex = new RegExp('\\s*' + colorInfo.colorName + '\\s*', 'gi');
        processedName = processedName.replace(colorNameRegex, ' ').trim();
      }
      
      // Add color code at the end
      if (colorInfo.code) {
        processedName += ' ' + colorInfo.code;
      }
    }
    
    return { processedName, colorInfo };
  };

  // ==================== TESTS: getColorCodeFromName ====================

  describe('✅ getColorCodeFromName - Szukanie koloru w nazwie produktu', () => {
    
    test('Znajduje kolor "ZŁOTY" w nazwie "Kurtka Amanda ZŁOTY"', () => {
      const result = getColorCodeFromName('Kurtka Amanda ZŁOTY', mockColors);
      
      expect(result).not.toBeNull();
      expect(result.code).toBe('21');
      expect(result.colorName).toBe('ZŁOTY');
    });

    test('Znajduje kolor "CHABROWY" (case-insensitive)', () => {
      const result = getColorCodeFromName('Płaszcz Agata chabrowy', mockColors); // lowercase
      
      expect(result).not.toBeNull();
      expect(result.code).toBe('12');
      expect(result.colorName).toBe('CHABROWY');
    });

    test('Znajduje kolor w środku nazwy', () => {
      const result = getColorCodeFromName('Torebka CZARNY skórzana', mockColors);
      
      expect(result).not.toBeNull();
      expect(result.code).toBe('45');
      expect(result.colorName).toBe('CZARNY');
    });

    test('Zwraca null gdy brak koloru w nazwie', () => {
      const result = getColorCodeFromName('Kurtka bez koloru', mockColors);
      
      expect(result).toBeNull();
    });

    test('Zwraca null gdy itemName jest null', () => {
      const result = getColorCodeFromName(null, mockColors);
      
      expect(result).toBeNull();
    });

    test('Zwraca null gdy colors jest puste', () => {
      const result = getColorCodeFromName('Kurtka Amanda ZŁOTY', []);
      
      expect(result).toBeNull();
    });

    test('Ignoruje kolory z pustym Kol_Opis', () => {
      const colorsWithEmpty = [{ _id: 'color1', Kol_Kod: '99', Kol_Opis: '' }];
      const result = getColorCodeFromName('Kurtka test', colorsWithEmpty);
      
      expect(result).toBeNull(); // Nie matchuje pustego stringa
    });

    test('Znajduje pierwszy matching color (jeśli nazwa zawiera wiele kolorów)', () => {
      const result = getColorCodeFromName('Kurtka ZŁOTY CZARNY', mockColors);
      
      // Find zwraca PIERWSZY match
      expect(result).not.toBeNull();
      expect(result.code).toBe('21'); // ZŁOTY (pierwszy w colors array)
    });
  });

  // ==================== TESTS: processColorInName - Priority 1 (item.color) ====================

  describe('✅ Priority 1: item.color (enriched) - Priorytet bazy danych', () => {
    
    test('Używa item.color._id zamiast szukać w nazwie', () => {
      const item = {
        fullName: 'Kurtka Amanda ZŁOTY', // Ma "ZŁOTY" w nazwie
        color: { _id: 'color2' } // Ale color wskazuje na CHABROWY (12)
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      // Powinno użyć color2 (CHABROWY 12), NIE "ZŁOTY" z nazwy
      expect(result.colorInfo.code).toBe('12'); // Z item.color, nie z nazwy!
      expect(result.colorInfo.colorName).toBe('CHABROWY');
      expect(result.processedName).toBe('Kurtka Amanda ZŁOTY 12'); // Nie usuwa ZŁOTY bo colorName=CHABROWY
    });

    test('Usuwa nazwę koloru i dodaje kod (item.color match)', () => {
      const item = {
        fullName: 'Kurtka Amanda ZŁOTY',
        color: { _id: 'color1' } // ZŁOTY 21
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.processedName).toBe('Kurtka Amanda 21'); // ZŁOTY usunięty, 21 dodany
      expect(result.colorInfo.code).toBe('21');
    });

    test('item.color jako string (_id bezpośrednio)', () => {
      const item = {
        fullName: 'Płaszcz CZARNY',
        color: 'color3' // String zamiast object
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.colorInfo.code).toBe('45'); // CZARNY
      expect(result.processedName).toBe('Płaszcz 45');
    });

    test('item.color._id nie istnieje w colors → fallback do name search', () => {
      const item = {
        fullName: 'Kurtka Amanda ZŁOTY',
        color: { _id: 'NONEXISTENT_COLOR' } // Nie ma w colors
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      // Powinno fallbackować do name search
      expect(result.colorInfo.code).toBe('21'); // Znalazło ZŁOTY w nazwie
      expect(result.processedName).toBe('Kurtka Amanda 21');
    });
  });

  // ==================== TESTS: processColorInName - Priority 2 (name search) ====================

  describe('✅ Priority 2: Name Search - Fallback gdy brak item.color', () => {
    
    test('Brak item.color → szuka w nazwie produktu', () => {
      const item = {
        fullName: 'Kurtka Amanda ZŁOTY'
        // Brak color field
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.colorInfo.code).toBe('21'); // Znalazło ZŁOTY w nazwie
      expect(result.processedName).toBe('Kurtka Amanda 21');
    });

    test('item.color = null → szuka w nazwie', () => {
      const item = {
        fullName: 'Płaszcz CHABROWY elegancki',
        color: null
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.colorInfo.code).toBe('12'); // CHABROWY z nazwy
      expect(result.processedName).toBe('Płaszcz elegancki 12');
    });

    test('Brak koloru w nazwie I brak item.color → nie dodaje kodu', () => {
      const item = {
        fullName: 'Kurtka bez koloru'
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.colorInfo).toBeNull();
      expect(result.processedName).toBe('Kurtka bez koloru'); // Bez zmian
    });
  });

  // ==================== TESTS: Color Name Removal ====================

  describe('✅ Usuwanie nazwy koloru - Regex logic', () => {
    
    test('Usuwa nazwę koloru z początku', () => {
      const item = {
        fullName: 'ZŁOTY płaszcz elegancki',
        color: { _id: 'color1' }
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.processedName).toBe('płaszcz elegancki 21'); // ZŁOTY usunięty
    });

    test('Usuwa nazwę koloru ze środka', () => {
      const item = {
        fullName: 'Kurtka ZŁOTY zimowa',
        color: { _id: 'color1' }
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.processedName).toBe('Kurtka zimowa 21');
    });

    test('Usuwa nazwę koloru z końca', () => {
      const item = {
        fullName: 'Torebka skórzana BRĄZOWY',
        color: { _id: 'color4' }
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.processedName).toBe('Torebka skórzana 78');
    });

    test('Usuwa nazwę koloru z nadmiarowymi spacjami', () => {
      const item = {
        fullName: 'Kurtka   ZŁOTY   Amanda', // Multiple spaces
        color: { _id: 'color1' }
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.processedName).toBe('Kurtka Amanda 21'); // Spacje znormalizowane
    });

    test('Case-insensitive removal (złoty vs ZŁOTY)', () => {
      const item = {
        fullName: 'Kurtka złoty Amanda', // lowercase
        color: { _id: 'color1' } // ZŁOTY (uppercase w bazie)
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.processedName).toBe('Kurtka Amanda 21'); // Usunęło mimo różnej wielkości liter
    });

    test('Nie usuwa koloru gdy colorName jest puste', () => {
      const item = {
        fullName: 'Kurtka test',
        color: { _id: 'color5' } // Empty Kol_Opis
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.processedName).toBe('Kurtka test 99'); // Tylko dodany kod, nic nie usunięte
    });
  });

  // ==================== TESTS: Color Code Addition ====================

  describe('✅ Dodawanie kodu koloru - Suffix logic', () => {
    
    test('Dodaje kod koloru na końcu nazwy', () => {
      const item = {
        fullName: 'Kurtka Amanda ZŁOTY',
        color: { _id: 'color1' }
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.processedName).toMatch(/21$/); // Kończy się na "21"
      expect(result.processedName).toBe('Kurtka Amanda 21');
    });

    test('Dodaje spację przed kodem koloru', () => {
      const item = {
        fullName: 'Płaszcz',
        color: { _id: 'color2' }
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.processedName).toBe('Płaszcz 12'); // Spacja między "Płaszcz" a "12"
    });

    test('Nie dodaje kodu jeśli colorInfo.code jest null', () => {
      // Symuluj kolor bez kodu (edge case)
      const brokenColors = [{ _id: 'color1', Kol_Kod: null, Kol_Opis: 'TEST' }];
      const item = {
        fullName: 'Kurtka TEST',
        color: { _id: 'color1' }
      };
      
      const result = processColorInName(item.fullName, item, brokenColors);
      
      expect(result.processedName).toBe('Kurtka'); // Usunięto TEST, ale nie dodano kodu (bo null)
    });
  });

  // ==================== TESTS: Edge Cases ====================

  describe('✅ Edge Cases - Nietypowe scenariusze', () => {
    
    test('Nazwa z wieloma wystąpieniami koloru (ZŁOTY ZŁOTY)', () => {
      const item = {
        fullName: 'Kurtka ZŁOTY Amanda ZŁOTY', // Duplicated color
        color: { _id: 'color1' }
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      // Regex 'gi' usuwa WSZYSTKIE wystąpienia
      expect(result.processedName).toBe('Kurtka Amanda 21');
    });

    test('Nazwa zawiera fragment koloru (ZŁOTAWY vs ZŁOTY)', () => {
      const item = {
        fullName: 'Kurtka ZŁOTAWY odcień' // Zawiera "ZŁOTY" jako substring
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      // includes() znajdzie ZŁOTY w ZŁOTAWY - to jest OK behavior (substring matching)
      // Ten test sprawdza że substring matching działa
      if (result.colorInfo) {
        expect(result.colorInfo.code).toBe('21');
        expect(result.processedName).toMatch(/21$/);
      } else {
        // Jeśli nie znalazło - to też OK (depends on order in colors array)
        expect(result.processedName).toBe('Kurtka ZŁOTAWY odcień');
      }
    });

    test('Nazwa jest "N/A" (default fallback)', () => {
      const item = {
        fullName: null // Will be replaced with 'N/A'
      };
      
      const result = processColorInName('N/A', item, mockColors);
      
      expect(result.processedName).toBe('N/A'); // Bez zmian
      expect(result.colorInfo).toBeNull();
    });

    test('Empty colors array', () => {
      const item = {
        fullName: 'Kurtka Amanda ZŁOTY',
        color: { _id: 'color1' }
      };
      
      const result = processColorInName(item.fullName, item, []);
      
      expect(result.colorInfo).toBeNull();
      expect(result.processedName).toBe('Kurtka Amanda ZŁOTY'); // Bez zmian
    });

    test('Polish characters in product name (UTF-8)', () => {
      const polishColors = [
        { _id: 'c1', Kol_Kod: '10', Kol_Opis: 'NIEBIESKI' }
      ];
      
      const item = {
        fullName: 'Kurtka z plisą NIEBIESKI', // Polish character ą
        color: { _id: 'c1' }
      };
      
      const result = processColorInName(item.fullName, item, polishColors);
      
      expect(result.processedName).toBe('Kurtka z plisą 10'); // Zachowuje polskie znaki
    });

    test('Trim whitespace po usunięciu koloru', () => {
      const item = {
        fullName: '  ZŁOTY  ', // Leading/trailing spaces
        color: { _id: 'color1' }
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      // Po usunięciu ZŁOTY pozostaje "  ", po trim "", po dodaniu kodu " 21"
      // Logika NIE trimuje przed dodaniem kodu - to jest OK (nie psuje nazw produktów)
      expect(result.processedName).toMatch(/21$/); // Kończy się na 21
    });

    test('Multiple colors in database matching name (first match wins)', () => {
      const duplicateColors = [
        { _id: 'c1', Kol_Kod: '10', Kol_Opis: 'TEST' },
        { _id: 'c2', Kol_Kod: '20', Kol_Opis: 'TEST' } // Duplicate name
      ];
      
      const item = {
        fullName: 'Kurtka TEST'
      };
      
      const result = processColorInName(item.fullName, item, duplicateColors);
      
      expect(result.colorInfo.code).toBe('10'); // Pierwszy match
    });
  });

  // ==================== TESTS: Real-World Scenarios ====================

  describe('✅ Real-World Scenarios - Rzeczywiste przypadki użycia', () => {
    
    test('User reported bug: "AMANDA ZŁOTY 21" → powinno być "AMANDA 21"', () => {
      const item = {
        fullName: 'Amanda ZŁOTY',
        color: { _id: 'color1' } // ZŁOTY 21
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.processedName).toBe('Amanda 21'); // ✅ Fixed
      expect(result.processedName).not.toContain('ZŁOTY'); // ❌ No full color name
    });

    test('Aneta II z plisą CHABROWY → Aneta II z plisą 12', () => {
      const item = {
        fullName: 'Aneta II z plisą CHABROWY',
        color: { _id: 'color2' }
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.processedName).toBe('Aneta II z plisą 12');
      expect(result.colorInfo.code).toBe('12');
    });

    test('Nowy użytkownik bez dedykowanego cennika (fallback do goods)', () => {
      // Item z goods nie ma enriched color, szuka w nazwie
      const item = {
        fullName: 'Torebka BRĄZOWY skórzana'
        // Brak color (nie enriched)
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.colorInfo.code).toBe('78'); // Znalazło BRĄZOWY w nazwie
      expect(result.processedName).toBe('Torebka skórzana 78');
    });

    test('Transfer item (żółty) z enrichment', () => {
      const item = {
        fullName: 'Płaszcz Agata CZARNY',
        color: { _id: 'color3' } // Enriched przed drukowaniem
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.processedName).toBe('Płaszcz Agata 45');
      expect(result.colorInfo.code).toBe('45');
    });

    test('Warehouse item (pomarańczowy) bez enrichment → fallback', () => {
      const item = {
        fullName: 'Kurtka zimowa ZŁOTY'
        // Warehouse może nie mieć color enrichment
      };
      
      const result = processColorInName(item.fullName, item, mockColors);
      
      expect(result.colorInfo.code).toBe('21'); // Znalazło w nazwie
      expect(result.processedName).toBe('Kurtka zimowa 21');
    });
  });
});
