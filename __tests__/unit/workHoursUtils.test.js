// Work Hours Unit Tests
import { validateTimeFormat, calculateWorkHours, parseTimeToMinutes, formatMinutesToTime, validateWorkHoursData, isTimeWithinWorkHours } from '../../utils/workHoursUtils';

describe('Work Hours Utils Tests', () => {
  describe('Time Validation Tests', () => {
    test('Powinien zwalidować poprawny format czasu', () => {
      expect(validateTimeFormat('08:00')).toBe(true);
      expect(validateTimeFormat('16:30')).toBe(true);
      expect(validateTimeFormat('23:59')).toBe(true);
      expect(validateTimeFormat('00:00')).toBe(true);
    });

    test('Powinien odrzucić niepoprawny format czasu', () => {
      expect(validateTimeFormat('25:00')).toBe(false); // Invalid hour
      expect(validateTimeFormat('08:60')).toBe(false); // Invalid minute
      expect(validateTimeFormat('8:00')).toBe(false);  // Missing leading zero
      expect(validateTimeFormat('08:5')).toBe(false);  // Missing leading zero
      expect(validateTimeFormat('abc:00')).toBe(false); // Invalid format
      expect(validateTimeFormat('08-00')).toBe(false); // Wrong separator
      expect(validateTimeFormat('')).toBe(false);      // Empty string
      expect(validateTimeFormat(null)).toBe(false);    // Null value
    });
  });

  describe('Work Hours Calculation Tests', () => {
    test('Powinien policzyć standardowe 8-godzinne godziny pracy', () => {
      const result = calculateWorkHours('08:00', '16:00');
      expect(result.totalHours).toBe(8);
      expect(result.totalMinutes).toBe(480);
    });

    test('Powinien policzyć godziny pracy z przerwą na lunch', () => {
      const result = calculateWorkHours('09:00', '17:30');
      expect(result.totalHours).toBe(8.5);
      expect(result.totalMinutes).toBe(510);
    });

    test('Powinien obsłużyć pracę przez północ', () => {
      const result = calculateWorkHours('22:00', '06:00');
      expect(result.totalHours).toBe(8);
      expect(result.totalMinutes).toBe(480);
    });

    test('Powinien zwrócić błąd dla niepoprawnych godzin', () => {
      const result = calculateWorkHours('16:00', '08:00'); // End before start (same day)
      expect(result.error).toBeTruthy();
      expect(result.totalHours).toBe(0);
    });

    test('Powinien obsłużyć godziny równe sobie', () => {
      const result = calculateWorkHours('12:00', '12:00');
      expect(result.totalHours).toBe(0);
      expect(result.totalMinutes).toBe(0);
    });
  });

  describe('Time Parsing Tests', () => {
    test('Powinien parsować czas do minut', () => {
      expect(parseTimeToMinutes('08:00')).toBe(480);  // 8 * 60
      expect(parseTimeToMinutes('12:30')).toBe(750);  // 12 * 60 + 30
      expect(parseTimeToMinutes('00:00')).toBe(0);
      expect(parseTimeToMinutes('23:59')).toBe(1439); // 23 * 60 + 59
    });

    test('Powinien formatować minuty z powrotem do czasu', () => {
      expect(formatMinutesToTime(480)).toBe('08:00');
      expect(formatMinutesToTime(750)).toBe('12:30');
      expect(formatMinutesToTime(0)).toBe('00:00');
      expect(formatMinutesToTime(1439)).toBe('23:59');
    });

    test('Powinien obsłużyć edge cases', () => {
      expect(parseTimeToMinutes('24:00')).toBe(null); // Invalid
      expect(formatMinutesToTime(-1)).toBe(null);     // Invalid
      expect(formatMinutesToTime(1440)).toBe(null);   // 24:00 - invalid
    });
  });

  describe('Work Schedule Validation Tests', () => {
    test('Powinien sprawdzić czy godzina sprzedaży mieści się w godzinach pracy', () => {
      const workStart = '08:00';
      const workEnd = '16:00';
      
      expect(isTimeWithinWorkHours('09:00', workStart, workEnd)).toBe(true);
      expect(isTimeWithinWorkHours('12:00', workStart, workEnd)).toBe(true);
      expect(isTimeWithinWorkHours('15:59', workStart, workEnd)).toBe(true);
      expect(isTimeWithinWorkHours('16:00', workStart, workEnd)).toBe(true); // End time inclusive
      
      expect(isTimeWithinWorkHours('07:59', workStart, workEnd)).toBe(false);
      expect(isTimeWithinWorkHours('16:01', workStart, workEnd)).toBe(false);
      expect(isTimeWithinWorkHours('22:00', workStart, workEnd)).toBe(false);
    });

    test('Powinien obsłużyć nocne godziny pracy', () => {
      const workStart = '22:00';
      const workEnd = '06:00';
      
      expect(isTimeWithinWorkHours('23:00', workStart, workEnd)).toBe(true);
      expect(isTimeWithinWorkHours('02:00', workStart, workEnd)).toBe(true);
      expect(isTimeWithinWorkHours('05:59', workStart, workEnd)).toBe(true);
      
      expect(isTimeWithinWorkHours('07:00', workStart, workEnd)).toBe(false);
      expect(isTimeWithinWorkHours('21:59', workStart, workEnd)).toBe(false);
      expect(isTimeWithinWorkHours('12:00', workStart, workEnd)).toBe(false);
    });
  });
});