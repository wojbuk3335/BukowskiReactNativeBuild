// Test suite for workHoursUtils
import {
  validateTimeFormat,
  parseTimeToMinutes,
  formatMinutesToTime,
  calculateWorkHours,
  isTimeWithinWorkHours,
  validateWorkHoursData
} from '../../utils/workHoursUtils';

describe('workHoursUtils', () => {
  describe('validateTimeFormat', () => {
    test('should accept valid time format HH:MM', () => {
      expect(validateTimeFormat('08:00')).toBe(true);
      expect(validateTimeFormat('16:30')).toBe(true);
      expect(validateTimeFormat('23:59')).toBe(true);
      expect(validateTimeFormat('00:00')).toBe(true);
    });

    test('should reject invalid time formats', () => {
      expect(validateTimeFormat('8:00')).toBe(false); // Missing leading zero
      expect(validateTimeFormat('25:00')).toBe(false); // Invalid hour
      expect(validateTimeFormat('12:60')).toBe(false); // Invalid minute
      expect(validateTimeFormat('12-30')).toBe(false); // Wrong separator
      expect(validateTimeFormat('abc')).toBe(false); // Not a time
      expect(validateTimeFormat('')).toBe(false); // Empty string
      expect(validateTimeFormat(null)).toBe(false); // Null
    });
  });

  describe('parseTimeToMinutes', () => {
    test('should convert valid time to total minutes', () => {
      expect(parseTimeToMinutes('00:00')).toBe(0);
      expect(parseTimeToMinutes('08:00')).toBe(480); // 8 * 60
      expect(parseTimeToMinutes('16:30')).toBe(990); // 16 * 60 + 30
      expect(parseTimeToMinutes('23:59')).toBe(1439);
    });

    test('should return null for invalid time', () => {
      expect(parseTimeToMinutes('25:00')).toBe(null);
      expect(parseTimeToMinutes('invalid')).toBe(null);
    });
  });

  describe('formatMinutesToTime', () => {
    test('should convert minutes to HH:MM format', () => {
      expect(formatMinutesToTime(0)).toBe('00:00');
      expect(formatMinutesToTime(480)).toBe('08:00');
      expect(formatMinutesToTime(990)).toBe('16:30');
      expect(formatMinutesToTime(1439)).toBe('23:59');
    });

    test('should return null for invalid minutes', () => {
      expect(formatMinutesToTime(-1)).toBe(null); // Negative
      expect(formatMinutesToTime(1440)).toBe(null); // >= 24 hours
      expect(formatMinutesToTime(2000)).toBe(null); // Way too many
    });
  });

  describe('calculateWorkHours', () => {
    test('should calculate work hours for same-day shift', () => {
      const result = calculateWorkHours('08:00', '16:00');
      expect(result.error).toBe(null);
      expect(result.totalHours).toBe(8);
      expect(result.totalMinutes).toBe(480);
      expect(result.isOvernightShift).toBe(false);
    });

    test('should calculate work hours for overnight shift', () => {
      const result = calculateWorkHours('22:00', '06:00');
      expect(result.error).toBe(null);
      expect(result.totalHours).toBe(8);
      expect(result.totalMinutes).toBe(480);
      expect(result.isOvernightShift).toBe(true);
    });

    test('❌ should reject when end time is before start time (invalid shift)', () => {
      // Case: end time earlier than start, but would calculate > 12h (unrealistic)
      const result = calculateWorkHours('16:00', '08:00');
      
      expect(result.error).toBe('End time cannot be before start time');
      expect(result.totalHours).toBe(0);
      expect(result.totalMinutes).toBe(0);
    });

    test('should accept valid overnight shift (< 12h)', () => {
      // 20:00 to 02:00 = 6 hours (valid overnight)
      const result = calculateWorkHours('20:00', '02:00');
      expect(result.error).toBe(null);
      expect(result.totalHours).toBe(6);
      expect(result.isOvernightShift).toBe(true);
    });

    test('should reject work hours exceeding 24 hours', () => {
      // This shouldn't happen with proper time format, but test the guard
      const result = calculateWorkHours('00:00', '00:00');
      expect(result.totalHours).toBe(0); // Same time = 0 hours
    });

    test('should reject invalid time formats', () => {
      const result1 = calculateWorkHours('invalid', '16:00');
      expect(result1.error).toBe('Invalid time format');
      
      const result2 = calculateWorkHours('08:00', 'invalid');
      expect(result2.error).toBe('Invalid time format');
    });
  });

  describe('isTimeWithinWorkHours', () => {
    test('should return true for time within same-day shift', () => {
      expect(isTimeWithinWorkHours('10:00', '08:00', '16:00')).toBe(true);
      expect(isTimeWithinWorkHours('08:00', '08:00', '16:00')).toBe(true); // Start boundary
      expect(isTimeWithinWorkHours('16:00', '08:00', '16:00')).toBe(true); // End boundary
    });

    test('should return false for time outside same-day shift', () => {
      expect(isTimeWithinWorkHours('07:59', '08:00', '16:00')).toBe(false);
      expect(isTimeWithinWorkHours('16:01', '08:00', '16:00')).toBe(false);
    });

    test('should handle overnight shifts correctly', () => {
      // Overnight shift: 22:00 to 06:00
      expect(isTimeWithinWorkHours('23:00', '22:00', '06:00')).toBe(true); // Before midnight
      expect(isTimeWithinWorkHours('02:00', '22:00', '06:00')).toBe(true); // After midnight
      expect(isTimeWithinWorkHours('22:00', '22:00', '06:00')).toBe(true); // Start boundary
      expect(isTimeWithinWorkHours('06:00', '22:00', '06:00')).toBe(true); // End boundary
      expect(isTimeWithinWorkHours('12:00', '22:00', '06:00')).toBe(false); // Outside shift
    });

    test('should return false for invalid time formats', () => {
      expect(isTimeWithinWorkHours('invalid', '08:00', '16:00')).toBe(false);
      expect(isTimeWithinWorkHours('10:00', 'invalid', '16:00')).toBe(false);
      expect(isTimeWithinWorkHours('10:00', '08:00', 'invalid')).toBe(false);
    });
  });

  describe('validateWorkHoursData', () => {
    test('should validate correct work hours data', () => {
      const validData = {
        employeeId: 'emp123',
        date: '2024-01-15',
        startTime: '08:00',
        endTime: '16:00'
      };
      
      const result = validateWorkHoursData(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject missing required fields', () => {
      const incompleteData = {
        startTime: '08:00',
        endTime: '16:00'
        // Missing employeeId and date
      };
      
      const result = validateWorkHoursData(incompleteData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Employee ID is required');
      expect(result.errors).toContain('Date is required');
    });

    test('should reject invalid time formats', () => {
      const invalidData = {
        employeeId: 'emp123',
        date: '2024-01-15',
        startTime: 'invalid',
        endTime: '16:00'
      };
      
      const result = validateWorkHoursData(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Start time must be in HH:MM format');
    });

    test('should reject work hours exceeding 16 hours', () => {
      const tooLongShift = {
        employeeId: 'emp123',
        date: '2024-01-15',
        startTime: '06:00',
        endTime: '23:00' // 17 hours
      };
      
      const result = validateWorkHoursData(tooLongShift);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Work hours cannot exceed 16 hours per day');
    });

    test('should reject work hours less than 1 hour', () => {
      const tooShortShift = {
        employeeId: 'emp123',
        date: '2024-01-15',
        startTime: '08:00',
        endTime: '08:30' // 0.5 hours
      };
      
      const result = validateWorkHoursData(tooShortShift);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Work hours must be at least 1 hour');
    });

    test('should reject when end time is before start time (invalid)', () => {
      const invalidShift = {
        employeeId: 'emp123',
        date: '2024-01-15',
        startTime: '16:00',
        endTime: '08:00' // Would be >12h if treated as overnight
      };
      
      const result = validateWorkHoursData(invalidShift);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('End time cannot be before start time');
    });

    test('should return error for null data', () => {
      const result = validateWorkHoursData(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Work hours data is required');
    });
  });
});
