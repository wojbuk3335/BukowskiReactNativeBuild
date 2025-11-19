/**
 * Tests for Logger Service
 * 
 * Verifies:
 * - Different log levels work correctly
 * - Production mode silences logs
 * - Context-aware logging
 * - Level changes
 */

import Logger from '../../services/logger';

describe('Logger Service', () => {
    let consoleLogSpy;
    let consoleWarnSpy;
    let consoleErrorSpy;
    let consoleGroupSpy;
    let consoleGroupEndSpy;

    beforeEach(() => {
        // Reset logger to DEBUG level first
        Logger.setLevel('DEBUG');
        
        // Then spy on console methods (after setLevel call)
        consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
        consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        consoleGroupSpy = jest.spyOn(console, 'group').mockImplementation();
        consoleGroupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('Basic Logging', () => {
        test('debug() logs in development mode', () => {
            Logger.debug('Debug message', { data: 'test' });
            
            expect(consoleLogSpy).toHaveBeenCalled();
            const callArgs = consoleLogSpy.mock.calls[0];
            expect(callArgs[1]).toBe('Debug message');
            expect(callArgs[2]).toEqual({ data: 'test' });
        });

        test('info() logs informational messages', () => {
            Logger.info('Info message', 123);
            
            expect(consoleLogSpy).toHaveBeenCalled();
            const callArgs = consoleLogSpy.mock.calls[0];
            expect(callArgs[1]).toBe('Info message');
            expect(callArgs[2]).toBe(123);
        });

        test('warn() logs warnings', () => {
            Logger.warn('Warning message', true);
            
            expect(consoleWarnSpy).toHaveBeenCalled();
            const callArgs = consoleWarnSpy.mock.calls[0];
            expect(callArgs[1]).toBe('Warning message');
            expect(callArgs[2]).toBe(true);
        });

        test('error() logs errors', () => {
            const testError = new Error('Test error');
            Logger.error('Error occurred', testError);
            
            expect(consoleErrorSpy).toHaveBeenCalled();
            const callArgs = consoleErrorSpy.mock.calls[0];
            expect(callArgs[1]).toBe('Error occurred');
            expect(callArgs[2]).toBe(testError);
        });

        test('all log methods accept multiple arguments', () => {
            Logger.debug('Message', 'arg1', 'arg2', 'arg3');
            
            expect(consoleLogSpy).toHaveBeenCalled();
            const callArgs = consoleLogSpy.mock.calls[0];
            expect(callArgs).toHaveLength(5); // format + message + 3 args
        });
    });

    describe('Log Levels', () => {
        test('DEBUG level shows all logs', () => {
            Logger.debug('Debug');
            Logger.info('Info');
            Logger.warn('Warn');
            Logger.error('Error');
            
            expect(consoleLogSpy).toHaveBeenCalledTimes(2); // debug + info
            expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        });

        test('INFO level hides DEBUG', () => {
            // Clear previous calls
            consoleLogSpy.mockClear();
            
            Logger.setLevel('INFO'); // This will log "Log level changed to: INFO"
            
            Logger.debug('Debug');
            Logger.info('Info');
            Logger.warn('Warn');
            Logger.error('Error');
            
            // 2 calls: setLevel message + info message
            expect(consoleLogSpy).toHaveBeenCalledTimes(2);
            expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        });

        test('WARN level hides DEBUG and INFO', () => {
            Logger.setLevel('WARN');
            
            Logger.debug('Debug');
            Logger.info('Info');
            Logger.warn('Warn');
            Logger.error('Error');
            
            expect(consoleLogSpy).toHaveBeenCalledTimes(0);
            expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        });

        test('ERROR level only shows errors', () => {
            Logger.setLevel('ERROR');
            
            Logger.debug('Debug');
            Logger.info('Info');
            Logger.warn('Warn');
            Logger.error('Error');
            
            expect(consoleLogSpy).toHaveBeenCalledTimes(0);
            expect(consoleWarnSpy).toHaveBeenCalledTimes(0);
            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
        });

        test('NONE level silences all logs', () => {
            Logger.setLevel('NONE');
            
            Logger.debug('Debug');
            Logger.info('Info');
            Logger.warn('Warn');
            Logger.error('Error');
            
            expect(consoleLogSpy).toHaveBeenCalledTimes(0);
            expect(consoleWarnSpy).toHaveBeenCalledTimes(0);
            expect(consoleErrorSpy).toHaveBeenCalledTimes(0);
        });

        test('getLevel() returns current level', () => {
            Logger.setLevel('WARN');
            expect(Logger.getLevel()).toBe('WARN');
            
            Logger.setLevel('DEBUG');
            expect(Logger.getLevel()).toBe('DEBUG');
        });

        test('setLevel() with invalid level logs warning', () => {
            Logger.setLevel('INVALID');
            
            expect(consoleWarnSpy).toHaveBeenCalled();
            const callArgs = consoleWarnSpy.mock.calls[0];
            expect(callArgs[1]).toContain('Invalid log level');
        });
    });

    describe('Context-Aware Logging', () => {
        test('withContext() adds context to logs', () => {
            const contextLogger = Logger.withContext('TestComponent');
            
            contextLogger.info('Message from component');
            
            expect(consoleLogSpy).toHaveBeenCalled();
            const callArgs = consoleLogSpy.mock.calls[0];
            // Context is in format string (first arg), not message
            expect(callArgs[0]).toContain('[TestComponent]');
        });

        test('withContext() works with all log levels', () => {
            const contextLogger = Logger.withContext('Service');
            
            contextLogger.debug('Debug');
            contextLogger.info('Info');
            contextLogger.warn('Warn');
            contextLogger.error('Error');
            
            expect(consoleLogSpy).toHaveBeenCalledTimes(2); // debug + info
            expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
            expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
            
            // Check context is in format string (first arg)
            expect(consoleLogSpy.mock.calls[0][0]).toContain('[Service]');
            expect(consoleWarnSpy.mock.calls[0][0]).toContain('[Service]');
            expect(consoleErrorSpy.mock.calls[0][0]).toContain('[Service]');
        });

        test('withContext() respects log levels', () => {
            consoleLogSpy.mockClear();
            
            Logger.setLevel('WARN');
            const contextLogger = Logger.withContext('Service');
            
            contextLogger.debug('Debug');
            contextLogger.info('Info');
            contextLogger.warn('Warn');
            
            expect(consoleLogSpy).toHaveBeenCalledTimes(0);
            expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('Grouping', () => {
        test('group() creates console group', () => {
            Logger.group('Test Group', () => {
                Logger.info('Inside group');
            });
            
            expect(consoleGroupSpy).toHaveBeenCalledWith('Test Group');
            expect(consoleGroupEndSpy).toHaveBeenCalled();
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('group() executes callback even at high log level', () => {
            Logger.setLevel('ERROR');
            let executed = false;
            
            Logger.group('Test Group', () => {
                executed = true;
            });
            
            expect(executed).toBe(true);
            expect(consoleGroupSpy).not.toHaveBeenCalled(); // Group not shown at ERROR level
        });

        test('group() ends even if callback throws', () => {
            expect(() => {
                Logger.group('Test Group', () => {
                    throw new Error('Test error');
                });
            }).toThrow('Test error');
            
            expect(consoleGroupSpy).toHaveBeenCalled();
            expect(consoleGroupEndSpy).toHaveBeenCalled();
        });
    });

    describe('Formatting', () => {
        test('log format includes timestamp', () => {
            Logger.info('Test message');
            
            const formatString = consoleLogSpy.mock.calls[0][0];
            // Should match HH:MM:SS format
            expect(formatString).toMatch(/\d{2}:\d{2}:\d{2}/);
        });

        test('log format includes log level', () => {
            Logger.debug('Debug');
            Logger.info('Info');
            Logger.warn('Warn');
            Logger.error('Error');
            
            // Check format string (first arg) contains level
            expect(consoleLogSpy.mock.calls[0][0]).toContain('[DEBUG]');
            expect(consoleLogSpy.mock.calls[1][0]).toContain('[INFO]');
            expect(consoleWarnSpy.mock.calls[0][0]).toContain('[WARN]');
            expect(consoleErrorSpy.mock.calls[0][0]).toContain('[ERROR]');
        });
    });

    describe('Edge Cases', () => {
        test('handles null arguments', () => {
            expect(() => {
                Logger.info('Message', null);
            }).not.toThrow();
            
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('handles undefined arguments', () => {
            expect(() => {
                Logger.info('Message', undefined);
            }).not.toThrow();
            
            expect(consoleLogSpy).toHaveBeenCalled();
        });

        test('handles objects and arrays', () => {
            const obj = { key: 'value' };
            const arr = [1, 2, 3];
            
            Logger.info('Complex data', obj, arr);
            
            expect(consoleLogSpy).toHaveBeenCalled();
            const callArgs = consoleLogSpy.mock.calls[0];
            // Format string, then message, then args
            expect(callArgs[1]).toBe('Complex data');
            expect(callArgs[2]).toEqual(obj);
            expect(callArgs[3]).toEqual(arr);
        });

        test('handles no arguments', () => {
            expect(() => {
                Logger.info();
            }).not.toThrow();
        });
    });
});
