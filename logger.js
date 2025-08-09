class Logger {
    static levels = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3,
        CRITICAL: 4
    };

    static currentLevel = Logger.levels.INFO;
    static logs = [];
    static maxLogs = 1000;
    static listeners = new Set();

    static setLevel(level) {
        if (typeof level === 'string') {
            this.currentLevel = this.levels[level.toUpperCase()] || this.levels.INFO;
        } else {
            this.currentLevel = level;
        }
    }

    static log(level, message, data = null) {
        if (level < this.currentLevel) return;

        const logEntry = {
            timestamp: new Date().toISOString(),
            level: Object.keys(this.levels).find(key => this.levels[key] === level),
            message,
            data,
            stack: level >= this.levels.ERROR ? new Error().stack : undefined
        };

        this.logs.push(logEntry);
        
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        if (AppConfig.logging.console) {
            this.consoleOutput(logEntry);
        }

        if (AppConfig.logging.remote) {
            this.remoteLog(logEntry);
        }

        this.notifyListeners(logEntry);
        
        if (level >= this.levels.ERROR) {
            this.handleError(logEntry);
        }
    }

    static debug(message, data) {
        this.log(this.levels.DEBUG, message, data);
    }

    static info(message, data) {
        this.log(this.levels.INFO, message, data);
    }

    static warn(message, data) {
        this.log(this.levels.WARN, message, data);
    }

    static error(message, data) {
        this.log(this.levels.ERROR, message, data);
    }

    static critical(message, data) {
        this.log(this.levels.CRITICAL, message, data);
    }

    static consoleOutput(logEntry) {
        const style = {
            DEBUG: 'color: #888',
            INFO: 'color: #2563eb',
            WARN: 'color: #f59e0b',
            ERROR: 'color: #ef4444',
            CRITICAL: 'color: #fff; background: #ef4444; padding: 2px 4px'
        };

        const method = logEntry.level === 'ERROR' || logEntry.level === 'CRITICAL' ? 'error' :
                       logEntry.level === 'WARN' ? 'warn' : 'log';

        console[method](
            `%c[${logEntry.timestamp}] [${logEntry.level}] ${logEntry.message}`,
            style[logEntry.level],
            logEntry.data || ''
        );
    }

    static async remoteLog(logEntry) {
        if (!AppConfig.logging.remoteUrl) return;

        try {
            await fetch(AppConfig.logging.remoteUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(logEntry)
            });
        } catch (error) {
            console.error('Failed to send remote log:', error);
        }
    }

    static handleError(logEntry) {
        const errorReport = {
            ...logEntry,
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };

        if (window.localStorage) {
            const errors = JSON.parse(localStorage.getItem('error_reports') || '[]');
            errors.push(errorReport);
            if (errors.length > 50) errors.shift();
            localStorage.setItem('error_reports', JSON.stringify(errors));
        }
    }

    static addListener(callback) {
        this.listeners.add(callback);
    }

    static removeListener(callback) {
        this.listeners.delete(callback);
    }

    static notifyListeners(logEntry) {
        this.listeners.forEach(callback => {
            try {
                callback(logEntry);
            } catch (error) {
                console.error('Log listener error:', error);
            }
        });
    }

    static getLogs(level = null, limit = 100) {
        let filtered = level ? this.logs.filter(log => log.level === level) : this.logs;
        return filtered.slice(-limit);
    }

    static clearLogs() {
        this.logs = [];
    }

    static exportLogs() {
        const blob = new Blob([JSON.stringify(this.logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${new Date().toISOString()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

class ErrorHandler {
    static init() {
        window.addEventListener('error', this.handleGlobalError.bind(this));
        window.addEventListener('unhandledrejection', this.handlePromiseRejection.bind(this));
    }

    static handleGlobalError(event) {
        Logger.error('Global error caught', {
            message: event.message,
            source: event.filename,
            line: event.lineno,
            column: event.colno,
            error: event.error
        });

        if (AppConfig.app.environment === 'production') {
            event.preventDefault();
            this.showUserFriendlyError();
        }
    }

    static handlePromiseRejection(event) {
        Logger.error('Unhandled promise rejection', {
            reason: event.reason,
            promise: event.promise
        });

        if (AppConfig.app.environment === 'production') {
            event.preventDefault();
        }
    }

    static showUserFriendlyError() {
        const notification = document.createElement('div');
        notification.className = 'error-notification';
        notification.textContent = 'An error occurred. The issue has been logged.';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

ErrorHandler.init();