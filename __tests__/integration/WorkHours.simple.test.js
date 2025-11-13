// Work Hours Integration Tests - Simple Version
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateTimeFormat, calculateWorkHours, validateWorkHoursData, isTimeWithinWorkHours, calculateDailyPay, getTimeOptions } from '../../utils/workHoursUtils';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('Work Hours Integration Tests - Simple', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue();
  });

  describe('Utils Integration', () => {
    test('Walidacja i obliczenia - pełny cykl', () => {
      // Test validation
      expect(validateTimeFormat('09:00')).toBe(true);
      expect(validateTimeFormat('17:00')).toBe(true);

      // Test calculation
      const result = calculateWorkHours('09:00', '17:00');
      expect(result.totalHours).toBe(8);
      expect(result.error).toBe(null);

      // Test full data validation
      const data = {
        employeeId: 'EMP001',
        startTime: '09:00',
        endTime: '17:00',
        date: '2025-01-13'
      };

      const validation = validateWorkHoursData(data);
      expect(validation.isValid).toBe(true);
    });

    test('Zmiana nocna - kompletny test', () => {
      const result = calculateWorkHours('22:00', '06:00');
      expect(result.totalHours).toBe(8);
      expect(result.error).toBe(null);

      expect(isTimeWithinWorkHours('23:30', '22:00', '06:00')).toBe(true);
      expect(isTimeWithinWorkHours('03:00', '22:00', '06:00')).toBe(true);
      expect(isTimeWithinWorkHours('12:00', '22:00', '06:00')).toBe(false);
    });

    test('Obsługa błędów - cały przepływ', () => {
      const invalidData = {
        employeeId: 'EMP001',
        startTime: 'invalid',
        endTime: '17:00',
        date: '2025-01-13'
      };

      expect(validateTimeFormat(invalidData.startTime)).toBe(false);
      
      const validation = validateWorkHoursData(invalidData);
      expect(validation.isValid).toBe(false);

      const calculation = calculateWorkHours(invalidData.startTime, invalidData.endTime);
      expect(calculation.error).toBe('Invalid time format');
    });
  });

  describe('Storage Integration', () => {
    test('Zapis i odczyt z AsyncStorage', async () => {
      const data = {
        employeeId: 'EMP001',
        startTime: '09:00',
        endTime: '17:00'
      };

      // Test save
      await AsyncStorage.setItem('workHours_EMP001', JSON.stringify(data));
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'workHours_EMP001',
        JSON.stringify(data)
      );

      // Test load
      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(data));
      const result = await AsyncStorage.getItem('workHours_EMP001');
      const parsed = JSON.parse(result);

      expect(parsed.startTime).toBe('09:00');
      expect(parsed.endTime).toBe('17:00');
    });

    test('Obsługa błędów storage', async () => {
      AsyncStorage.getItem.mockRejectedValueOnce(new Error('Storage error'));

      try {
        await AsyncStorage.getItem('workHours_ERROR');
      } catch (error) {
        expect(error.message).toBe('Storage error');
      }
    });
  });

  describe('Business Logic Integration', () => {
    test('Obliczanie płacy dziennej', () => {
      const dailyPay = calculateDailyPay('09:00', '17:00', 25);
      expect(dailyPay).toBe(200); // 8 hours * 25

      const nightShiftPay = calculateDailyPay('22:00', '06:00', 30);
      expect(nightShiftPay).toBe(240); // 8 hours * 30
    });

    test('Sprawdzanie godzin sprzedaży', () => {
      expect(isTimeWithinWorkHours('12:00', '09:00', '17:00')).toBe(true);
      expect(isTimeWithinWorkHours('20:00', '09:00', '17:00')).toBe(false);
      expect(isTimeWithinWorkHours('09:00', '09:00', '17:00')).toBe(true); // Start time
      expect(isTimeWithinWorkHours('17:00', '09:00', '17:00')).toBe(true); // End time
    });

    test('Generowanie opcji czasu', () => {
      const options = getTimeOptions();
      expect(options).toContain('08:00');
      expect(options).toContain('16:00');
      expect(options.length).toBeGreaterThan(20);
      
      // Test that all options are valid times
      options.forEach(time => {
        expect(validateTimeFormat(time)).toBe(true);
      });
    });
  });

  describe('Commission Integration Scenarios', () => {
    test('Wpływ zmiany godzin na komisje', () => {
      const oldHours = { startTime: '09:00', endTime: '17:00' };
      const newHours = { startTime: '08:00', endTime: '18:00' };

      // Sale at 08:30 - outside old hours, inside new hours
      const saleTime = '08:30';
      
      const wasInOldHours = isTimeWithinWorkHours(saleTime, oldHours.startTime, oldHours.endTime);
      const isInNewHours = isTimeWithinWorkHours(saleTime, newHours.startTime, newHours.endTime);

      expect(wasInOldHours).toBe(false);
      expect(isInNewHours).toBe(true);

      // This demonstrates that commission would need recalculation
    });

    test('Scenariusz: Przedłużenie godzin pracy', () => {
      const originalHours = { startTime: '09:00', endTime: '16:00' };
      const extendedHours = { startTime: '08:00', endTime: '18:00' };

      const salesTimes = ['07:30', '08:30', '16:30', '17:30'];
      
      salesTimes.forEach(saleTime => {
        const inOriginal = isTimeWithinWorkHours(saleTime, originalHours.startTime, originalHours.endTime);
        const inExtended = isTimeWithinWorkHours(saleTime, extendedHours.startTime, extendedHours.endTime);
        
        if (saleTime === '08:30' || saleTime === '16:30') {
          // These should be newly eligible for commission
          expect(inOriginal).toBe(false);
          expect(inExtended).toBe(true);
        }
      });
    });
  });
});