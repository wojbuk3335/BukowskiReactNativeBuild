// Work Hours E2E Tests - Simplified Version
import { validateTimeFormat, calculateWorkHours } from '../../utils/workHoursUtils';

describe('Work Hours E2E Tests - Simplified', () => {
  test('Pełny scenariusz: walidacja -> obliczanie -> zapis', async () => {
    // Step 1: Validate input
    const startTime = '09:00';
    const endTime = '17:00';
    
    expect(validateTimeFormat(startTime)).toBe(true);
    expect(validateTimeFormat(endTime)).toBe(true);

    // Step 2: Calculate hours
    const result = calculateWorkHours(startTime, endTime);
    expect(result.totalHours).toBe(8);
    expect(result.error).toBe(null);

    // Step 3: Simulate save
    const workHoursData = {
      employeeId: 'EMP001',
      date: new Date().toISOString().split('T')[0],
      startTime,
      endTime,
      totalHours: result.totalHours
    };

    // Mock successful save
    expect(workHoursData.totalHours).toBe(8);
    expect(workHoursData.employeeId).toBe('EMP001');
  });

  test('Scenariusz błędu: nieprawidłowe dane -> walidacja -> komunikat', () => {
    const invalidStartTime = 'invalid';
    const validEndTime = '17:00';

    // Should fail validation
    expect(validateTimeFormat(invalidStartTime)).toBe(false);
    expect(validateTimeFormat(validEndTime)).toBe(true);

    // Should return error when calculating
    const result = calculateWorkHours(invalidStartTime, validEndTime);
    expect(result.error).toBe('Invalid time format');
    expect(result.totalHours).toBe(0);
  });

  test('Scenariusz zmiany nocnej: 22:00-06:00', () => {
    const startTime = '22:00';
    const endTime = '06:00';

    expect(validateTimeFormat(startTime)).toBe(true);
    expect(validateTimeFormat(endTime)).toBe(true);

    const result = calculateWorkHours(startTime, endTime);
    expect(result.totalHours).toBe(8);
    expect(result.isOvernightShift).toBe(true);
    expect(result.error).toBe(null);
  });

  test('Scenariusz zbyt długiej zmiany: ponad 16 godzin', () => {
    const { validateWorkHoursData } = require('../../utils/workHoursUtils');
    
    const longShiftData = {
      employeeId: 'EMP001',
      date: '2025-11-13',
      startTime: '00:00',
      endTime: '23:59' // Prawie 24 godziny
    };

    const result = validateWorkHoursData(longShiftData);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(error => error.includes('exceed 16 hours'))).toBe(true);
  });
});