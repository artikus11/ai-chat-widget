import { describe, test, expect, vi } from 'vitest';
import Logger from '@js/utils/Logger';

describe('Logger', () => {
    let logger;

    // Очищаем перед каждым тестом
    beforeEach(() => {
        logger = new Logger();
        vi.clearAllMocks();
    });

    describe('Конструктор', () => {
        test('должен добавить стандартные обработчики для warn, error, log, debug', () => {
            expect(logger.handlers.log.length).toBe(1);
            expect(logger.handlers.warn.length).toBe(1);
            expect(logger.handlers.error.length).toBe(1);
            expect(logger.handlers.debug.length).toBe(1);
        });
    });

    describe('addHandler', () => {
        test('должен добавить обработчик в указанный уровень', () => {
            const mockHandler = vi.fn();
            logger.addHandler('warn', mockHandler);

            expect(logger.handlers.warn).toContain(mockHandler);
        });

        test('не должен добавлять обработчик в несуществующий уровень', () => {
            const mockHandler = vi.fn();
            logger.addHandler('unknown', mockHandler);

            expect(logger.handlers.unknown).toBeUndefined();
        });
    });

    describe('removeHandler', () => {
        test('должен удалить обработчик из уровня', () => {
            const mockHandler = vi.fn();
            logger.addHandler('log', mockHandler);
            expect(logger.handlers.log).toContain(mockHandler);

            logger.removeHandler('log', mockHandler);
            expect(logger.handlers.log).not.toContain(mockHandler);
        });

        test('не должен падать, если уровень не существует', () => {
            expect(() => {
                logger.removeHandler('unknown', () => { });
            }).not.toThrow();
        });
    });

    describe('log(level, message)', () => {
        test('должен вызывать все обработчики указанного уровня', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            logger.addHandler('warn', handler1);
            logger.addHandler('warn', handler2);

            logger.log('warn', 'Предупреждение', 42);

            expect(handler1).toHaveBeenCalledWith('Предупреждение', 42);
            expect(handler2).toHaveBeenCalledWith('Предупреждение', 42);
        });

        test('не должен вызывать обработчики, если уровень не найден', () => {
            const mockHandler = vi.fn();
            logger.addHandler('log', mockHandler);

            logger.log('unknown', 'Тест');
            expect(mockHandler).not.toHaveBeenCalled();
        });
    });

    describe('Сокращённые методы', () => {
        test('info(...) вызывает log("log", ...)', () => {
            const spy = vi.spyOn(logger, 'log');
            logger.info('Hello');

            expect(spy).toHaveBeenCalledWith('log', 'Hello');
            spy.mockRestore();
        });

        test('warn(...) вызывает log("warn", ...)', () => {
            const spy = vi.spyOn(logger, 'log');
            logger.warn('Внимание!');

            expect(spy).toHaveBeenCalledWith('warn', 'Внимание!');
            spy.mockRestore();
        });

        test('error(...) вызывает log("error", ...)', () => {
            const spy = vi.spyOn(logger, 'log');
            logger.error('Ошибка');

            expect(spy).toHaveBeenCalledWith('error', 'Ошибка');
            spy.mockRestore();
        });

        test('debug(...) вызывает log("debug", ...)', () => {
            const spy = vi.spyOn(logger, 'log');
            logger.debug('Отладка');

            expect(spy).toHaveBeenCalledWith('debug', 'Отладка');
            spy.mockRestore();
        });

        test('debug(...) цветной лог log("debug", ...)', () => {
            const consoleSpy = vi.spyOn(console, 'log');

            logger.debug('Цветная отладка');

            expect(consoleSpy).toHaveBeenCalledWith(
                '%cDEBUG',
                'color: #1E90FF; font-weight: bold',
                'Цветная отладка'
            );

            consoleSpy.mockRestore();
        });
    });
});