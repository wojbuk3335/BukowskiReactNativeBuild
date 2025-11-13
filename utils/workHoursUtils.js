// Work Hours Utility Functions
// This file contains helper functions for work hours management

/**
 * Validates time format (HH:MM)
 * @param {string} timeStr - Time string to validate
 * @returns {boolean} - True if valid format
 */
export const validateTimeFormat = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return false;
  
  const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(timeStr)) return false;
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
};

/**
 * Parses time string to total minutes
 * @param {string} timeStr - Time in HH:MM format
 * @returns {number|null} - Total minutes or null if invalid
 */
export const parseTimeToMinutes = (timeStr) => {
  if (!validateTimeFormat(timeStr)) return null;
  
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Formats total minutes to time string
 * @param {number} totalMinutes - Total minutes
 * @returns {string|null} - Time in HH:MM format or null if invalid
 */
export const formatMinutesToTime = (totalMinutes) => {
  if (totalMinutes < 0 || totalMinutes >= 1440) return null;
  
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

/**
 * Calculates total work hours between start and end time
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {object} - Object with totalHours, totalMinutes, error, and isOvernightShift
 */
export const calculateWorkHours = (startTime, endTime) => {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);
  
  if (startMinutes === null || endMinutes === null) {
    return { error: 'Invalid time format', totalHours: 0, totalMinutes: 0 };
  }
  
  let totalMinutes;
  
  if (endMinutes >= startMinutes) {
    // Same day
    totalMinutes = endMinutes - startMinutes;
  } else {
    // Next day (overnight shift)
    totalMinutes = (24 * 60) - startMinutes + endMinutes;
  }
  
  // Validate reasonable work hours (max 24 hours)
  if (totalMinutes > 24 * 60) {
    return { error: 'Work hours exceed 24 hours', totalHours: 0, totalMinutes: 0 };
  }
  
  // Check for negative hours (end before start on same day)
  if (endMinutes < startMinutes && totalMinutes > 12 * 60) {
    return { error: 'End time cannot be before start time', totalHours: 0, totalMinutes: 0 };
  }
  
  return {
    totalHours: totalMinutes / 60,
    totalMinutes,
    isOvernightShift: endMinutes < startMinutes && totalMinutes <= 12 * 60,
    error: null
  };
};

/**
 * Checks if a given time is within work hours
 * @param {string} checkTime - Time to check in HH:MM format
 * @param {string} workStart - Work start time in HH:MM format
 * @param {string} workEnd - Work end time in HH:MM format
 * @returns {boolean} - True if time is within work hours
 */
export const isTimeWithinWorkHours = (checkTime, workStart, workEnd) => {
  const checkMinutes = parseTimeToMinutes(checkTime);
  const startMinutes = parseTimeToMinutes(workStart);
  const endMinutes = parseTimeToMinutes(workEnd);
  
  if (checkMinutes === null || startMinutes === null || endMinutes === null) {
    return false;
  }
  
  if (endMinutes >= startMinutes) {
    // Same day shift
    return checkMinutes >= startMinutes && checkMinutes <= endMinutes;
  } else {
    // Overnight shift
    return checkMinutes >= startMinutes || checkMinutes <= endMinutes;
  }
};

/**
 * Validates work hours data before saving
 * @param {object} workHoursData - Work hours data object
 * @returns {object} - Validation result with isValid and errors
 */
export const validateWorkHoursData = (workHoursData) => {
  const errors = [];
  
  if (!workHoursData) {
    return { isValid: false, errors: ['Work hours data is required'] };
  }
  
  const { startTime, endTime, employeeId, date } = workHoursData;
  
  // Validate required fields
  if (!employeeId) {
    errors.push('Employee ID is required');
  }
  
  if (!date) {
    errors.push('Date is required');
  }
  
  // Validate time formats
  if (!validateTimeFormat(startTime)) {
    errors.push('Start time must be in HH:MM format');
  }
  
  if (!validateTimeFormat(endTime)) {
    errors.push('End time must be in HH:MM format');
  }
  
  // Validate time logic
  if (validateTimeFormat(startTime) && validateTimeFormat(endTime)) {
    const calculation = calculateWorkHours(startTime, endTime);
    if (calculation.error) {
      errors.push(calculation.error);
    }
    
    // Check for reasonable work hours (not more than 16 hours per day)
    if (calculation.totalHours > 16) {
      errors.push('Work hours cannot exceed 16 hours per day');
    }
    
    // Check minimum work hours (at least 1 hour)
    if (calculation.totalHours < 1) {
      errors.push('Work hours must be at least 1 hour');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Formats work hours for display
 * @param {object} workHours - Work hours object
 * @returns {string} - Formatted display string
 */
export const formatWorkHoursDisplay = (workHours) => {
  if (!workHours || !workHours.startTime || !workHours.endTime) {
    return 'Brak godzin pracy';
  }
  
  const calculation = calculateWorkHours(workHours.startTime, workHours.endTime);
  const totalHours = calculation.totalHours.toFixed(1);
  
  let display = `${workHours.startTime} - ${workHours.endTime} (${totalHours}h)`;
  
  if (calculation.isOvernightShift) {
    display += ' [nocna zmiana]';
  }
  
  if (workHours.notes) {
    display += ` - ${workHours.notes}`;
  }
  
  return display;
};

/**
 * Calculates daily pay based on work hours and hourly rate
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @param {number} hourlyRate - Hourly rate in currency
 * @returns {number} - Daily pay amount
 */
export const calculateDailyPay = (startTime, endTime, hourlyRate) => {
  const calculation = calculateWorkHours(startTime, endTime);
  
  if (calculation.error || !hourlyRate || hourlyRate <= 0) {
    return 0;
  }
  
  return calculation.totalHours * hourlyRate;
};

/**
 * Generates time options for dropdowns (every 15 minutes)
 * @returns {Array} - Array of time options
 */
export const generateTimeOptions = () => {
  const times = [];
  
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      times.push({
        label: timeStr,
        value: timeStr
      });
    }
  }
  
  return times;
};

/**
 * Checks if work hours overlap with another set of work hours
 * @param {object} hours1 - First work hours object
 * @param {object} hours2 - Second work hours object
 * @returns {boolean} - True if there's an overlap
 */
export const doWorkHoursOverlap = (hours1, hours2) => {
  if (!hours1 || !hours2 || !hours1.startTime || !hours1.endTime || !hours2.startTime || !hours2.endTime) {
    return false;
  }
  
  // For simplicity, this assumes same-day shifts only
  const start1 = parseTimeToMinutes(hours1.startTime);
  const end1 = parseTimeToMinutes(hours1.endTime);
  const start2 = parseTimeToMinutes(hours2.startTime);
  const end2 = parseTimeToMinutes(hours2.endTime);
  
  if (start1 === null || end1 === null || start2 === null || end2 === null) {
    return false;
  }
  
  // Check for overlap
  return !(end1 <= start2 || end2 <= start1);
};

/**
 * Simple function to get time options array for testing
 * @returns {Array} - Array of time strings
 */
export const getTimeOptions = () => {
  const times = [];
  
  for (let hour = 6; hour <= 22; hour++) {
    const timeStr = `${hour.toString().padStart(2, '0')}:00`;
    times.push(timeStr);
    
    if (hour < 22) { // Don't add 30 minutes for last hour
      const timeStr30 = `${hour.toString().padStart(2, '0')}:30`;
      times.push(timeStr30);
    }
  }
  
  return times;
};