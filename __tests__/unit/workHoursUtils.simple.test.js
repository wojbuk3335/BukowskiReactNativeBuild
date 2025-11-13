// Simple test for work hours utilities
import { validateTimeFormat, calculateWorkHours } from '../../utils/workHoursUtils';

describe('Work Hours Utils - Simple Tests', () => {
  test('powinien zwalidować poprawny format czasu', () => {
    expect(validateTimeFormat('09:00')).toBe(true);
    expect(validateTimeFormat('23:59')).toBe(true);
    expect(validateTimeFormat('00:00')).toBe(true);
  });

  test('powinien odrzucić niepoprawny format czasu', () => {
    expect(validateTimeFormat('24:00')).toBe(false);
    expect(validateTimeFormat('abc')).toBe(false);
    expect(validateTimeFormat('')).toBe(false);
    expect(validateTimeFormat(null)).toBe(false);
  });

  test('powinien poprawnie obliczyć godziny pracy', () => {
    const result = calculateWorkHours('09:00', '17:00');
    expect(result.totalHours).toBe(8);
    expect(result.error).toBe(null);
  });

  test('powinien obsłużyć zmianę nocną', () => {
    const result = calculateWorkHours('22:00', '06:00');
    expect(result.totalHours).toBe(8);
    expect(result.isOvernightShift).toBe(true);
  });

  test('powinien zwrócić błąd dla niepoprawnych czasów', () => {
    const result = calculateWorkHours('invalid', '17:00');
    expect(result.error).toBe('Invalid time format');
    expect(result.totalHours).toBe(0);
  });
});