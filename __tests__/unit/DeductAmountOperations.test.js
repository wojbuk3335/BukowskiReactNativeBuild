/**
 * Dedykowane testy dla funkcji "Dopisz kwotę" (Deduct Amount)
 * Testuje matematykę, walidację i logikę operacji odpisywania kwot
 */

describe('Deduct Amount Operations - Dedicated Tests', () => {
  
  /**
   * Funkcja obliczania kwoty do odpisania
   * @param {number} currentAmount - Aktualna kwota dostępna
   * @param {number} deductAmount - Kwota do odpisania
   * @returns {number} - Nowa kwota po odpisaniu
   */
  const calculateDeductedAmount = (currentAmount, deductAmount) => {
    const current = parseFloat(currentAmount || 0);
    const deduct = parseFloat(deductAmount || 0);
    return current - deduct;
  };

  /**
   * Walidacja czy można odpisać kwotę (czy jest wystarczająco środków)
   * @param {number} currentAmount - Aktualna kwota dostępna
   * @param {number} deductAmount - Kwota do odpisania
   * @returns {boolean} - true jeśli można odpisać
   */
  const validateDeductAmount = (currentAmount, deductAmount) => {
    const current = parseFloat(currentAmount || 0);
    const deduct = parseFloat(deductAmount || 0);
    return current >= deduct && deduct > 0;
  };

  /**
   * Formatowanie powodu odpisania kwoty
   * @param {string} reason - Podstawowy powód
   * @param {string} employeeName - Nazwa pracownika (opcjonalne)
   * @returns {string} - Sformatowany powód
   */
  const formatDeductReason = (reason, employeeName = null) => {
    if (employeeName) {
      return `${reason} - ${employeeName}`;
    }
    return reason;
  };

  /**
   * Obliczanie salda po serii operacji odpisywania
   * @param {number} initialAmount - Kwota początkowa
   * @param {Array} deductions - Tablica kwot do odpisania
   * @returns {number} - Finalne saldo
   */
  const calculateFinalBalance = (initialAmount, deductions) => {
    const initial = parseFloat(initialAmount || 0);
    const totalDeductions = deductions.reduce((sum, deduction) => {
      return sum + parseFloat(deduction || 0);
    }, 0);
    return initial - totalDeductions;
  };

  describe('Matematyka odpisywania kwot', () => {
    
    test('powinno poprawnie odpisać kwotę od salda', () => {
      const currentAmount = 1000;
      const deductAmount = 250;
      const result = calculateDeductedAmount(currentAmount, deductAmount);
      expect(result).toBe(750);
    });

    test('powinno obsłużyć odpisanie całej dostępnej kwoty', () => {
      const currentAmount = 500;
      const deductAmount = 500;
      const result = calculateDeductedAmount(currentAmount, deductAmount);
      expect(result).toBe(0);
    });

    test('powinno obsłużyć kwoty dziesiętne', () => {
      const currentAmount = 123.45;
      const deductAmount = 23.45;
      const result = calculateDeductedAmount(currentAmount, deductAmount);
      expect(result).toBeCloseTo(100, 2);
    });

    test('powinno obsłużyć stringi jako input', () => {
      const currentAmount = "1000.50";
      const deductAmount = "200.25";
      const result = calculateDeductedAmount(currentAmount, deductAmount);
      expect(result).toBeCloseTo(800.25, 2);
    });

    test('powinno obsłużyć zerowe wartości', () => {
      const currentAmount = 100;
      const deductAmount = 0;
      const result = calculateDeductedAmount(currentAmount, deductAmount);
      expect(result).toBe(100);
    });

    test('powinno obsłużyć null i undefined', () => {
      expect(calculateDeductedAmount(null, 50)).toBe(-50);
      expect(calculateDeductedAmount(100, null)).toBe(100);
      expect(calculateDeductedAmount(undefined, undefined)).toBe(0);
    });
  });

  describe('Walidacja operacji odpisywania', () => {
    
    test('powinna zaakceptować prawidłowe odpisanie', () => {
      const currentAmount = 1000;
      const deductAmount = 250;
      const isValid = validateDeductAmount(currentAmount, deductAmount);
      expect(isValid).toBe(true);
    });

    test('powinna odrzucić odpisanie większej kwoty niż dostępna', () => {
      const currentAmount = 100;
      const deductAmount = 150;
      const isValid = validateDeductAmount(currentAmount, deductAmount);
      expect(isValid).toBe(false);
    });

    test('powinna odrzucić zerową kwotę do odpisania', () => {
      const currentAmount = 1000;
      const deductAmount = 0;
      const isValid = validateDeductAmount(currentAmount, deductAmount);
      expect(isValid).toBe(false);
    });

    test('powinna odrzucić ujemną kwotę do odpisania', () => {
      const currentAmount = 1000;
      const deductAmount = -50;
      const isValid = validateDeductAmount(currentAmount, deductAmount);
      expect(isValid).toBe(false);
    });

    test('powinna obsłużyć kwoty dziesiętne w walidacji', () => {
      const currentAmount = 100.50;
      const deductAmount = 100.25;
      const isValid = validateDeductAmount(currentAmount, deductAmount);
      expect(isValid).toBe(true);
    });

    test('powinna odrzucić odpisanie z pustej kasy', () => {
      const currentAmount = 0;
      const deductAmount = 50;
      const isValid = validateDeductAmount(currentAmount, deductAmount);
      expect(isValid).toBe(false);
    });
  });

  describe('Formatowanie powodów odpisania', () => {
    
    test('powinno sformatować podstawowy powód', () => {
      const reason = "Wypłata gotówki";
      const formatted = formatDeductReason(reason);
      expect(formatted).toBe("Wypłata gotówki");
    });

    test('powinno dodać nazwę pracownika do powodu', () => {
      const reason = "Zaliczka";
      const employeeName = "Jan Kowalski";
      const formatted = formatDeductReason(reason, employeeName);
      expect(formatted).toBe("Zaliczka - Jan Kowalski");
    });

    test('powinno obsłużyć pusty powód z pracownikiem', () => {
      const reason = "";
      const employeeName = "Anna Nowak";
      const formatted = formatDeductReason(reason, employeeName);
      expect(formatted).toBe(" - Anna Nowak");
    });

    test('powinno obsłużyć null jako nazwę pracownika', () => {
      const reason = "Wypłata";
      const employeeName = null;
      const formatted = formatDeductReason(reason, employeeName);
      expect(formatted).toBe("Wypłata");
    });

    test('powinno obsłużyć undefined jako nazwę pracownika', () => {
      const reason = "Wypłata";
      const employeeName = undefined;
      const formatted = formatDeductReason(reason, employeeName);
      expect(formatted).toBe("Wypłata");
    });
  });

  describe('Operacje wielokrotnego odpisywania', () => {
    
    test('powinno obliczyć finalne saldo po serii odpisań', () => {
      const initialAmount = 1000;
      const deductions = [100, 200, 50];
      const finalBalance = calculateFinalBalance(initialAmount, deductions);
      expect(finalBalance).toBe(650);
    });

    test('powinno obsłużyć pustą tablicę odpisań', () => {
      const initialAmount = 1000;
      const deductions = [];
      const finalBalance = calculateFinalBalance(initialAmount, deductions);
      expect(finalBalance).toBe(1000);
    });

    test('powinno obsłużyć kwoty dziesiętne w serii', () => {
      const initialAmount = 500.75;
      const deductions = [100.25, 200.50];
      const finalBalance = calculateFinalBalance(initialAmount, deductions);
      expect(finalBalance).toBeCloseTo(200, 2);
    });

    test('powinno obsłużyć stringi w tablicy odpisań', () => {
      const initialAmount = 1000;
      const deductions = ["100", "200.50", "150"];
      const finalBalance = calculateFinalBalance(initialAmount, deductions);
      expect(finalBalance).toBeCloseTo(549.5, 1);
    });

    test('powinno obsłużyć null i undefined w odpisaniach', () => {
      const initialAmount = 1000;
      const deductions = [100, null, 200, undefined, 150];
      const finalBalance = calculateFinalBalance(initialAmount, deductions);
      expect(finalBalance).toBe(550);
    });
  });

  describe('Scenariusze brzegowe', () => {
    
    test('powinno obsłużyć bardzo małe kwoty', () => {
      const currentAmount = 0.01;
      const deductAmount = 0.01;
      const result = calculateDeductedAmount(currentAmount, deductAmount);
      expect(result).toBeCloseTo(0, 2);
    });

    test('powinno obsłużyć bardzo duże kwoty', () => {
      const currentAmount = 999999.99;
      const deductAmount = 888888.88;
      const result = calculateDeductedAmount(currentAmount, deductAmount);
      expect(result).toBeCloseTo(111111.11, 2);
    });

    test('powinno obsłużyć precyzję zmiennoprzecinkową', () => {
      const currentAmount = 0.3;
      const deductAmount = 0.1;
      const result = calculateDeductedAmount(currentAmount, deductAmount);
      expect(result).toBeCloseTo(0.2, 10);
    });

    test('powinno walidować graniczne przypadki', () => {
      // Dokładnie równe kwoty
      expect(validateDeductAmount(100, 100)).toBe(true);
      
      // O 1 grosz za dużo
      expect(validateDeductAmount(100, 100.01)).toBe(false);
      
      // Minimalna prawidłowa kwota
      expect(validateDeductAmount(0.01, 0.01)).toBe(true);
    });
  });

  describe('Formatowanie i wyświetlanie', () => {
    
    test('powinno poprawnie formatować kwoty w powodach', () => {
      const reason = "Wypłata";
      const employeeName = "Pracownik (ID: EMP001)";
      const formatted = formatDeductReason(reason, employeeName);
      expect(formatted).toBe("Wypłata - Pracownik (ID: EMP001)");
    });

    test('powinno obsłużyć specjalne znaki w nazwach', () => {
      const reason = "Zaliczka & Wypłata";
      const employeeName = "Józef Żółć";
      const formatted = formatDeductReason(reason, employeeName);
      expect(formatted).toBe("Zaliczka & Wypłata - Józef Żółć");
    });

    test('powinno obsłużyć długie nazwy', () => {
      const reason = "Wypłata zaliczki za przepracowane godziny";
      const employeeName = "Jan Bardzo-Długie-Nazwisko Kowalski";
      const formatted = formatDeductReason(reason, employeeName);
      expect(formatted).toBe("Wypłata zaliczki za przepracowane godziny - Jan Bardzo-Długie-Nazwisko Kowalski");
    });
  });

  describe('Integracja z różnymi walutami', () => {
    
    test('powinno obsłużyć odpisywanie w PLN', () => {
      const currentAmount = 1000; // PLN
      const deductAmount = 250;   // PLN
      const result = calculateDeductedAmount(currentAmount, deductAmount);
      expect(result).toBe(750);
    });

    test('powinno obsłużyć odpisywanie w EUR', () => {
      const currentAmount = 100.50; // EUR
      const deductAmount = 25.25;   // EUR
      const result = calculateDeductedAmount(currentAmount, deductAmount);
      expect(result).toBeCloseTo(75.25, 2);
    });

    test('powinno obsłużyć odpisywanie w USD', () => {
      const currentAmount = 500.75; // USD
      const deductAmount = 125.25;  // USD
      const result = calculateDeductedAmount(currentAmount, deductAmount);
      expect(result).toBeCloseTo(375.5, 2);
    });
  });

  describe('Przypadki błędów i wyjątków', () => {
    
    test('powinno obsłużyć nieprawidłowy format kwoty', () => {
      const currentAmount = "abc";
      const deductAmount = 100;
      const result = calculateDeductedAmount(currentAmount, deductAmount);
      expect(result).toBeNaN(); // parseFloat("abc") = NaN, więc NaN - 100 = NaN
    });

    test('powinno odrzucić nieprawidłowy format w walidacji', () => {
      const currentAmount = "invalid";
      const deductAmount = "also invalid";
      const isValid = validateDeductAmount(currentAmount, deductAmount);
      expect(isValid).toBe(false); // NaN > 0 is false
    });

    test('powinno obsłużyć bardzo długie stringi liczbowe', () => {
      const currentAmount = "1000.123456789012345";
      const deductAmount = "500.987654321098765";
      const result = calculateDeductedAmount(currentAmount, deductAmount);
      expect(result).toBeCloseTo(499.135802467913, 10);
    });
  });
});