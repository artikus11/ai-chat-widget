import Logger from './Logger.js';

/**
 * Универсальный резолвер логгера для использования в разных классах/модулях.
 * @param {Object} options - Опции конфигурации (например, debug, logger и т.д.)
 * @returns {Logger} Экземпляр логгера
 */
export default function resolveLogger(options = {}, defaultLevel = 'silent') {
    if (options.logger) {
        return options.logger;
    }

    const logger = new Logger();

    if (options.debug) {
        logger.debug(`[Logger] Debug mode active`);
        return logger;
    }

    if (defaultLevel === 'silent') {
        Object.keys(logger.handlers).forEach(level => {
            logger.handlers[level] = [];
        });
    }

    return logger;
}
