/**
 * Универсальный логгер с поддержкой разных уровней и обработчиков.
 */
export default class Logger {
    constructor() {
        this.handlers = {
            log: [],
            warn: [],
            error: [],
            debug: [],
        };

        // Обработчик по умолчанию — вывод в консоль
        this.addHandler('warn', console.warn.bind(console));
        this.addHandler('error', console.error.bind(console));
        this.addHandler('log', console.log.bind(console));
        // debug — по умолчанию ничего, можно включить
    }

    /**
     * Добавить обработчик для уровня логирования.
     * @param {'log'|'warn'|'error'|'debug'} level
     * @param {Function} handler
     */
    addHandler(level, handler) {
        if (this.handlers[level]) {
            this.handlers[level].push(handler);
        }
    }

    /**
     * Удалить обработчик.
     * @param {'log'|'warn'|'error'|'debug'} level
     * @param {Function} handler
     */
    removeHandler(level, handler) {
        if (this.handlers[level]) {
            this.handlers[level] = this.handlers[level].filter(h => h !== handler);
        }
    }

    /**
     * Логировать сообщение.
     * @param {'log'|'warn'|'error'|'debug'} level
     * @param {any} message
     * @param {...any} args
     */
    log(level, message, ...args) {
        const handlers = this.handlers[level] || [];
        handlers.forEach(handler => {
            handler(message, ...args);
        });
    }

    // Удобные сокращения
    info(msg, ...args) {
        this.log('log', msg, ...args);
    }
    warn(msg, ...args) {
        this.log('warn', msg, ...args);
    }
    error(msg, ...args) {
        this.log('error', msg, ...args);
    }
    debug(msg, ...args) {
        this.log('debug', msg, ...args);
    }
}
