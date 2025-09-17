import { vi } from 'vitest';
import Logger from '@js/utils/Logger'; // путь к твоему Logger

/**
 * Создаёт мок-версию экземпляра Logger, где все методы логирования замоканы,
 * но сохраняется оригинальная структура и поведение.
 *
 * @returns {Logger} Замоканный экземпляр Logger
 *
 * @example
 * const logger = createMockLogger();
 * expect(logger.warn).toHaveBeenCalledWith('...');
 */
export function createMockLogger() {
    const logger = new Logger();

    // Заменяем все обработчики на моки
    const mockHandlers = {
        log: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
    };

    // Перенастроить каждый уровень на мок
    Object.keys(mockHandlers).forEach(level => {
        // Удаляем стандартные обработчики (console.log и т.д.)
        logger.handlers[level] = [];

        // Добавляем мок-обработчик
        logger.addHandler(level, (...args) => mockHandlers[level](...args));
    });

    // Добавляем ссылку на моки, чтобы можно было проверять вызовы
    logger.mock = mockHandlers;

    return logger;
}

/**
 * Сбрасывает все моки вызовов в logger.mock.*
 * Вызывай в beforeEach.
 *
 * @param {Logger} logger - Экземпляр от createMockLogger
 */
export function resetMockLogger(logger) {
    if (logger.mock) {
        Object.values(logger.mock).forEach(handler => {
            handler.mockClear();
        });
    }
}

/**
 * Проверяет, было ли залогировано сообщение с определённой подстрокой на любом уровне.
 *
 * @param {Logger} logger - Мок-логгер
 * @param {string} messagePart - Часть ожидаемого сообщения
 * @returns {boolean}
 */
export function hasLogged(logger, messagePart) {
    for (const level of ['log', 'warn', 'error', 'debug']) {
        const calls = logger.mock[level].mock.calls;
        for (const args of calls) {
            if (args.some(arg => String(arg).includes(messagePart))) {
                return true;
            }
        }
    }
    return false;
}

/**
 * Получает все вызовы логгера в виде плоского массива строк.
 *
 * @param {Logger} logger
 * @returns {string[]} Массив всех сообщений как строки
 */
export function getAllLogMessages(logger) {
    const messages = [];
    for (const level of ['log', 'warn', 'error', 'debug']) {
        const calls = logger.mock[level].mock.calls;
        calls.forEach(args => {
            messages.push(...args.map(String));
        });
    }
    return messages;
}