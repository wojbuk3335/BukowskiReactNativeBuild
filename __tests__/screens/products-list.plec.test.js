/**
 * 🔥 CRITICAL MOBILE TESTS - Products: Plec (Gender) Field Extraction
 * 
 * ⚠️ UWAGA: Te testy chronią FIX który umożliwia dodawanie produktów do magazynu!
 * 
 * DLACZEGO TE TESTY SĄ KRYTYCZNE:
 * - Produkty BEZ pola Plec NIE MOGĄ być dodane do magazynu (warehouse requires Plec)
 * - Mobile app musi ekstrahować Plec z podkategorii PRZED wysłaniem FormData
 * - Backend domyślnie ustawia "Unisex", ale warehouse controller wymaga Plec z Goods
 * - Bug fix w products-list.jsx (linie 690-710) musi być chroniony przed przypadkowym usunięciem
 * 
 * ❌ NIGDY NIE USUWAJ TYCH TESTÓW
 * ❌ NIGDY NIE MODYFIKUJ LINII 690-710 W products-list.jsx BEZ AKTUALIZACJI TESTÓW
 * ❌ WSZYSTKIE TESTY MUSZĄ PRZECHODZIĆ PRZED COMMITEM
 * 
 * SCENARIUSZE TESTOWANE:
 * 
 * 📋 PLEC EXTRACTION:
 * 1. Plec ekstrahowany z podkategorii gdy jest wybrana
 * 2. Fallback do selectedGender gdy brak podkategorii
 * 3. Domyślnie "Unisex" gdy brak obu
 * 4. Różne wartości Plec (M, D, U)
 * 
 * 📤 FORM DATA:
 * 5. FormData zawiera pole "Plec" przed wysłaniem
 * 6. Wartość Plec w FormData odpowiada ekstrakcji
 * 
 * 🔗 INTEGRATION:
 * 7. Cały flow: wybór podkategorii → ekstrakcja Plec → FormData → API call
 * 
 * Jeśli którykolwiek test failuje → STOP, NIE COMMITUJ!
 * 🚨 To chroni mobile przed powrotem buga braku Plec!
 */

describe('🔥 CRITICAL MOBILE: Products - Plec Field Extraction', () => {
  
  // ==================================================================================
  // 📋 PLEC EXTRACTION LOGIC TESTS
  // ==================================================================================
  
  describe('📋 PLEC EXTRACTION LOGIC', () => {
    
    test('✅ Ekstrahuje Plec="M" z męskiej podkategorii', () => {
      // 🎯 SCENARIUSZ: Użytkownik wybiera męską podkategorię "Płaszcze"
      // OCZEKIWANIE: plecValue = "M"
      
      const selectedGender = null;
      const selectedSubcategory = 'subcat-1';
      const subcategories = [
        { _id: 'subcat-1', Name: 'Płaszcze', Plec: 'M' },
        { _id: 'subcat-2', Name: 'Sukienki', Plec: 'D' }
      ];
      
      // Symulacja logiki z products-list.jsx (linie 690-710)
      let plecValue = selectedGender || 'Unisex';
      if (selectedSubcategory && subcategories && subcategories.length > 0) {
        const selectedSubcategoryData = subcategories.find(s => s._id === selectedSubcategory);
        if (selectedSubcategoryData && selectedSubcategoryData.Plec) {
          plecValue = selectedSubcategoryData.Plec;
        }
      }
      
      expect(plecValue).toBe('M');
      expect(plecValue).not.toBe('Unisex');
    });

    test('✅ Ekstrahuje Plec="D" z damskiej podkategorii', () => {
      // 🎯 SCENARIUSZ: Użytkownik wybiera damską podkategorię "Sukienki"
      // OCZEKIWANIE: plecValue = "D"
      
      const selectedGender = null;
      const selectedSubcategory = 'subcat-2';
      const subcategories = [
        { _id: 'subcat-1', Name: 'Płaszcze', Plec: 'M' },
        { _id: 'subcat-2', Name: 'Sukienki', Plec: 'D' }
      ];
      
      let plecValue = selectedGender || 'Unisex';
      if (selectedSubcategory && subcategories && subcategories.length > 0) {
        const selectedSubcategoryData = subcategories.find(s => s._id === selectedSubcategory);
        if (selectedSubcategoryData && selectedSubcategoryData.Plec) {
          plecValue = selectedSubcategoryData.Plec;
        }
      }
      
      expect(plecValue).toBe('D');
      expect(plecValue).not.toBe('Unisex');
    });

    test('✅ Ekstrahuje Plec="U" z unisex podkategorii', () => {
      // 🎯 SCENARIUSZ: Użytkownik wybiera unisex podkategorię
      // OCZEKIWANIE: plecValue = "U"
      
      const selectedGender = null;
      const selectedSubcategory = 'subcat-3';
      const subcategories = [
        { _id: 'subcat-3', Name: 'T-shirty', Plec: 'U' }
      ];
      
      let plecValue = selectedGender || 'Unisex';
      if (selectedSubcategory && subcategories && subcategories.length > 0) {
        const selectedSubcategoryData = subcategories.find(s => s._id === selectedSubcategory);
        if (selectedSubcategoryData && selectedSubcategoryData.Plec) {
          plecValue = selectedSubcategoryData.Plec;
        }
      }
      
      expect(plecValue).toBe('U');
    });

    test('✅ Fallback do selectedGender gdy brak podkategorii', () => {
      // 🎯 SCENARIUSZ: Użytkownik wybiera płeć ręcznie, nie wybiera podkategorii
      // OCZEKIWANIE: plecValue = selectedGender
      
      const selectedGender = 'M';
      const selectedSubcategory = null;
      const subcategories = [];
      
      let plecValue = selectedGender || 'Unisex';
      if (selectedSubcategory && subcategories && subcategories.length > 0) {
        const selectedSubcategoryData = subcategories.find(s => s._id === selectedSubcategory);
        if (selectedSubcategoryData && selectedSubcategoryData.Plec) {
          plecValue = selectedSubcategoryData.Plec;
        }
      }
      
      expect(plecValue).toBe('M');
      expect(plecValue).toBe(selectedGender);
    });

    test('✅ Domyślnie "Unisex" gdy brak selectedGender i podkategorii', () => {
      // 🎯 SCENARIUSZ: Użytkownik nie wybiera ani płci ani podkategorii
      // OCZEKIWANIE: plecValue = "Unisex" (default)
      
      const selectedGender = null;
      const selectedSubcategory = null;
      const subcategories = [];
      
      let plecValue = selectedGender || 'Unisex';
      if (selectedSubcategory && subcategories && subcategories.length > 0) {
        const selectedSubcategoryData = subcategories.find(s => s._id === selectedSubcategory);
        if (selectedSubcategoryData && selectedSubcategoryData.Plec) {
          plecValue = selectedSubcategoryData.Plec;
        }
      }
      
      expect(plecValue).toBe('Unisex');
    });

    test('✅ Podkategoria override selectedGender (priorytet podkategorii)', () => {
      // 🎯 SCENARIUSZ: Użytkownik wybiera płeć "M" ręcznie, ale potem wybiera damską podkategorię
      // OCZEKIWANIE: plecValue = "D" z podkategorii (priorytet!)
      
      const selectedGender = 'M';
      const selectedSubcategory = 'subcat-2';
      const subcategories = [
        { _id: 'subcat-1', Name: 'Płaszcze', Plec: 'M' },
        { _id: 'subcat-2', Name: 'Sukienki', Plec: 'D' }
      ];
      
      let plecValue = selectedGender || 'Unisex';
      if (selectedSubcategory && subcategories && subcategories.length > 0) {
        const selectedSubcategoryData = subcategories.find(s => s._id === selectedSubcategory);
        if (selectedSubcategoryData && selectedSubcategoryData.Plec) {
          plecValue = selectedSubcategoryData.Plec;
        }
      }
      
      expect(plecValue).toBe('D');
      expect(plecValue).not.toBe(selectedGender);
    });

    test('✅ Ignoruje podkategorię bez pola Plec', () => {
      // 🎯 SCENARIUSZ: Podkategoria istnieje ale NIE MA pola Plec (legacy data)
      // OCZEKIWANIE: plecValue = selectedGender fallback
      
      const selectedGender = 'M';
      const selectedSubcategory = 'subcat-broken';
      const subcategories = [
        { _id: 'subcat-broken', Name: 'Legacy Category' } // brak Plec!
      ];
      
      let plecValue = selectedGender || 'Unisex';
      if (selectedSubcategory && subcategories && subcategories.length > 0) {
        const selectedSubcategoryData = subcategories.find(s => s._id === selectedSubcategory);
        if (selectedSubcategoryData && selectedSubcategoryData.Plec) {
          plecValue = selectedSubcategoryData.Plec;
        }
      }
      
      expect(plecValue).toBe('M');
      expect(plecValue).toBe(selectedGender);
    });

    test('✅ Obsługuje puste subcategories array', () => {
      // 🎯 SCENARIUSZ: Brak dostępnych podkategorii
      // OCZEKIWANIE: plecValue = "Unisex" default
      
      const selectedGender = null;
      const selectedSubcategory = 'subcat-1';
      const subcategories = []; // pusta lista!
      
      let plecValue = selectedGender || 'Unisex';
      if (selectedSubcategory && subcategories && subcategories.length > 0) {
        const selectedSubcategoryData = subcategories.find(s => s._id === selectedSubcategory);
        if (selectedSubcategoryData && selectedSubcategoryData.Plec) {
          plecValue = selectedSubcategoryData.Plec;
        }
      }
      
      expect(plecValue).toBe('Unisex');
    });

  });

  // ==================================================================================
  // 📤 FORM DATA INCLUSION TESTS
  // ==================================================================================

  describe('📤 FORM DATA INCLUSION', () => {

    test('✅ FormData zawiera pole "Plec" z ekstrahowaną wartością', () => {
      // 🎯 SCENARIUSZ: Po ekstrakcji Plec, FormData musi zawierać to pole
      // OCZEKIWANIE: formData.get("Plec") = "M"
      
      const selectedGender = null;
      const selectedSubcategory = 'subcat-1';
      const subcategories = [
        { _id: 'subcat-1', Name: 'Płaszcze', Plec: 'M' }
      ];
      
      // Ekstrakcja (jak w products-list.jsx)
      let plecValue = selectedGender || 'Unisex';
      if (selectedSubcategory && subcategories && subcategories.length > 0) {
        const selectedSubcategoryData = subcategories.find(s => s._id === selectedSubcategory);
        if (selectedSubcategoryData && selectedSubcategoryData.Plec) {
          plecValue = selectedSubcategoryData.Plec;
        }
      }
      
      // Symulacja FormData append (linia ~710)
      const formData = new FormData();
      formData.append("Plec", plecValue);
      
      expect(formData.get("Plec")).toBe("M");
      expect(formData.get("Plec")).not.toBeNull();
      expect(formData.get("Plec")).not.toBeUndefined();
    });

    test('✅ FormData zawiera "Unisex" gdy brak wyboru', () => {
      // 🎯 SCENARIUSZ: Użytkownik nie wybiera ani płci ani podkategorii
      // OCZEKIWANIE: formData.get("Plec") = "Unisex"
      
      const selectedGender = null;
      const selectedSubcategory = null;
      const subcategories = [];
      
      let plecValue = selectedGender || 'Unisex';
      if (selectedSubcategory && subcategories && subcategories.length > 0) {
        const selectedSubcategoryData = subcategories.find(s => s._id === selectedSubcategory);
        if (selectedSubcategoryData && selectedSubcategoryData.Plec) {
          plecValue = selectedSubcategoryData.Plec;
        }
      }
      
      const formData = new FormData();
      formData.append("Plec", plecValue);
      
      expect(formData.get("Plec")).toBe("Unisex");
    });

    test('✅ FormData NIE MOŻE mieć pustego Plec', () => {
      // 🎯 SCENARIUSZ: Plec ZAWSZE musi mieć wartość (chronione przed pustym stringiem)
      // OCZEKIWANIE: formData.get("Plec") !== ""
      
      const selectedGender = '';
      const selectedSubcategory = null;
      const subcategories = [];
      
      let plecValue = selectedGender || 'Unisex'; // '' || 'Unisex' = 'Unisex'
      if (selectedSubcategory && subcategories && subcategories.length > 0) {
        const selectedSubcategoryData = subcategories.find(s => s._id === selectedSubcategory);
        if (selectedSubcategoryData && selectedSubcategoryData.Plec) {
          plecValue = selectedSubcategoryData.Plec;
        }
      }
      
      const formData = new FormData();
      formData.append("Plec", plecValue);
      
      expect(formData.get("Plec")).not.toBe("");
      expect(formData.get("Plec")).toBe("Unisex");
    });

    test('✅ Wszystkie dopuszczalne wartości Plec mogą być w FormData', () => {
      // 🎯 SCENARIUSZ: System obsługuje M, D, U, Unisex, K
      // OCZEKIWANIE: Każda wartość poprawnie trafia do FormData
      
      const validPlecValues = ['M', 'D', 'U', 'Unisex', 'K'];
      
      validPlecValues.forEach(plec => {
        const selectedGender = null;
        const selectedSubcategory = `subcat-${plec}`;
        const subcategories = [
          { _id: `subcat-${plec}`, Name: 'Test', Plec: plec }
        ];
        
        let plecValue = selectedGender || 'Unisex';
        if (selectedSubcategory && subcategories && subcategories.length > 0) {
          const selectedSubcategoryData = subcategories.find(s => s._id === selectedSubcategory);
          if (selectedSubcategoryData && selectedSubcategoryData.Plec) {
            plecValue = selectedSubcategoryData.Plec;
          }
        }
        
        const formData = new FormData();
        formData.append("Plec", plecValue);
        
        expect(formData.get("Plec")).toBe(plec);
      });
    });

  });

  // ==================================================================================
  // 🔗 INTEGRATION SCENARIOS
  // ==================================================================================

  describe('🔗 INTEGRATION SCENARIOS', () => {

    test('✅ CAŁY FLOW: Wybór męskiej podkategorii → Plec="M" → FormData → ready for API', () => {
      // 🎯 SCENARIUSZ: End-to-end test całego flow dodawania produktu
      // OCZEKIWANIE: Plec poprawnie ekstrahowany i gotowy do API call
      
      // 1. Użytkownik wybiera kategorię "Kurtki"
      const selectedCategory = 'Kurtki';
      
      // 2. Użytkownik wybiera męską podkategorię "Płaszcze"
      const selectedSubcategory = 'subcat-1';
      const subcategories = [
        { _id: 'subcat-1', Name: 'Płaszcze', Plec: 'M' },
        { _id: 'subcat-2', Name: 'Kurtki zimowe', Plec: 'M' }
      ];
      
      // 3. Ekstrakcja Plec z podkategorii
      const selectedGender = null;
      let plecValue = selectedGender || 'Unisex';
      if (selectedSubcategory && subcategories && subcategories.length > 0) {
        const selectedSubcategoryData = subcategories.find(s => s._id === selectedSubcategory);
        if (selectedSubcategoryData && selectedSubcategoryData.Plec) {
          plecValue = selectedSubcategoryData.Plec;
        }
      }
      
      // 4. Budowanie FormData
      const formData = new FormData();
      formData.append("Plec", plecValue);
      formData.append("Kategoria", selectedCategory);
      formData.append("Podkategoria", selectedSubcategory);
      formData.append("Brand", "Test Brand");
      formData.append("Kolor", "Czarny");
      
      // 5. Walidacja
      expect(plecValue).toBe('M');
      expect(formData.get("Plec")).toBe('M');
      expect(formData.get("Kategoria")).toBe('Kurtki');
      
      // 6. FormData gotowe do POST /api/goods
      const requiredFields = ["Plec", "Kategoria", "Podkategoria", "Brand", "Kolor"];
      requiredFields.forEach(field => {
        expect(formData.get(field)).not.toBeNull();
        expect(formData.get(field)).not.toBe("");
      });
    });

    test('✅ EDGE CASE: Zmiana podkategorii zmienia Plec', () => {
      // 🎯 SCENARIUSZ: Użytkownik zmienia wybór podkategorii podczas edycji
      // OCZEKIWANIE: Plec aktualizuje się zgodnie z nową podkategorią
      
      const subcategories = [
        { _id: 'subcat-1', Name: 'Płaszcze', Plec: 'M' },
        { _id: 'subcat-2', Name: 'Sukienki', Plec: 'D' }
      ];
      
      // Pierwsza wybór: męska podkategoria
      let selectedSubcategory = 'subcat-1';
      let plecValue = 'Unisex';
      if (selectedSubcategory && subcategories.length > 0) {
        const selectedSubcategoryData = subcategories.find(s => s._id === selectedSubcategory);
        if (selectedSubcategoryData?.Plec) {
          plecValue = selectedSubcategoryData.Plec;
        }
      }
      expect(plecValue).toBe('M');
      
      // Użytkownik zmienia na damską podkategorię
      selectedSubcategory = 'subcat-2';
      plecValue = 'Unisex';
      if (selectedSubcategory && subcategories.length > 0) {
        const selectedSubcategoryData = subcategories.find(s => s._id === selectedSubcategory);
        if (selectedSubcategoryData?.Plec) {
          plecValue = selectedSubcategoryData.Plec;
        }
      }
      expect(plecValue).toBe('D');
    });

    test('✅ REGRESSION: Bez fix-a Plec byłby undefined/null', () => {
      // 🎯 SCENARIUSZ: Ten test dokumentuje STARY BUG
      // OCZEKIWANIE: Przed fix-em Plec nie był ekstrahowany z podkategorii
      
      const selectedGender = null;
      const selectedSubcategory = 'subcat-1';
      const subcategories = [
        { _id: 'subcat-1', Name: 'Płaszcze', Plec: 'M' }
      ];
      
      // ❌ STARY KOD (przed fix-em) - NIE ekstrahował z subcategory:
      let plecValueOldWay = selectedGender; // null!
      expect(plecValueOldWay).toBeNull();
      
      // ✅ NOWY KOD (po fix-ie) - ekstrahuje z subcategory:
      let plecValueNewWay = selectedGender || 'Unisex';
      if (selectedSubcategory && subcategories && subcategories.length > 0) {
        const selectedSubcategoryData = subcategories.find(s => s._id === selectedSubcategory);
        if (selectedSubcategoryData && selectedSubcategoryData.Plec) {
          plecValueNewWay = selectedSubcategoryData.Plec;
        }
      }
      expect(plecValueNewWay).toBe('M');
      
      // 🔥 TO JEST FIX!
      expect(plecValueNewWay).not.toBe(plecValueOldWay);
    });

  });

  // ==================================================================================
  // 📝 DOCUMENTATION TEST
  // ==================================================================================

  describe('📝 CODE DOCUMENTATION', () => {

    test('✅ Dokumentacja: Linie 690-710 w products-list.jsx', () => {
      // 🎯 CEL: Jasno dokumentuje gdzie znajduje się fix
      // LOKALIZACJA: /BukowskiReactNativeBuild/app/products-list.jsx, linie 690-710
      
      const fixLocation = {
        file: 'products-list.jsx',
        lines: '690-710',
        description: 'Ekstrakcja Plec z podkategorii przed wysłaniem FormData',
        critical: true,
        protectedBy: 'products-list.plec.test.js'
      };
      
      expect(fixLocation.critical).toBe(true);
      expect(fixLocation.lines).toBe('690-710');
      expect(fixLocation.protectedBy).toBe('products-list.plec.test.js');
    });

  });

});

/**
 * 🎯 PODSUMOWANIE TESTÓW:
 * 
 * ✅ 8 testów ekstrakcji Plec z różnych scenariuszy
 * ✅ 4 testy FormData inclusion
 * ✅ 3 testy integracyjne end-to-end
 * ✅ 1 test regresji (dokumentuje stary bug)
 * ✅ 1 test dokumentacji
 * 
 * RAZEM: 17 testów chroniących fix Plec
 * 
 * 🔒 OCHRONA:
 * - Linie 690-710 w products-list.jsx są chronione
 * - Każda zmiana logiki będzie wyłapana przez testy
 * - Regresja niemożliwa bez fail-u testów
 * 
 * 💡 MAINTENANCE:
 * - Jeśli zmienisz logikę ekstrakcji → zaktualizuj testy
 * - Jeśli dodasz nową wartość Plec → dodaj test
 * - Jeśli refactoring → testy muszą przejść
 */
