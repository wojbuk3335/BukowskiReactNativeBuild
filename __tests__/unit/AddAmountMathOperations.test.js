/**
 * Testy matematycznych operacji w modalu "Dopisz kwotę"
 * Testujemy obliczenia zaliczki, ceny finalnej i dopłaty
 */

describe('AddAmount Mathematical Operations', () => {
  
  /**
   * Funkcja obliczania dopłaty z modalu "Dopisz kwotę"
   * @param {number} finalPrice - Uzgodniona cena finalna produktu
   * @param {number} advance - Kwota zaliczki
   * @returns {number} - Dopłata (może być ujemna jeśli zaliczka > cena finalna)
   */
  const calculatePaymentDue = (finalPrice, advance) => {
    const final = parseFloat(finalPrice || 0);
    const adv = parseFloat(advance || 0);
    return final - adv;
  };

  /**
   * Walidacja czy cena finalna nie jest mniejsza od zaliczki
   * @param {number} finalPrice - Uzgodniona cena finalna produktu
   * @param {number} advance - Kwota zaliczki
   * @returns {boolean} - true jeśli walidacja przeszła
   */
  const validatePricing = (finalPrice, advance) => {
    const final = parseFloat(finalPrice || 0);
    const adv = parseFloat(advance || 0);
    return final >= adv;
  };

  /**
   * Formatowanie kwoty do wyświetlenia
   * @param {number} amount - Kwota do formatowania
   * @param {string} currency - Waluta (domyślnie PLN)
   * @returns {string} - Sformatowana kwota
   */
  const formatAmount = (amount, currency = 'PLN') => {
    const amt = parseFloat(amount || 0);
    return `${amt.toFixed(2)} ${currency}`;
  };

  describe('Obliczenia dopłaty', () => {
    test('powinna obliczyć poprawną dopłatę gdy cena finalna > zaliczka', () => {
      const finalPrice = 100;
      const advance = 30;
      const paymentDue = calculatePaymentDue(finalPrice, advance);
      
      expect(paymentDue).toBe(70);
    });

    test('powinna obliczyć ujemną dopłatę gdy zaliczka > cena finalna', () => {
      const finalPrice = 50;
      const advance = 80;
      const paymentDue = calculatePaymentDue(finalPrice, advance);
      
      expect(paymentDue).toBe(-30);
    });

    test('powinna obliczyć zero gdy cena finalna = zaliczka', () => {
      const finalPrice = 100;
      const advance = 100;
      const paymentDue = calculatePaymentDue(finalPrice, advance);
      
      expect(paymentDue).toBe(0);
    });

    test('powinna obsłużyć liczby dziesiętne', () => {
      const finalPrice = 99.99;
      const advance = 25.50;
      const paymentDue = calculatePaymentDue(finalPrice, advance);
      
      expect(paymentDue).toBeCloseTo(74.49, 2);
    });

    test('powinna obsłużyć stringi jako input', () => {
      const finalPrice = "150.00";
      const advance = "45.75";
      const paymentDue = calculatePaymentDue(finalPrice, advance);
      
      expect(paymentDue).toBeCloseTo(104.25, 2);
    });

    test('powinna obsłużyć puste wartości', () => {
      expect(calculatePaymentDue("", 50)).toBe(-50);
      expect(calculatePaymentDue(100, "")).toBe(100);
      expect(calculatePaymentDue("", "")).toBe(0);
      expect(calculatePaymentDue(null, undefined)).toBe(0);
    });
  });

  describe('Walidacja cen', () => {
    test('powinna zaakceptować gdy cena finalna >= zaliczka', () => {
      expect(validatePricing(100, 50)).toBe(true);
      expect(validatePricing(100, 100)).toBe(true);
      expect(validatePricing(150.50, 75.25)).toBe(true);
    });

    test('powinna odrzucić gdy cena finalna < zaliczka', () => {
      expect(validatePricing(50, 100)).toBe(false);
      expect(validatePricing(25.50, 50.00)).toBe(false);
      expect(validatePricing(0, 10)).toBe(false);
    });

    test('powinna obsłużyć stringi jako input', () => {
      expect(validatePricing("100.00", "50.00")).toBe(true);
      expect(validatePricing("50.00", "100.00")).toBe(false);
    });

    test('powinna obsłużyć edge cases', () => {
      expect(validatePricing(0, 0)).toBe(true);
      expect(validatePricing("", "")).toBe(true);
      expect(validatePricing(null, undefined)).toBe(true);
    });
  });

  describe('Formatowanie kwot', () => {
    test('powinna sformatować dodatnie kwoty', () => {
      expect(formatAmount(100.5)).toBe("100.50 PLN");
      expect(formatAmount(25)).toBe("25.00 PLN");
      expect(formatAmount(0)).toBe("0.00 PLN");
    });

    test('powinna sformatować ujemne kwoty', () => {
      expect(formatAmount(-50.25)).toBe("-50.25 PLN");
      expect(formatAmount(-100)).toBe("-100.00 PLN");
    });

    test('powinna obsłużyć różne waluty', () => {
      expect(formatAmount(100, "EUR")).toBe("100.00 EUR");
      expect(formatAmount(50.75, "USD")).toBe("50.75 USD");
    });

    test('powinna obsłużyć stringi jako input', () => {
      expect(formatAmount("123.456")).toBe("123.46 PLN");
      expect(formatAmount("0")).toBe("0.00 PLN");
    });

    test('powinna obsłużyć nieprawidłowe wartości', () => {
      expect(formatAmount("")).toBe("0.00 PLN");
      expect(formatAmount(null)).toBe("0.00 PLN");
      expect(formatAmount(undefined)).toBe("0.00 PLN");
      expect(formatAmount("abc")).toBe("NaN PLN");
    });
  });

  describe('Scenariusze rzeczywiste', () => {
    test('Scenariusz 1: Kurtka za 299 PLN, zaliczka 100 PLN', () => {
      const finalPrice = 299;
      const advance = 100;
      
      expect(validatePricing(finalPrice, advance)).toBe(true);
      expect(calculatePaymentDue(finalPrice, advance)).toBe(199);
      expect(formatAmount(advance)).toBe("100.00 PLN");
      expect(formatAmount(finalPrice)).toBe("299.00 PLN");
      expect(formatAmount(calculatePaymentDue(finalPrice, advance))).toBe("199.00 PLN");
    });

    test('Scenariusz 2: Buty za 150.99 PLN, zaliczka 75.50 PLN', () => {
      const finalPrice = 150.99;
      const advance = 75.50;
      
      expect(validatePricing(finalPrice, advance)).toBe(true);
      expect(calculatePaymentDue(finalPrice, advance)).toBeCloseTo(75.49, 2);
      expect(formatAmount(calculatePaymentDue(finalPrice, advance))).toBe("75.49 PLN");
    });

    test('Scenariusz 3: Błędne dane - zaliczka większa od ceny', () => {
      const finalPrice = 50;
      const advance = 100;
      
      expect(validatePricing(finalPrice, advance)).toBe(false);
      expect(calculatePaymentDue(finalPrice, advance)).toBe(-50);
      expect(formatAmount(calculatePaymentDue(finalPrice, advance))).toBe("-50.00 PLN");
    });

    test('Scenariusz 4: Pełna wpłata z góry', () => {
      const finalPrice = 200;
      const advance = 200;
      
      expect(validatePricing(finalPrice, advance)).toBe(true);
      expect(calculatePaymentDue(finalPrice, advance)).toBe(0);
      expect(formatAmount(calculatePaymentDue(finalPrice, advance))).toBe("0.00 PLN");
    });

    test('Scenariusz 5: Bardzo małe kwoty (grosze)', () => {
      const finalPrice = 0.99;
      const advance = 0.50;
      
      expect(validatePricing(finalPrice, advance)).toBe(true);
      expect(calculatePaymentDue(finalPrice, advance)).toBeCloseTo(0.49, 2);
      expect(formatAmount(calculatePaymentDue(finalPrice, advance))).toBe("0.49 PLN");
    });

    test('Scenariusz 6: Duże kwoty (tysiące)', () => {
      const finalPrice = 2500.00;
      const advance = 850.75;
      
      expect(validatePricing(finalPrice, advance)).toBe(true);
      expect(calculatePaymentDue(finalPrice, advance)).toBeCloseTo(1649.25, 2);
      expect(formatAmount(calculatePaymentDue(finalPrice, advance))).toBe("1649.25 PLN");
    });
  });

  describe('Integracja z React Native inputs', () => {
    test('powinna obsłużyć dane z TextInput (stringi)', () => {
      // Symulacja danych pochodzących z TextInput
      const userInputFinalPrice = "199.99";
      const userInputAdvance = "50.00";
      
      const isValid = validatePricing(userInputFinalPrice, userInputAdvance);
      const paymentDue = calculatePaymentDue(userInputFinalPrice, userInputAdvance);
      
      expect(isValid).toBe(true);
      expect(paymentDue).toBeCloseTo(149.99, 2);
    });

    test('powinna obsłużyć niepełne dane (user jeszcze pisze)', () => {
      // Przypadek gdy użytkownik jeszcze wprowadza dane
      expect(calculatePaymentDue("100", "")).toBe(100);
      expect(calculatePaymentDue("", "50")).toBe(-50);
      expect(validatePricing("100", "")).toBe(true);
      expect(validatePricing("", "50")).toBe(false);
    });

    test('powinna obsłużyć dane z przecinkami zamiast kropek', () => {
      // W niektórych systemach użytkownicy mogą używać przecinków
      const finalPriceWithComma = "199,99".replace(',', '.');
      const advanceWithComma = "50,50".replace(',', '.');
      
      const paymentDue = calculatePaymentDue(finalPriceWithComma, advanceWithComma);
      expect(paymentDue).toBeCloseTo(149.49, 2);
    });
  });

  describe('Performance tests', () => {
    test('powinna być szybka dla wielu obliczeń', () => {
      const start = performance.now();
      
      for (let i = 0; i < 1000; i++) {
        calculatePaymentDue(Math.random() * 1000, Math.random() * 500);
        validatePricing(Math.random() * 1000, Math.random() * 500);
        formatAmount(Math.random() * 1000);
      }
      
      const end = performance.now();
      expect(end - start).toBeLessThan(100); // Powinno zająć mniej niż 100ms
    });
  });
});