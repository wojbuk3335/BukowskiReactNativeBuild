// Test Currency Service - CommonJS version
// Dodaj fetch dla Node.js jeśli nie jest dostępny
if (typeof fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

const CurrencyService = require('./services/currencyService.js');

// Test funkcji
async function testCurrencyService() {
  console.log('=== Test Currency Service ===\n');
  
  try {
    // Test połączenia
    console.log('1. Test połączenia z NBP API...');
    const connectionOK = await CurrencyService.testConnection();
    console.log(`Połączenie: ${connectionOK ? 'OK' : 'BŁĄD'}\n`);
    
    // Test pobierania kursu EUR
    console.log('2. Pobieranie kursu EUR...');
    const eurRate = await CurrencyService.fetchExchangeRate('EUR');
    console.log(`Kurs EUR (kantorowy): ${eurRate} PLN\n`);
    
    // Test pobierania wszystkich kursów
    console.log('3. Pobieranie wszystkich kursów...');
    const allRates = await CurrencyService.getAllExchangeRates();
    console.log('Kursy kantorowe:');
    Object.entries(allRates).forEach(([currency, rate]) => {
      console.log(`  ${currency}: ${rate} PLN`);
    });
    console.log('');
    
    // Test konwersji 50 EUR -> PLN
    console.log('4. Test konwersji 50 EUR -> PLN...');
    const convertedAmount = await CurrencyService.convertCurrency(50, 'EUR', 'PLN');
    console.log(`50 EUR = ${convertedAmount} PLN\n`);
    
    // Test obliczania procentu zaliczki
    console.log('5. Test obliczania procentu zaliczki...');
    console.log('Scenariusz: 50 EUR zaliczki na produkt za 1000 PLN');
    const calculation = await CurrencyService.calculateAdvancePercentage(50, 'EUR', 1000);
    
    console.log('Wynik obliczeń:');
    console.log(`  Zaliczka: ${CurrencyService.formatAmount(calculation.advanceAmount, calculation.advanceCurrency)}`);
    console.log(`  Zaliczka w PLN: ${CurrencyService.formatAmount(calculation.advanceInPLN, 'PLN')}`);
    console.log(`  Cena produktu: ${CurrencyService.formatAmount(calculation.productPrice, 'PLN')}`);
    console.log(`  Procent zaliczki: ${calculation.percentage}%`);
    console.log(`  Kurs kantorowy EUR: ${calculation.exchangeRate} PLN`);
    console.log(`  Data konwersji: ${new Date(calculation.conversionDate).toLocaleString('pl-PL')}`);
    
  } catch (error) {
    console.error('Błąd podczas testu:', error);
  }
}

// Uruchom test
if (require.main === module) {
  testCurrencyService();
}

module.exports = testCurrencyService;