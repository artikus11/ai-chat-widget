// src/test/unit/services/UserActivityMonitor.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UserActivityMonitor } from '@js/services/UserActivityMonitor';
import { EVENTS } from '@js/config';

// Моки
const createEventEmitter = () => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
});

const createUserActivityStorage = () => ({
    markChatOpen: vi.fn(),
    markChatClose: vi.fn(),
    markMessageSent: vi.fn(),
    markLastMessageSent: vi.fn(),
    getLastChatOpenTime: vi.fn().mockReturnValue(null),
    getLastMessageSentTime: vi.fn().mockReturnValue(null),
    hasSentMessage: vi.fn().mockReturnValue(false),
});

const createLogger = () => ({
    info: vi.fn(),
    warn: vi.fn(),
});

describe('UserActivityMonitor', () => {
    let monitor;
    let eventEmitter;
    let storage;
    let logger;

    // Для отслеживания спайов
    let addSpy;
    let removeSpy;
    let windowAddSpy;
    let windowRemoveSpy;

    beforeEach(() => {
        eventEmitter = createEventEmitter();
        storage = createUserActivityStorage();
        logger = createLogger();

        // Мокаем через spyOn — сохраняем оригинальное поведение
        addSpy = vi.spyOn(document, 'addEventListener');
        removeSpy = vi.spyOn(document, 'removeEventListener');
        windowAddSpy = vi.spyOn(window, 'addEventListener');
        windowRemoveSpy = vi.spyOn(window, 'removeEventListener');

        monitor = new UserActivityMonitor(eventEmitter, storage, logger);
    });

    afterEach(() => {
        // Восстанавливаем оригинальные методы
        addSpy?.mockRestore();
        removeSpy?.mockRestore();
        windowAddSpy?.mockRestore();
        windowRemoveSpy?.mockRestore();

        vi.clearAllMocks();
    });

    describe('start()', () => {
        it('должен подписаться на события при первом запуске', () => {
            monitor.start();

            expect(eventEmitter.on).toHaveBeenCalledWith(EVENTS.UI.CHAT_OPEN, expect.any(Function));
            expect(eventEmitter.on).toHaveBeenCalledWith(EVENTS.UI.CHAT_CLOSE, expect.any(Function));
            expect(eventEmitter.on).toHaveBeenCalledWith(EVENTS.UI.MESSAGE_SENT, expect.any(Function));

            expect(addSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
            expect(windowAddSpy).toHaveBeenCalledWith('focus', expect.any(Function));

            expect(logger.info).toHaveBeenCalledWith('[UserActivityMonitor] Запущен');
            expect(monitor.isActive).toBe(true);
        });

        it('не должен переподписываться, если уже запущен', () => {
            monitor.start();
            const callCount = eventEmitter.on.mock.calls.length;

            monitor.start();

            expect(eventEmitter.on).toHaveBeenCalledTimes(callCount);
            expect(logger.info).toHaveBeenCalledTimes(1);
        });
    });

    describe('stop()', () => {
        it('должен отписаться от всех событий', () => {
            monitor.start();
            monitor.stop();

            expect(eventEmitter.off).toHaveBeenCalled();
            expect(removeSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
            expect(windowRemoveSpy).toHaveBeenCalledWith('focus', expect.any(Function));

            expect(logger.info).toHaveBeenCalledWith('[UserActivityMonitor] Остановлен');
            expect(monitor.isActive).toBe(false);
        });

        it('не должен ничего делать, если не запущен', () => {
            monitor.stop();
            expect(logger.info).not.toHaveBeenCalledWith('[UserActivityMonitor] Остановлен');
        });
    });

    describe('markChatOpen()', () => {
        it('должен вызвать storage.markChatOpen и залогировать', () => {
            monitor.markChatOpen();

            expect(storage.markChatOpen).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith('[UserActivityMonitor] Чат открыт');
        });

        it('должен логировать ошибку при исключении', () => {
            const error = new Error('Storage failed');
            storage.markChatOpen.mockImplementation(() => { throw error; });

            monitor.markChatOpen();

            expect(logger.warn).toHaveBeenCalledWith(
                '[UserActivityMonitor] Ошибка при сохранении времени открытия чата:',
                error
            );
        });
    });

    describe('markChatClose()', () => {
        it('должен вызвать storage.markChatClose и залогировать', () => {
            monitor.markChatClose();

            expect(storage.markChatClose).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith('[UserActivityMonitor] Чат закрыт');
        });

        it('должен логировать ошибку при исключении', () => {
            const error = new Error('Storage failed');
            storage.markChatClose.mockImplementation(() => { throw error; });

            monitor.markChatClose();

            expect(logger.warn).toHaveBeenCalledWith(
                '[UserActivityMonitor] Ошибка при сохранении времени закрытия чата:',
                error
            );
        });
    });

    describe('markMessageSent()', () => {
        it('должен вызвать storage.markMessageSent и markLastMessageSent', () => {
            monitor.markMessageSent();

            expect(storage.markMessageSent).toHaveBeenCalled();
            expect(storage.markLastMessageSent).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith('[UserActivityMonitor] Сообщение отправлено');
        });

        it('должен логировать ошибку при исключении', () => {
            const error = new Error('Storage failed');
            storage.markMessageSent.mockImplementation(() => { throw error; });

            monitor.markMessageSent();

            expect(logger.warn).toHaveBeenCalledWith(
                '[UserActivityMonitor] Ошибка при сохранении времени отправки:',
                error
            );
        });
    });

    describe('обработчики событий', () => {
        beforeEach(() => {
            monitor.start();
        });

        it('должен реагировать на CHAT_OPEN', () => {
            const calls = eventEmitter.on.mock.calls;
            const handler = calls.find(([event]) => event === EVENTS.UI.CHAT_OPEN)?.[1];
            expect(handler).toBeTypeOf('function');

            handler();
            expect(storage.markChatOpen).toHaveBeenCalled();
        });

        it('должен реагировать на CHAT_CLOSE', () => {
            const calls = eventEmitter.on.mock.calls;
            const handler = calls.find(([event]) => event === EVENTS.UI.CHAT_CLOSE)?.[1];
            expect(handler).toBeTypeOf('function');

            handler();
            expect(storage.markChatClose).toHaveBeenCalled();
        });

        it('должен реагировать на MESSAGE_SENT', () => {
            const calls = eventEmitter.on.mock.calls;
            const handler = calls.find(([event]) => event === EVENTS.UI.MESSAGE_SENT)?.[1];
            expect(handler).toBeTypeOf('function');

            handler();
            expect(storage.markMessageSent).toHaveBeenCalled();
            expect(storage.markLastMessageSent).toHaveBeenCalled();
        });

        it('должен эмитить PAGE_RETURN при visibilitychange → visible', () => {
            const calls = document.addEventListener.mock.calls;
            const handler = calls.find(([event]) => event === 'visibilitychange')?.[1];

            expect(handler).toBeTypeOf('function');

            Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });

            handler();
            expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.UI.PAGE_RETURN);
        });

        it('должен эмитить PAGE_RETURN при focus', () => {
            const calls = window.addEventListener.mock.calls;
            const handler = calls.find(([event]) => event === 'focus')?.[1];

            expect(handler).toBeTypeOf('function');

            handler();
            expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.UI.PAGE_RETURN);
        });
    });

    describe('destroy()', () => {
        it('должен остановить монитор', () => {
            const stopSpy = vi.spyOn(monitor, 'stop');

            monitor.destroy();

            expect(stopSpy).toHaveBeenCalled();
        });
    });

    describe('getters', () => {
        it('getLastChatOpenTime() должен делегировать storage', () => {
            const time = 1234567890;
            storage.getLastChatOpenTime.mockReturnValue(time);

            const result = monitor.getLastChatOpenTime();

            expect(result).toBe(time);
            expect(storage.getLastChatOpenTime).toHaveBeenCalled();
        });

        it('getLastMessageSentTime() должен делегировать storage', () => {
            const time = 1234567890;
            storage.getLastMessageSentTime.mockReturnValue(time);

            const result = monitor.getLastMessageSentTime();

            expect(result).toBe(time);
            expect(storage.getLastMessageSentTime).toHaveBeenCalled();
        });

        it('hasSentMessage() должен делегировать storage', () => {
            storage.hasSentMessage.mockReturnValue(true);

            const result = monitor.hasSentMessage();

            expect(result).toBe(true);
            expect(storage.hasSentMessage).toHaveBeenCalled();
        });
    });
});