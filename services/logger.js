/**
 * Professional Logger Service
 * 
 * Centralized logging system with:
 * - Different log levels (DEBUG, INFO, WARN, ERROR)
 * - Automatic production silencing
 * - Formatted output with timestamps
 * - Context-aware logging
 * 
 * Usage:
 *   import Logger from './services/logger';
 *   Logger.debug('User data:', userData);
 *   Logger.info('Login successful');
 *   Logger.warn('Token expiring soon');
 *   Logger.error('API call failed:', error);
 */

import Constants from 'expo-constants';

// Poziomy logowania
const LOG_LEVELS = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4
};

class LoggerService {
    constructor() {
        // W produkcji tylko ERROR, w development wszystko
        this.currentLevel = __DEV__ 
            ? LOG_LEVELS.DEBUG 
            : LOG_LEVELS.ERROR;
        
        // Możliwość nadpisania przez zmienną środowiskową
        const envLogLevel = Constants.expoConfig?.extra?.logLevel;
        if (envLogLevel && LOG_LEVELS[envLogLevel] !== undefined) {
            this.currentLevel = LOG_LEVELS[envLogLevel];
        }
    }

    /**
     * Formatuje wiadomość z timestampem i kontekstem
     */
    _format(level, message, context) {
        const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
        const contextStr = context ? ` [${context}]` : '';
        return `${timestamp}${contextStr} [${level}]`;
    }

    /**
     * Sprawdza czy dany poziom powinien być logowany
     */
    _shouldLog(level) {
        return LOG_LEVELS[level] >= this.currentLevel;
    }

    /**
     * DEBUG - Szczegółowe informacje dla debugowania
     * Tylko w development
     */
    debug(message, ...args) {
        if (this._shouldLog('DEBUG')) {
            console.log(this._format('DEBUG', message), message, ...args);
        }
    }

    /**
     * INFO - Informacje o normalnym przebiegu aplikacji
     */
    info(message, ...args) {
        if (this._shouldLog('INFO')) {
            console.log(this._format('INFO', message), message, ...args);
        }
    }

    /**
     * WARN - Ostrzeżenia (aplikacja działa, ale coś jest nie tak)
     */
    warn(message, ...args) {
        if (this._shouldLog('WARN')) {
            console.warn(this._format('WARN', message), message, ...args);
        }
    }

    /**
     * ERROR - Błędy wymagające uwagi
     */
    error(message, ...args) {
        if (this._shouldLog('ERROR')) {
            // Check if any argument is an auth error that should be silenced
            const hasAuthError = args.some(arg => 
                arg && (arg.isAuthError || arg.isDuringLogout)
            );
            
            if (hasAuthError) {
                // Don't log auth errors - they're handled by authErrorHandler
                return;
            }
            console.error(this._format('ERROR', message), message, ...args);
        }
    }

    /**
     * Grupowanie logów (przydatne dla złożonych operacji)
     */
    group(label, callback) {
        if (this._shouldLog('DEBUG')) {
            console.group(label);
            try {
                callback();
            } finally {
                console.groupEnd();
            }
        } else {
            callback();
        }
    }

    /**
     * Logowanie z kontekstem (np. nazwa komponentu/serwisu)
     */
    withContext(context) {
        return {
            debug: (message, ...args) => {
                if (this._shouldLog('DEBUG')) {
                    console.log(this._format('DEBUG', message, context), message, ...args);
                }
            },
            info: (message, ...args) => {
                if (this._shouldLog('INFO')) {
                    console.log(this._format('INFO', message, context), message, ...args);
                }
            },
            warn: (message, ...args) => {
                if (this._shouldLog('WARN')) {
                    console.warn(this._format('WARN', message, context), message, ...args);
                }
            },
            error: (message, ...args) => {
                if (this._shouldLog('ERROR')) {
                    console.error(this._format('ERROR', message, context), message, ...args);
                }
            }
        };
    }

    /**
     * Zmiana poziomu logowania w runtime (przydatne do debugowania)
     */
    setLevel(level) {
        if (LOG_LEVELS[level] !== undefined) {
            this.currentLevel = LOG_LEVELS[level];
            this.info(`Log level changed to: ${level}`);
        } else {
            this.warn(`Invalid log level: ${level}. Available: DEBUG, INFO, WARN, ERROR, NONE`);
        }
    }

    /**
     * Pobierz aktualny poziom logowania
     */
    getLevel() {
        return Object.keys(LOG_LEVELS).find(key => LOG_LEVELS[key] === this.currentLevel);
    }
}

// Singleton instance
const Logger = new LoggerService();

// Dodaj do globalnego scope dla łatwego debugowania w konsoli
if (__DEV__) {
    global.Logger = Logger;
}

export default Logger;
