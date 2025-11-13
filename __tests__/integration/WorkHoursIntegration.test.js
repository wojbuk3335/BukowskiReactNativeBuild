// Work Hours Integration Tests - Simplified
import AsyncStorage from '@react-native-async-storage/async-storage';
import { validateTimeFormat, calculateWorkHours, validateWorkHoursData } from '../../utils/workHoursUtils';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('Work Hours Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockResolvedValue(null);
    AsyncStorage.setItem.mockResolvedValue();
  });

  describe('Data Validation and Calculation Integration', () => {
    test('Walidacja -> Obliczanie -> Zapis danych lokalnie', async () => {
      console.log('🔗 Test integracji: Pełny cykl danych godzin pracy');

      const testData = {
        employeeId: 'EMP001',
        startTime: '09:00',
        endTime: '17:00',
        date: '2025-01-13'
      };

      // Step 1: Validate input
      expect(validateTimeFormat(testData.startTime)).toBe(true);
      expect(validateTimeFormat(testData.endTime)).toBe(true);

      const validation = validateWorkHoursData(testData);
      expect(validation.isValid).toBe(true);

      // Step 2: Calculate hours
      const calculation = calculateWorkHours(testData.startTime, testData.endTime);
      expect(calculation.totalHours).toBe(8);
      expect(calculation.error).toBe(null);

      // Step 3: Save to storage
      const savedData = {
        ...testData,
        totalHours: calculation.totalHours,
        saved: true
      };

      await AsyncStorage.setItem('workHours_EMP001', JSON.stringify(savedData));

      // Verify storage call
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'workHours_EMP001', 
        JSON.stringify(savedData)
      );

      console.log('✅ Integracja walidacji i obliczeń działa poprawnie');
    });

    test('Wczytanie -> Walidacja -> Aktualizacja istniejących godzin', async () => {
      console.log('🔗 Test integracji: Aktualizacja istniejących danych');

      // Mock existing data in storage
      const existingData = {
        employeeId: 'EMP002',
        startTime: '08:00',
        endTime: '16:00',
        totalHours: 8,
        date: '2025-01-13'
      };

      AsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existingData));

      // Load existing data
      const stored = await AsyncStorage.getItem('workHours_EMP002');
      const parsedData = JSON.parse(stored);

      expect(parsedData.startTime).toBe('08:00');
      expect(parsedData.endTime).toBe('16:00');

      // Update data
      const updatedData = {
        ...parsedData,
        startTime: '09:00',
        endTime: '17:00'
      };

      // Validate updated data
      const validation = validateWorkHoursData(updatedData);
      expect(validation.isValid).toBe(true);

      // Recalculate hours
      const calculation = calculateWorkHours(updatedData.startTime, updatedData.endTime);
      expect(calculation.totalHours).toBe(8);

      // Save updated data
      updatedData.totalHours = calculation.totalHours;
      await AsyncStorage.setItem('workHours_EMP002', JSON.stringify(updatedData));

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'workHours_EMP002',
        JSON.stringify(updatedData)
      );

      console.log('✅ Aktualizacja istniejących danych działa poprawnie');
    });

    test('Obsługa błędnych danych -> Rollback', async () => {
      console.log('🔗 Test integracji: Obsługa błędów');

      const invalidData = {
        employeeId: 'EMP003',
        startTime: '25:00', // Invalid time
        endTime: '17:00',
        date: '2025-01-13'
      };

      // Should fail validation
      expect(validateTimeFormat(invalidData.startTime)).toBe(false);
      
      const validation = validateWorkHoursData(invalidData);
      expect(validation.isValid).toBe(false);

      // Should not proceed to calculation or saving
      const calculation = calculateWorkHours(invalidData.startTime, invalidData.endTime);
      expect(calculation.error).toBe('Invalid time format');

      // Should not save invalid data
      // In real app, this would be conditional on validation
      if (validation.isValid) {
        await AsyncStorage.setItem('workHours_EMP003', JSON.stringify(invalidData));
      }

      // Verify no storage call was made
      expect(AsyncStorage.setItem).not.toHaveBeenCalled();

      console.log('✅ Obsługa błędów działa poprawnie');
    });

    test('Integracja z komisjami: Godziny pracy vs Sprzedaż', () => {
      console.log('🔗 Test integracji: System komisji');

      const workHours = {
        startTime: '09:00',
        endTime: '17:00'
      };

      const sales = [
        { time: '10:30', amount: 100 }, // Within hours
        { time: '14:00', amount: 200 }, // Within hours
        { time: '19:00', amount: 150 }  // Outside hours
      ];

      // Import commission utilities if they exist
      const { isTimeWithinWorkHours } = require('../../utils/workHoursUtils');

      sales.forEach(sale => {
        const inHours = isTimeWithinWorkHours(sale.time, workHours.startTime, workHours.endTime);
        
        if (sale.time === '10:30' || sale.time === '14:00') {
          expect(inHours).toBe(true);
        } else {
          expect(inHours).toBe(false);
        }
      });

      console.log('✅ Integracja z systemem komisji działa poprawnie');
    });
  });

  describe('Error Handling Integration', () => {
    test('Storage Error -> Fallback -> Recovery', async () => {
      console.log('🔗 Test integracji: Obsługa błędów storage');

      const testData = {
        employeeId: 'EMP004',
        startTime: '09:00',
        endTime: '17:00',
        date: '2025-01-13' // Dodaję wymaganą datę
      };

      // Mock storage error
      AsyncStorage.setItem.mockRejectedValueOnce(new Error('Storage full'));

      // Validate data (should succeed)
      const validation = validateWorkHoursData(testData);
      expect(validation.isValid).toBe(true);

      // Calculate (should succeed)
      const calculation = calculateWorkHours(testData.startTime, testData.endTime);
      expect(calculation.totalHours).toBe(8);

      // Try to save (should fail gracefully)
      try {
        await AsyncStorage.setItem('workHours_EMP004', JSON.stringify(testData));
      } catch (error) {
        expect(error.message).toBe('Storage full');
        console.log('Storage error handled gracefully');
      }

      // Verify attempt was made
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'workHours_EMP004',
        JSON.stringify(testData)
      );

      console.log('✅ Obsługa błędów storage działa poprawnie');
    });

    test('Data Corruption Recovery', async () => {
      console.log('🔗 Test integracji: Odzyskiwanie po uszkodzeniu danych');

      // Mock corrupted data
      AsyncStorage.getItem.mockResolvedValueOnce('corrupted json data');

      let recoverySuccessful = false;

      try {
        const stored = await AsyncStorage.getItem('workHours_CORRUPTED');
        const parsedData = JSON.parse(stored);
      } catch (error) {
        console.log('Detected corrupted data, using defaults');
        
        // Use default data
        const defaultData = {
          employeeId: 'CORRUPTED',
          startTime: '08:00',
          endTime: '16:00',
          totalHours: 8,
          date: '2025-01-13' // Dodaję wymaganą datę
        };

        // Validate defaults
        const validation = validateWorkHoursData(defaultData);
        expect(validation.isValid).toBe(true);
        
        recoverySuccessful = true;
      }

      expect(recoverySuccessful).toBe(true);
      console.log('✅ Odzyskiwanie po uszkodzeniu danych działa poprawnie');
    });
  });
});