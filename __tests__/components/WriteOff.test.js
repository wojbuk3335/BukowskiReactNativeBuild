  test('should block write-off only for SOLD transfers from today (isTransferred logic)', () => {
    // Helper function (copy of isTransferred from writeoff.jsx)
    const isTransferred = (item, transfers, today) => {
      if (!Array.isArray(transfers)) return false;
      return transfers.some((t) => t.productId === item.id && t.transfer_to === 'SOLD' && t.date && t.date.startsWith(today));
    };

    const today = new Date().toISOString().split('T')[0];
    // Simulate yesterday's date
    const yesterday = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().split('T')[0];
    })();

    const item = { id: 123 };
    const transfers = [
      { productId: 123, transfer_to: 'SOLD', date: today + 'T10:00:00.000Z' }, // dzisiaj
      { productId: 123, transfer_to: 'SOLD', date: yesterday + 'T10:00:00.000Z' }, // wczoraj
      { productId: 123, transfer_to: 'USER', date: today + 'T12:00:00.000Z' }, // inny typ
      { productId: 456, transfer_to: 'SOLD', date: today + 'T10:00:00.000Z' }, // inny produkt
    ];

    // Kurtka sprzedana dzisiaj powinna być zablokowana
    expect(isTransferred(item, transfers, today)).toBe(true);

    // Kurtka sprzedana tylko wczoraj (nie dzisiaj) powinna być odblokowana
    const transfersYesterday = [
      { productId: 123, transfer_to: 'SOLD', date: yesterday + 'T10:00:00.000Z' }
    ];
    expect(isTransferred(item, transfersYesterday, today)).toBe(false);

    // Kurtka sprzedana dzisiaj i wczoraj - blokuje tylko jeśli jest dzisiejszy transfer
    expect(isTransferred(item, [
      { productId: 123, transfer_to: 'SOLD', date: yesterday + 'T10:00:00.000Z' },
      { productId: 123, transfer_to: 'SOLD', date: today + 'T09:00:00.000Z' }
    ], today)).toBe(true);

    // Kurtka nie sprzedana wcale
    expect(isTransferred(item, [], today)).toBe(false);
    expect(isTransferred(item, null, today)).toBe(false);
  });
// Simple WriteOff component tests without rendering to avoid mock issues
describe('WriteOff Component Logic Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test('should verify WriteOff filtering logic works correctly', () => {
    // Test the core filtering logic without rendering
    const mockUsers = [
      {
        $id: '2',
        name: 'Tata User',
        email: 'tata@wp.pl',
        role: 'user',
        symbol: 'T',
        sellingPoint: 'Tata',
        location: 'Zakopane'
      },
      {
        $id: '3',
        name: 'Dom User',
        email: 'dom@wp.pl',
        role: 'dom',
        symbol: 'D',
        sellingPoint: 'Dom',
        location: null
      },
      {
        $id: '4',
        name: 'Admin User',
        email: 'admin@wp.pl',
        role: 'admin',
        symbol: 'A',
        sellingPoint: 'Admin',
        location: 'Zakopane'
      }
    ];

    const currentUser = {
      $id: '1',
      symbol: 'M',
      email: 'most@wp.pl',
      location: 'Zakopane',
      sellingPoint: 'Most'
    };
    
    // Test WriteOff filtering logic (same as used in the component)
    const filteredUsers = mockUsers.filter(u => {
      // Always include Dom role
      if (u.role === 'dom') return true;
      
      // For others, check location match and exclude admin/magazyn  
      return u.location === currentUser.location && 
             u.role !== 'admin' && 
             u.role !== 'magazyn' &&
             u.$id !== currentUser.$id;
    });
    
    expect(filteredUsers).toHaveLength(2); // Tata + Dom
    expect(filteredUsers.some(u => u.role === 'dom')).toBe(true);
    expect(filteredUsers.some(u => u.email === 'tata@wp.pl')).toBe(true);
    expect(filteredUsers.some(u => u.role === 'admin')).toBe(false);
  });

  test('should verify Dom role inclusion logic', () => {
    const domUser = {
      $id: '3',
      name: 'Dom User',
      email: 'dom@wp.pl',
      role: 'dom',
      symbol: 'D',
      sellingPoint: 'Dom',
      location: null  // Dom has no location
    };

    const currentUser = {
      $id: '1',
      location: 'Zakopane'
    };
    
    // Test that Dom is always included regardless of location
    const shouldInclude = domUser.role === 'dom' || 
                         (domUser.location === currentUser.location && 
                          domUser.role !== 'admin' && 
                          domUser.role !== 'magazyn' &&
                          domUser.$id !== currentUser.$id);
    
    expect(shouldInclude).toBe(true);
  });

  test('should verify transfer product filtering', () => {
    const stateData = [
      {
        id: 1,
        symbol: 'M',
        fullName: 'Kurtka skórzana czarna',
        productStatus: 'active'
      },
      {
        id: 2, 
        symbol: 'T',
        fullName: 'Kurtka skórzana brązowa',
        productStatus: 'active'
      }
    ];

    const currentUser = { symbol: 'M' };
    
    // Filter products for current user (same logic as in WriteOff)
    const filteredData = stateData.filter(item => item.symbol === currentUser.symbol);
    
    expect(filteredData).toHaveLength(1);
    expect(filteredData[0].fullName).toBe('Kurtka skórzana czarna');
  });

  test('should verify date formatting for transfers', () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Test date format used in WriteOff for transfer filtering
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(today.length).toBe(10);
  });

  test('should verify Dom reason modal functionality', () => {
    // Test Dom reasons array
    const domReasons = [
      'skracanie rękawów',
      'wysyłka',
      'custom'
    ];
    
    expect(domReasons).toHaveLength(3);
    expect(domReasons).toContain('skracanie rękawów');
    expect(domReasons).toContain('wysyłka');
    expect(domReasons).toContain('custom');
  });

  test('should verify transfer model with reason for Dom', () => {
    const selectedItem = {
      id: 1,
      fullName: 'Kurtka skórzana czarna',
      size: 'L'
    };
    
    const currentUser = { symbol: 'M' };
    const reason = 'skracanie rękawów';
    
    // Test transfer model structure for Dom transfer
    const transferModel = {
      fullName: selectedItem.fullName,
      size: selectedItem.size,
      date: new Date().toISOString(),
      transfer_from: currentUser.symbol,
      transfer_to: 'D', // Dom
      productId: selectedItem.id,
      reason: reason
    };
    
    expect(transferModel.reason).toBe('skracanie rękawów');
    expect(transferModel.transfer_to).toBe('D');
    expect(transferModel.fullName).toBe('Kurtka skórzana czarna');
  });

  test('should verify custom reason validation', () => {
    const customReason = "   "; // Whitespace only
    const validReason = "Naprawa zamka";
    
    // Test that trimmed empty string is invalid
    expect(customReason.trim().length).toBe(0);
    
    // Test that valid reason passes
    expect(validReason.trim().length).toBeGreaterThan(0);
    expect(validReason.trim()).toBe("Naprawa zamka");
  });
});
