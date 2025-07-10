// Test script for barcode matching logic
const testBarcode = "0020601300002";

// Test the regex pattern
const regex = /^(\d{3})(\d{2})(\d{3})0000(\d)$/;
const match = testBarcode.match(regex);

console.log('Test kodu:', testBarcode);
console.log('Regex wzorzec:', regex);
console.log('Dopasowanie:', match);

if (match) {
  const [, stockCode, colorCode, sizeCode, lastDigit] = match;
  console.log('Części kodu:');
  console.log('  Stock kod:', stockCode);
  console.log('  Color kod:', colorCode);
  console.log('  Size kod:', sizeCode);
  console.log('  Ostatnia cyfra:', lastDigit);
} else {
  console.log('Kod nie pasuje do wzorca!');
}

// Test some sample codes from the data
const sampleCodes = [
  "0010711100005",
  "0010702300001", 
  "0321702300008",
  "0020601300002" // The test code
];

console.log('\nTestowanie kodów z danych:');
sampleCodes.forEach(code => {
  const match = code.match(regex);
  console.log(`${code}: ${match ? 'PASUJE' : 'NIE PASUJE'}`);
  if (match) {
    const [, stock, color, size] = match;
    console.log(`  -> Stock: ${stock}, Color: ${color}, Size: ${size}`);
  }
});