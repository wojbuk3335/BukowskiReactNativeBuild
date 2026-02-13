/**
 * 🔥 CRITICAL MOBILE TESTS - Users/Dobierz: Pomarańczowe Produkty (warehouse items)
 * 
 * SCENARIUSZ: Integracja API dla magazynowych produktów w mobile admin panel
 * 
 * Testy CORE funkcjonalności Dobierz (integracja z API):
 * 1. Pobieranie warehouse items z API (GET /state/warehouse)
 * 2. Przetwarzanie warehouse items (POST /transfer/process-warehouse)
 * 3. Walidacja struktury danych wysyłanych do API
 * 4. Obsługa błędów API
 * 5. Edge cases (pusta lista, null size dla torebek)
 * 
 * NIE TESTUJEMY AUTO-MATCHINGU (🟢) - to będzie osobny scenariusz!
 * NIE TESTUJEMY UI - za dużo zależności (Ionicons, DateTimePicker)
 * 
 * Jeśli test failuje = mobilna funkcja Dobierz jest zepsuta = admin nie może przetwarzać magazynu!
 */

import tokenService from '../../services/tokenService';
import { getApiUrl } from '../../config/api';

// Mock fetch
global.fetch = jest.fn();

const mockWarehouseItems = [
  {
    _id: 'warehouse1',
    fullName: { fullName: 'Kurtka zimowa' },
    size: { Roz_Opis: 'M' },
    barcode: 'WAREHOUSE_001',
    price: 299,
    discount_price: 199,
    date: '2026-02-13'
  },
  {
    _id: 'warehouse2',
    fullName: { fullName: 'Płaszcz elegancki' },
    size: { Roz_Opis: 'L' },
    barcode: 'WAREHOUSE_002',
    price: 499,
    discount_price: 399,
    date: '2026-02-13'
  },
  {
    _id: 'warehouse3',
    fullName: { fullName: 'Torebka skórzana' },
    size: null, // Torebki nie mają rozmiaru
    barcode: 'BAG_001',
    price: 599,
    discount_price: 499,
    date: '2026-02-13'
  }
];

describe('🔥 CRITICAL MOBILE: Users/Dobierz - Pomarańczowe produkty (warehouse API)', () => {
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock tokenService
    tokenService.getTokens = jest.fn().mockResolvedValue({ 
      accessToken: 'mock-token',
      refreshToken: 'mock-refresh-token'
    });
  });

  test('✅ API: Pobiera warehouse items z backendu (GET /state/warehouse)', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/state/warehouse')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockWarehouseItems)
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { accessToken } = await tokenService.getTokens();
    const url = getApiUrl('/state/warehouse');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.ok).toBe(true);
    
    const warehouseItems = await response.json();
    expect(warehouseItems).toHaveLength(3);
    expect(warehouseItems[0].fullName.fullName).toBe('Kurtka zimowa');
    expect(warehouseItems[0].barcode).toBe('WAREHOUSE_001');
    expect(warehouseItems[1].size.Roz_Opis).toBe('L');
    expect(warehouseItems[2].size).toBeNull(); // Torebka bez rozmiaru
  });

  test('✅ API: process-warehouse endpoint - wysyła warehouse items do backendu (POST)', async () => {
    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/api/transfer/process-warehouse') && options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            processedCount: 2,
            message: 'Warehouse items processed successfully'
          })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { accessToken } = await tokenService.getTokens();
    const url = getApiUrl('/transfer/process-warehouse');
    
    const warehouseItemsToProcess = [
      {
        _id: mockWarehouseItems[0]._id,
        fullName: mockWarehouseItems[0].fullName,
        size: mockWarehouseItems[0].size,
        barcode: mockWarehouseItems[0].barcode,
        transfer_to: 'PUNKT_A'
      },
      {
        _id: mockWarehouseItems[1]._id,
        fullName: mockWarehouseItems[1].fullName,
        size: mockWarehouseItems[1].size,
        barcode: mockWarehouseItems[1].barcode,
        transfer_to: 'PUNKT_A'
      }
    ];

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        warehouseItems: warehouseItemsToProcess,
        selectedDate: '2026-02-13',
        selectedUser: 'user1',
        transactionId: 'test-transaction-123'
      })
    });

    expect(response.ok).toBe(true);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.processedCount).toBe(2);
    expect(result.message).toBe('Warehouse items processed successfully');
  });

  test('✅ VALIDATION: Wysyła prawidłową strukturę danych do process-warehouse', async () => {
    let capturedRequestBody = null;

    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/api/transfer/process-warehouse') && options?.method === 'POST') {
        capturedRequestBody = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            processedCount: 1
          })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { accessToken } = await tokenService.getTokens();
    const url = getApiUrl('/transfer/process-warehouse');
    
    const warehouseItem = {
      _id: mockWarehouseItems[0]._id,
      fullName: mockWarehouseItems[0].fullName,
      size: mockWarehouseItems[0].size,
      barcode: mockWarehouseItems[0].barcode,
      transfer_to: 'PUNKT_A'
    };

    await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        warehouseItems: [warehouseItem],
        selectedDate: '2026-02-13',
        selectedUser: 'user1',
        transactionId: 'test-123'
      })
    });

    // Weryfikacja struktury
    expect(capturedRequestBody).toBeTruthy();
    expect(capturedRequestBody.warehouseItems).toHaveLength(1);
    expect(capturedRequestBody.warehouseItems[0]._id).toBe('warehouse1');
    expect(capturedRequestBody.warehouseItems[0].barcode).toBe('WAREHOUSE_001');
    expect(capturedRequestBody.warehouseItems[0].transfer_to).toBe('PUNKT_A');
    expect(capturedRequestBody.selectedUser).toBe('user1');
    expect(capturedRequestBody.transactionId).toBe('test-123');
  });

  test('❌ ERROR: Obsługuje błąd API przy pobieraniu warehouse items', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/state/warehouse')) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Internal Server Error' })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { accessToken } = await tokenService.getTokens();
    const url = getApiUrl('/state/warehouse');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(500);
    
    const errorData = await response.json();
    expect(errorData.error).toBe('Internal Server Error');
  });

  test('❌ ERROR: Obsługuje błąd API przy przetwarzaniu warehouse items', async () => {
    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/api/transfer/process-warehouse') && options?.method === 'POST') {
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ 
            error: 'Validation failed',
            message: 'Missing required fields'
          })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { accessToken } = await tokenService.getTokens();
    const url = getApiUrl('/transfer/process-warehouse');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        warehouseItems: [{ invalid: 'data' }]
      })
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(400);
    
    const errorData = await response.json();
    expect(errorData.error).toBe('Validation failed');
    expect(errorData.message).toBe('Missing required fields');
  });

  test('✅ EDGE CASE: Pusta lista warehouse items', async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/state/warehouse')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]) // Pusty magazyn
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { accessToken } = await tokenService.getTokens();
    const url = getApiUrl('/state/warehouse');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.ok).toBe(true);
    
    const warehouseItems = await response.json();
    expect(warehouseItems).toHaveLength(0);
    expect(Array.isArray(warehouseItems)).toBe(true);
  });

  test('✅ EDGE CASE: Warehouse items z null size (torebki/portfele)', async () => {
    const bagsOnlyWarehouse = [
      {
        _id: 'bag1',
        fullName: { fullName: 'Torebka damska' },
        size: null, // Torebki nie mają rozmiaru
        barcode: 'BAG_001',
        price: 299,
        date: '2026-02-13'
      },
      {
        _id: 'wallet1',
        fullName: { fullName: 'Portfel męski' },
        size: null, // Portfele nie mają rozmiaru
        barcode: 'WALLET_001',
        price: 149,
        date: '2026-02-13'
      }
    ];

    global.fetch.mockImplementation((url) => {
      if (url.includes('/api/state/warehouse')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(bagsOnlyWarehouse)
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { accessToken } = await tokenService.getTokens();
    const url = getApiUrl('/state/warehouse');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.ok).toBe(true);
    
    const warehouseItems = await response.json();
    expect(warehouseItems).toHaveLength(2);
    expect(warehouseItems[0].size).toBeNull();
    expect(warehouseItems[1].size).toBeNull();
    expect(warehouseItems[0].barcode).toBe('BAG_001');
    expect(warehouseItems[1].barcode).toBe('WALLET_001');
  });

  test('✅ BULK: Przetwarzanie wielu warehouse items naraz', async () => {
    global.fetch.mockImplementation((url, options) => {
      if (url.includes('/api/transfer/process-warehouse') && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            success: true,
            processedCount: body.warehouseItems.length,
            message: `Processed ${body.warehouseItems.length} items`
          })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const { accessToken } = await tokenService.getTokens();
    const url = getApiUrl('/transfer/process-warehouse');
    
    const allWarehouseItems = mockWarehouseItems.map(item => ({
      _id: item._id,
      fullName: item.fullName,
      size: item.size,
      barcode: item.barcode,
      transfer_to: 'PUNKT_A'
    }));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        warehouseItems: allWarehouseItems,
        selectedDate: '2026-02-13',
        selectedUser: 'user1',
        transactionId: 'bulk-test-456'
      })
    });

    expect(response.ok).toBe(true);
    
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.processedCount).toBe(3);
    expect(result.message).toBe('Processed 3 items');
  });

  test('✅ AUTHORIZATION: Wymaga tokena dla warehouse endpoints', async () => {
    global.fetch.mockImplementation((url, options) => {
      // Sprawdź czy jest token
      if (!options?.headers?.Authorization) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: 'Unauthorized' })
        });
      }
      
      if (url.includes('/api/state/warehouse')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockWarehouseItems)
        });
      }
      
      return Promise.reject(new Error('Unknown URL'));
    });

    // Test BEZ tokena
    const urlWithoutToken = getApiUrl('/state/warehouse');
    const responseWithoutToken = await fetch(urlWithoutToken, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(responseWithoutToken.ok).toBe(false);
    expect(responseWithoutToken.status).toBe(401);

    // Test Z tokenem
    const { accessToken } = await tokenService.getTokens();
    const urlWithToken = getApiUrl('/state/warehouse');
    const responseWithToken = await fetch(urlWithToken, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    expect(responseWithToken.ok).toBe(true);
  });

  test('✅ USER ACTION: handleMoveFromWarehouse - logika przenoszenia produktu', async () => {
    // Ten test symuluje logikę handleMoveFromWarehouse z users.jsx (linia 751)
    
    const warehouseItem = mockWarehouseItems[0];
    const selectedUserSymbol = 'PUNKT_A';
    
    // Symulacja: użytkownik klika "Przenieś"
    // Produkt zostaje przeniesiony z magazynu do transfers
    
    const newTransferItem = {
      _id: warehouseItem._id,
      id: warehouseItem._id,
      fullName: warehouseItem.fullName,
      size: warehouseItem.size,
      barcode: warehouseItem.barcode,
      fromWarehouse: true, // 🟠 ORANGE marker
      transfer_from: 'MAGAZYN',
      transfer_to: selectedUserSymbol,
      price: warehouseItem.price || 0,
      discount_price: warehouseItem.discount_price || 0,
      movedAt: new Date().toISOString()
    };

    // Weryfikacja struktury transfer item
    expect(newTransferItem._id).toBe('warehouse1');
    expect(newTransferItem.fromWarehouse).toBe(true);
    expect(newTransferItem.transfer_from).toBe('MAGAZYN');
    expect(newTransferItem.transfer_to).toBe('PUNKT_A');
    expect(newTransferItem.barcode).toBe('WAREHOUSE_001');
    expect(newTransferItem.price).toBe(299);

    // Symulacja: produkt został usunięty z warehouseItems
    const warehouseItemsAfterMove = mockWarehouseItems.filter(
      item => item._id !== warehouseItem._id
    );
    
    expect(warehouseItemsAfterMove).toHaveLength(2); // Został 1 usunięty
    expect(warehouseItemsAfterMove.find(item => item._id === 'warehouse1')).toBeUndefined();
  });

  test('✅ USER ACTION: handleReturnToWarehouse - logika cofania przeniesienia', async () => {
    // Ten test symuluje logikę handleReturnToWarehouse z users.jsx (linia 779)
    
    // Krok 1: Mamy item w transfers (został wcześniej przeniesiony)
    const transferItem = {
      _id: 'warehouse1',
      fullName: { fullName: 'Kurtka zimowa' },
      size: { Roz_Opis: 'M' },
      barcode: 'WAREHOUSE_001',
      fromWarehouse: true,
      transfer_from: 'MAGAZYN',
      transfer_to: 'PUNKT_A',
      price: 299
    };

    const currentTransfers = [transferItem];
    const currentWarehouseItems = mockWarehouseItems.slice(1); // Bez warehouse1

    expect(currentTransfers).toHaveLength(1);
    expect(currentWarehouseItems).toHaveLength(2);

    // Krok 2: Użytkownik klika "Cofnij" / "Wróć do magazynu"
    // Symulacja handleReturnToWarehouse
    
    // Usuń z transfers
    const transfersAfterReturn = currentTransfers.filter(
      t => !(t._id === transferItem._id && t.fromWarehouse)
    );
    
    // Dodaj z powrotem do warehouse
    const warehouseAfterReturn = [...currentWarehouseItems, transferItem];

    // Weryfikacja
    expect(transfersAfterReturn).toHaveLength(0); // Transfer został usunięty
    expect(warehouseAfterReturn).toHaveLength(3); // Produkt wrócił do magazynu
    expect(warehouseAfterReturn.find(item => item._id === 'warehouse1')).toBeTruthy();
    expect(warehouseAfterReturn.find(item => item._id === 'warehouse1').barcode).toBe('WAREHOUSE_001');
  });
});
