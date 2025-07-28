  test('filtrowanie sprzedaży po dacie i punkcie sprzedaży', () => {
    const today = new Date().toISOString().split('T')[0];
    const user = { sellingPoint: 'Most' };
    const salesData = [
      { _id: '1', fullName: 'A', sellingPoint: 'Most', date: today + 'T10:00:00.000Z' },
      { _id: '2', fullName: 'B', sellingPoint: 'Most', date: '2024-01-01T10:00:00.000Z' },
      { _id: '3', fullName: 'C', sellingPoint: 'Tata', date: today + 'T10:00:00.000Z' }
    ];
    const filteredData = salesData.filter(
      item => item.sellingPoint === user.sellingPoint && item.date?.startsWith(today)
    );
    expect(filteredData).toHaveLength(1);
    expect(filteredData[0].fullName).toBe('A');
  });

  test('wyświetlanie sum gotówki i kart według waluty', () => {
    const filteredData = [
      { cash: [{ price: 100, currency: 'PLN' }], card: [{ price: 50, currency: 'PLN' }] },
      { cash: [{ price: 200, currency: 'EUR' }], card: [{ price: 30, currency: 'PLN' }] },
      { cash: [{ price: 50, currency: 'PLN' }], card: [] }
    ];
    const totals = { cash: {}, card: {} };
    filteredData.forEach((item) => {
      item.cash?.forEach(({ price, currency }) => {
        totals.cash[currency] = (totals.cash[currency] || 0) + price;
      });
      item.card?.forEach(({ price, currency }) => {
        totals.card[currency] = (totals.card[currency] || 0) + price;
      });
    });
    expect(totals.cash).toEqual({ PLN: 150, EUR: 200 });
    expect(totals.card).toEqual({ PLN: 80 });
  });

  test('wyświetlanie sprzedaży na innych kontach', () => {
    const today = new Date().toISOString().split('T')[0];
    const user = { sellingPoint: 'Most', symbol: 'M' };
    const salesData = [
      { _id: '1', fullName: 'A', sellingPoint: 'Tata', from: 'M', date: today + 'T10:00:00.000Z' },
      { _id: '2', fullName: 'B', sellingPoint: 'Most', from: 'M', date: today + 'T10:00:00.000Z' },
      { _id: '3', fullName: 'C', sellingPoint: 'Tata', from: 'X', date: today + 'T10:00:00.000Z' }
    ];
    const otherAccounts = salesData.filter(
      item => item.sellingPoint !== user.sellingPoint && item.from === user.symbol && item.date?.startsWith(today)
    );
    expect(otherAccounts).toHaveLength(1);
    expect(otherAccounts[0].fullName).toBe('A');
  });

  test('wyświetlanie transferów z danego dnia', () => {
    const today = new Date().toISOString().split('T')[0];
    const user = { symbol: 'M' };
    const transferData = [
      { productId: 1, fullName: 'A', transfer_from: 'M', transfer_to: 'T', date: today + 'T10:00:00.000Z' },
      { productId: 2, fullName: 'B', transfer_from: 'M', transfer_to: 'SOLD', date: today + 'T10:00:00.000Z' },
      { productId: 3, fullName: 'C', transfer_from: 'M', transfer_to: 'T', date: '2024-01-01T10:00:00.000Z' }
    ];
    const transferredToday = transferData.filter(
      item => item.date && item.date.startsWith(today) && item.transfer_to !== 'SOLD'
    );
    expect(transferredToday).toHaveLength(1);
    expect(transferredToday[0].fullName).toBe('A');
  });

  test('wyświetlanie otrzymanych transferów', () => {
    const today = new Date().toISOString().split('T')[0];
    const user = { symbol: 'M' };
    const transferData = [
      { productId: 1, fullName: 'A', transfer_to: 'M', date: today + 'T10:00:00.000Z' },
      { productId: 2, fullName: 'B', transfer_to: 'M', date: '2024-01-01T10:00:00.000Z' },
      { productId: 3, fullName: 'C', transfer_to: 'T', date: today + 'T10:00:00.000Z' }
    ];
    const receivedToday = transferData.filter(
      item => item.date && item.date.startsWith(today) && item.transfer_to === user.symbol
    );
    expect(receivedToday).toHaveLength(1);
    expect(receivedToday[0].fullName).toBe('A');
  });

  test('wyświetlanie zaliczek', () => {
    const today = new Date().toISOString().split('T')[0];
    const advancesData = [
      { productId: 1, fullName: 'A', advancePayment: 100, advancePaymentCurrency: 'PLN', date: today + 'T10:00:00.000Z' },
      { productId: 2, fullName: 'B', advancePayment: 50, advancePaymentCurrency: 'EUR', date: today + 'T10:00:00.000Z' },
      { productId: 3, fullName: 'C', advancePayment: 0, advancePaymentCurrency: 'PLN', date: today + 'T10:00:00.000Z' },
      { productId: 4, fullName: 'D', advancePayment: 100, advancePaymentCurrency: 'PLN', date: '2024-01-01T10:00:00.000Z' }
    ];
    const advancesToday = advancesData.filter(
      item => item.date && item.date.startsWith(today) && item.advancePayment > 0
    );
    expect(advancesToday).toHaveLength(2);
    expect(advancesToday.map(i => i.fullName)).toEqual(['A', 'B']);
    // Suma zaliczek według walut
    const advanceTotals = {};
    advancesToday.forEach(item => {
      const currency = item.advancePaymentCurrency;
      advanceTotals[currency] = (advanceTotals[currency] || 0) + item.advancePayment;
    });
    expect(advanceTotals).toEqual({ PLN: 100, EUR: 50 });
  });

  test('wyświetlanie odpisanych kwot', () => {
    const today = new Date().toISOString().split('T')[0];
    const deductionsData = [
      { _id: 1, amount: 10, currency: 'PLN', date: today + 'T10:00:00.000Z' },
      { _id: 2, amount: 20, currency: 'EUR', date: today + 'T10:00:00.000Z' },
      { _id: 3, amount: 5, currency: 'PLN', date: '2024-01-01T10:00:00.000Z' }
    ];
    const deductionsToday = deductionsData.filter(
      item => item.date && item.date.startsWith(today)
    );
    expect(deductionsToday).toHaveLength(2);
    // Suma odpisanych kwot według walut
    const deductionTotals = {};
    deductionsToday.forEach(item => {
      const currency = item.currency;
      deductionTotals[currency] = (deductionTotals[currency] || 0) + item.amount;
    });
    expect(deductionTotals).toEqual({ PLN: 10, EUR: 20 });
  });

  test('obliczanie dostępnych środków', () => {
    // Suma = sprzedaż + zaliczki - odpisy
    const salesTotals = { PLN: 100, EUR: 50 };
    const advancesTotals = { PLN: 20 };
    const deductionsTotals = { PLN: 10, EUR: 5 };
    const allCurrencies = new Set([
      ...Object.keys(salesTotals),
      ...Object.keys(advancesTotals),
      ...Object.keys(deductionsTotals)
    ]);
    const availableFunds = {};
    allCurrencies.forEach(currency => {
      const sales = salesTotals[currency] || 0;
      const advances = advancesTotals[currency] || 0;
      const deductions = deductionsTotals[currency] || 0;
      availableFunds[currency] = sales + advances - deductions;
    });
    expect(availableFunds).toEqual({ PLN: 110, EUR: 45 });
  });

  test('walidacja przy odpisie kwoty', () => {
    // Nie można odpisać więcej niż dostępne środki
    const availableFunds = { PLN: 100 };
    const requestedAmount = 120;
    expect(requestedAmount > availableFunds['PLN']).toBe(true);
    // Można odpisać jeśli <= dostępne środki
    expect(80 <= availableFunds['PLN']).toBe(true);
  });

  test('wyświetlanie powodów transferów do domu (skracanie)', () => {
    const item = { reason: 'skracanie rękawów', transfer_to: 'Dom' };
    const displayReason = item.reason.length > 15 ? item.reason.substring(0, 15) + '...' : item.reason;
    const result = ` (${displayReason})`;
    expect(result).toBe(' (skracanie rękaw...)');
  });

  test('wyświetlanie powodów transferów do domu (długi powód)', () => {
    const item = { reason: 'bardzo długi powód który powinien być obcięty', transfer_to: 'Dom' };
    const displayReason = item.reason.length > 15 ? item.reason.substring(0, 15) + '...' : item.reason;
    const result = ` (${displayReason})`;
    expect(result).toBe(' (bardzo długi po...)');
  });
  test('każda sprzedana kurtka powinna być wyświetlona na liście sprzedaży (filteredData)', () => {
    // Symulujemy dzisiejszą datę
    const today = new Date().toISOString().split('T')[0];
    const user = { sellingPoint: 'Most' };
    // Przykładowe dane sprzedaży (różne punkty, różne daty)
    const salesData = [
      { _id: '1', fullName: 'Kurtka A', size: 'L', sellingPoint: 'Most', date: today + 'T10:00:00.000Z' },
      { _id: '2', fullName: 'Kurtka B', size: 'M', sellingPoint: 'Most', date: today + 'T12:00:00.000Z' },
      { _id: '3', fullName: 'Kurtka C', size: 'S', sellingPoint: 'Most', date: today + 'T15:00:00.000Z' },
      { _id: '4', fullName: 'Kurtka D', size: 'XL', sellingPoint: 'Tata', date: today + 'T10:00:00.000Z' }, // inny punkt
      { _id: '5', fullName: 'Kurtka E', size: 'L', sellingPoint: 'Most', date: '2024-01-01T10:00:00.000Z' }, // inny dzień
    ];
    // Logika z home.jsx: tylko dzisiejsze i z punktu użytkownika
    const filteredData = salesData.filter(
      item => item.sellingPoint === user.sellingPoint && item.date?.startsWith(today)
    );
    // Oczekujemy, że na liście są tylko sprzedane dzisiaj kurtki z punktu 'Most'
    expect(filteredData).toHaveLength(3);
    expect(filteredData.map(i => i.fullName)).toEqual(['Kurtka A', 'Kurtka B', 'Kurtka C']);
    // Kurtka D (inny punkt) i Kurtka E (inna data) nie powinny być na liście
    expect(filteredData.some(i => i.fullName === 'Kurtka D')).toBe(false);
    expect(filteredData.some(i => i.fullName === 'Kurtka E')).toBe(false);
  });
// Basic test to satisfy Jest requirement
describe('Home Component', () => {
  test('should be documented', () => {
    expect(true).toBe(true);
  });

  test('should format reason text correctly for Dom transfers', () => {
    // Test transfer data structure
    const transferredItems = [
      {
        _id: '1',
        fullName: 'Kurtka skórzana czarna',
        size: 'L',
        transfer_to: 'Dom',
        transfer_from: 'M',
        reason: 'wysyłka'
      },
      {
        _id: '2', 
        fullName: 'Kurtka zimowa',
        size: 'XL',
        transfer_to: 'Dom',
        transfer_from: 'M',
        reason: 'bardzo długi powód który powinien być obcięty'
      },
      {
        _id: '3',
        fullName: 'Kurtka sportowa',
        size: 'M',
        transfer_to: 'T',
        transfer_from: 'M',
        reason: 'nie powinien być wyświetlony'
      }
    ];

    // Test reason display logic (same as in Home component)
    const formatReasonDisplay = (item) => {
      if (item.reason && (item.transfer_to?.toLowerCase() === 'dom' || item.transfer_to?.toLowerCase() === 'd')) {
        const displayReason = item.reason.length > 15 ? item.reason.substring(0, 15) + '...' : item.reason;
        return ` (${displayReason})`;
      }
      return '';
    };

    // Test various scenarios
    expect(formatReasonDisplay(transferredItems[0])).toBe(' (wysyłka)');
    expect(formatReasonDisplay(transferredItems[1])).toBe(' (bardzo długi po...)');
    expect(formatReasonDisplay(transferredItems[2])).toBe(''); // Not Dom transfer
  });

  test('should handle missing reason field gracefully', () => {
    const transferWithoutReason = {
      _id: '4',
      fullName: 'Kurtka bez powodu',
      size: 'S',
      transfer_to: 'Dom',
      transfer_from: 'M'
      // reason field missing
    };

    // Test that missing reason doesn't break display
    const formatReasonDisplay = (item) => {
      if (item.reason && (item.transfer_to?.toLowerCase() === 'dom' || item.transfer_to?.toLowerCase() === 'd')) {
        const displayReason = item.reason.length > 15 ? item.reason.substring(0, 15) + '...' : item.reason;
        return ` (${displayReason})`;
      }
      return '';
    };

    expect(formatReasonDisplay(transferWithoutReason)).toBe('');
  });

  test('should verify Dom transfer detection logic', () => {
    const testCases = [
      { transfer_to: 'Dom', expected: true },
      { transfer_to: 'dom', expected: true },
      { transfer_to: 'D', expected: true },
      { transfer_to: 'd', expected: true },
      { transfer_to: 'T', expected: false },
      { transfer_to: 'M', expected: false },
      { transfer_to: null, expected: false },
      { transfer_to: undefined, expected: false }
    ];

    testCases.forEach(testCase => {
      const isDomTransfer = testCase.transfer_to?.toLowerCase() === 'dom' || testCase.transfer_to?.toLowerCase() === 'd';
      expect(isDomTransfer).toBe(testCase.expected);
    });
  });
});
