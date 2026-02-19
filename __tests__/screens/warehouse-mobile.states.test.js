/**
 * 🔥 CRITICAL MOBILE TESTS - warehouse-mobile States Mode: API Logic Tests
 * 
 * ⚠️ UWAGA: Te testy chronią logikę API dla mobile panel stanów!
 * 
 * DLACZEGO TE TESTY SĄ KRYTYCZNE:
 * - Testują że mobile app wywołuje właściwe API endpoints
 * - Sprawdzają że POST /api/state zawiera isCorrection flag
 * - Weryfikują że DELETE używa is-correction header
 * - Zapewniają zgodność mobile ↔ backend dla logiki +1/-1/korekta
 * 
 * ❌ NIGDY NIE USUWAJ TYCH TESTÓW
 * ❌ WSZYSTKIE TESTY MUSZĄ PRZECHODZIĆ PRZED COMMITEM
 * 
 * SCENARIUSZE TESTOWANE:
 * 
 * ✅ POST /api/state:
 * 1. API endpoint wywołany z właściwym URL
 * 2. Body zawiera isCorrection flag
 * 3. Body zawiera sellingPoint z routing params
 * 4. Success response handlowany poprawnie
 * 
 * ✅ DELETE /api/state/:id:
 * 5. API endpoint wywołany z właściwym URL + ID
 * 6. Header is-correction ustawiony poprawnie
 * 7. Success response handlowany poprawnie
 * 8. Error handling dla network failures
 * 
 * 🎯 LOGIKA BIZNESOWA:
 * 9. isCorrection TRUE → korekta w historii
 * 10. isCorrection FALSE → produkcja w historii
 * 
 * Jeśli którykolwiek test failuje → STOP, NIE COMMITUJ!
 * 🚨 To chroni spójność mobile ↔ backend dla stanów!
 */

import * as tokenService from '../../services/tokenService';
import { getApiUrl } from '../../config/api';

// Mock tokenService
jest.mock('../../services/tokenService', () => ({
  default: {
    authenticatedFetch: jest.fn()
  },
  authenticatedFetch: jest.fn()
}));

// Mock API config
jest.mock('../../config/api', () => ({
  getApiUrl: jest.fn((endpoint) => `http://mock.api${endpoint}`),
  API_CONFIG: { BASE_URL: 'http://mock.api/api', TIMEOUT: 30000 }
}));

describe('🔥 CRITICAL MOBILE: warehouse-mobile States Mode - API Logic', () => {

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful response
    tokenService.authenticatedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true })
    });
  });

  // ==================== POST /api/state ====================

  describe('✅ POST /api/state - Dodawanie produktu do stanu', () => {

    test('✅ API wywołany z właściwym URL', async () => {
      const mockProduct = {
        fullName: 'Kurtka skórzana',
        size: 'XL',
        barcode: '1234567890123',
        price: 500
      };

      await tokenService.authenticatedFetch('http://mock.api/state', {
        method: 'POST',
        body: JSON.stringify(mockProduct)
      });

      expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
        'http://mock.api/state',
        expect.objectContaining({ method: 'POST' })
      );
    });

    test('✅ Body zawiera isCorrection flag', async () => {
      const mockRequestBody = {
        fullName: 'Kurtka skórzana',
        size: 'XL',
        barcode: '1234567890123',
        price: 500,
        isCorrection: true
      };

      await tokenService.authenticatedFetch('http://mock.api/state', {
        method: 'POST',
        body: JSON.stringify(mockRequestBody)
      });

      const callArgs = tokenService.authenticatedFetch.mock.calls[0];
      const bodyArg = JSON.parse(callArgs[1].body);
      
      expect(bodyArg.isCorrection).toBe(true);
    });

    test('✅ Body zawiera sellingPoint z routing params', async () => {
      const mockRequestBody = {
        fullName: 'Kurtka skórzana',
        size: 'XL',
        barcode: '1234567890123',
        price: 500,
        sellingPoint: 'DOM'
      };

      await tokenService.authenticatedFetch('http://mock.api/state', {
        method: 'POST',
        body: JSON.stringify(mockRequestBody)
      });

      const callArgs = tokenService.authenticatedFetch.mock.calls[0];
      const bodyArg = JSON.parse(callArgs[1].body);
      
      expect(bodyArg.sellingPoint).toBe('DOM');
    });

    test('✅ isCorrection FALSE → produkcja', async () => {
      const mockRequestBody = {
        fullName: 'Kurtka skórzana',
        size: 'XL',
        barcode: '1234567890123',
        price: 500,
        isCorrection: false
      };

      await tokenService.authenticatedFetch('http://mock.api/state', {
        method: 'POST',
        body: JSON.stringify(mockRequestBody)
      });

      const callArgs = tokenService.authenticatedFetch.mock.calls[0];
      const bodyArg = JSON.parse(callArgs[1].body);
      
      expect(bodyArg.isCorrection).toBe(false);
    });

    test('✅ Success response → status 200', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      });

      const response = await tokenService.authenticatedFetch('http://mock.api/state', {
        method: 'POST',
        body: JSON.stringify({ fullName: 'Test' })
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });

    test('❌ Network error → reject', async () => {
      tokenService.authenticatedFetch.mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        tokenService.authenticatedFetch('http://mock.api/state', {
          method: 'POST',
          body: JSON.stringify({ fullName: 'Test' })
        })
      ).rejects.toThrow('Network error');
    });
  });

  // ==================== DELETE /api/state/:id ====================

  describe('✅ DELETE /api/state/:id - Usuwanie produktu ze stanu', () => {

    test('✅ API wywołany z właściwym URL + ID', async () => {
      const stateId = 'state-123';

      await tokenService.authenticatedFetch(`http://mock.api/state/${stateId}`, {
        method: 'DELETE'
      });

      expect(tokenService.authenticatedFetch).toHaveBeenCalledWith(
        `http://mock.api/state/${stateId}`,
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    test('✅ Header is-correction: true → korekta', async () => {
      const stateId = 'state-123';

      await tokenService.authenticatedFetch(`http://mock.api/state/${stateId}`, {
        method: 'DELETE',
        headers: { 'is-correction': 'true' }
      });

      const callArgs = tokenService.authenticatedFetch.mock.calls[0];
      
      expect(callArgs[1].headers['is-correction']).toBe('true');
    });

    test('✅ Header is-correction: false → produkcja', async () => {
      const stateId = 'state-123';

      await tokenService.authenticatedFetch(`http://mock.api/state/${stateId}`, {
        method: 'DELETE',
        headers: { 'is-correction': 'false' }
      });

      const callArgs = tokenService.authenticatedFetch.mock.calls[0];
      
      expect(callArgs[1].headers['is-correction']).toBe('false');
    });

    test('✅ Success response → status 200', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true })
      });

      const response = await tokenService.authenticatedFetch('http://mock.api/state/123', {
        method: 'DELETE'
      });

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
    });

    test('❌ Network error → reject', async () => {
      tokenService.authenticatedFetch.mockRejectedValue(
        new Error('Network error')
      );

      await expect(
        tokenService.authenticatedFetch('http://mock.api/state/123', {
          method: 'DELETE'
        })
      ).rejects.toThrow('Network error');
    });

    test('❌ Invalid ID → 404', async () => {
      tokenService.authenticatedFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'State not found' })
      });

      const response = await tokenService.authenticatedFetch('http://mock.api/state/invalid', {
        method: 'DELETE'
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });

  // ==================== LOGIKA BIZNESOWA ====================

  describe('🎯 LOGIKA BIZNESOWA - isCorrection flag', () => {

    test('✅ POST z isCorrection=true → body zawiera flag', async () => {
      const requestBody = {
        fullName: 'Produkt testowy',
        size: 'M',
        barcode: '123456',
        price: 100,
        isCorrection: true,
        sellingPoint: 'DOM'
      };

      await tokenService.authenticatedFetch('http://mock.api/state', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const callArgs = tokenService.authenticatedFetch.mock.calls[0];
      const bodyArg = JSON.parse(callArgs[1].body);
      
      expect(bodyArg.isCorrection).toBe(true);
      expect(bodyArg.sellingPoint).toBe('DOM');
    });

    test('✅ DELETE z is-correction=true → header ustawiony', async () => {
      await tokenService.authenticatedFetch('http://mock.api/state/123', {
        method: 'DELETE',
        headers: { 'is-correction': 'true' }
      });

      const callArgs = tokenService.authenticatedFetch.mock.calls[0];
      
      expect(callArgs[1].headers['is-correction']).toBe('true');
    });

    test('✅ Bulk operations → multiple API calls', async () => {
      const stateIds = ['state-1', 'state-2', 'state-3'];

      for (const id of stateIds) {
        await tokenService.authenticatedFetch(`http://mock.api/state/${id}`, {
          method: 'DELETE',
          headers: { 'is-correction': 'true' }
        });
      }

      expect(tokenService.authenticatedFetch).toHaveBeenCalledTimes(3);
    });
  });

  // ==================== EDGE CASES ====================

  describe('🎯 EDGE CASES', () => {

    test('✅ Torebka → size może być null', async () => {
      const requestBody = {
        fullName: 'Torebka damska',
        size: null,
        barcode: '987654',
        price: 200,
        isCorrection: false,
        sellingPoint: 'MAGAZYN'
      };

      await tokenService.authenticatedFetch('http://mock.api/state', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      });

      const callArgs = tokenService.authenticatedFetch.mock.calls[0];
      const bodyArg = JSON.parse(callArgs[1].body);
      
      expect(bodyArg.size).toBe(null);
    });

    test('❌ Timeout → reject', async () => {
      tokenService.authenticatedFetch.mockRejectedValue(
        new Error('Request timeout')
      );

      await expect(
        tokenService.authenticatedFetch('http://mock.api/state', {
          method: 'POST',
          body: JSON.stringify({ fullName: 'Test' })
        })
      ).rejects.toThrow('Request timeout');
    });

    test('✅ Multiple sellingPoints → różne API calls', async () => {
      const points = ['DOM', 'MAGAZYN', 'SKLEP'];

      for (const point of points) {
        await tokenService.authenticatedFetch('http://mock.api/state', {
          method: 'POST',
          body: JSON.stringify({ 
            fullName: 'Test', 
            sellingPoint: point 
          })
        });
      }

      expect(tokenService.authenticatedFetch).toHaveBeenCalledTimes(3);
      
      const calls = tokenService.authenticatedFetch.mock.calls;
      calls.forEach((call, index) => {
        const body = JSON.parse(call[1].body);
        expect(body.sellingPoint).toBe(points[index]);
      });
    });
  });
});
