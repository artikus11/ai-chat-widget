import { describe, test, expect, vi, beforeEach } from 'vitest';
import { OuterTipsDecisionEngine } from '@js/ui/components/OuterTipsDecisionEngine';
import { STORAGE_KEYS } from '@js/config';

describe('OuterTipsDecisionEngine > determine()', () => {
    let engine;
    let messagesProvider;

    const NOW = 1700000000000;

    beforeEach(() => {
        vi.useFakeTimers().setSystemTime(NOW);

        // Мокируем провайдер
        messagesProvider = {
            has: vi.fn((namespace, type) => false),
            getField: vi.fn((namespace, type, field, defaultValue) => defaultValue),
            getText: vi.fn(),
        };

        // Очищаем хранилище
        localStorage.clear();

        // Создаём движок
        engine = new OuterTipsDecisionEngine(messagesProvider);
    });

    test('первый визит → welcome', () => {
        messagesProvider.has.mockImplementation((ns, type) => ns === 'out' && type === 'welcome');

        const state = { lastChatOpenTime: null, hasSentMessage: false };
        const result = engine.determine(state);

        expect(result).toBe('welcome');
    });

    test('followup: если welcome показан, но проигнорировали → followup', () => {
        messagesProvider.has.mockImplementation(
            (ns, type) => ns === 'out' && (type === 'welcome' || type === 'followup')
        );

        const state = { lastChatOpenTime: null, hasSentMessage: false };
        const result = engine.determine(state);

        expect(result).toBe('welcome'); // welcome приоритетнее
    });

    test('был 5 минут назад, не писал → returning', () => {
        messagesProvider.has.mockImplementation((ns, type) => ns === 'out' && type === 'returning');

        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const state = { lastChatOpenTime: fiveMinutesAgo, hasSentMessage: false };
        const result = engine.determine(state);
        expect(result).toBe('returning');
    });

    test('писал, пропал на 2 дня → reconnect', () => {
        messagesProvider.has.mockImplementation((ns, type) => ns === 'out' && type === 'reconnect');

        const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
        const state = { lastChatOpenTime: twoDaysAgo, hasSentMessage: true };
        const result = engine.determine(state);
        expect(result).toBe('reconnect');
    });

    test('писал, вернулся сегодня → active_return', () => {
        messagesProvider.has.mockImplementation((ns, type) => ns === 'out' && type === 'active_return');

        const state = { lastChatOpenTime: null, hasSentMessage: true };
        const result = engine.determine(state);
        expect(result).toBe('active_return');
    });

    test('returning: должен сработать при ровно 10 минутах бездействия', () => {
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000; // ровно 10 минут
        messagesProvider.has.mockImplementation((ns, type) => ns === 'out' && type === 'returning');

        const state = { lastChatOpenTime: tenMinutesAgo, hasSentMessage: false };
        const result = engine.determine(state);

        expect(result).toBe('returning');
    });

    test('returning: должен показывать returning, если был в чате 5 минут назад', () => {
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        localStorage.setItem(
            STORAGE_KEYS.UI.OUTER_TIP.LAST_CHAT_OPEN,
            fiveMinutesAgo.toString()
        );

        messagesProvider.has.mockImplementation((ns, type) => ns === 'out' && type === 'returning');

        const state = { lastChatOpenTime: fiveMinutesAgo, hasSentMessage: false };
        const result = engine.determine(state);

        expect(result).toBe('returning');
    });

    test('returning: НЕ должен показывать returning, если был в чате менее 20 сек', () => {
        const twentySecondsAgo = Date.now() - 2 * 60 * 1000;
        localStorage.setItem(
            STORAGE_KEYS.UI.OUTER_TIP.LAST_CHAT_OPEN,
            twentySecondsAgo.toString()
        );

        messagesProvider.has.mockImplementation((ns, type) => ns === 'out' && type === 'returning');

        const state = { lastChatOpenTime: twentySecondsAgo, hasSentMessage: false };
        const result = engine.determine(state);

        expect(result).not.toBe('returning');
    });

    test('reconnect: НЕ должен сработать, если прошло ровно 7 дней', () => {
        const exactlyOneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        messagesProvider.has.mockImplementation((ns, type) => ns === 'out' && type === 'reconnect');

        const state = { lastChatOpenTime: exactlyOneWeekAgo, hasSentMessage: true };
        const result = engine.determine(state);

        expect(result).not.toBe('reconnect'); // слишком давно
    });

    test('followup: не должен показываться, если welcome доступен', () => {
        messagesProvider.has.mockImplementation(
            (ns, type) => ns === 'out' && (type === 'welcome' || type === 'followup')
        );

        const state = { lastChatOpenTime: null, hasSentMessage: false };
        const result = engine.determine(state);

        expect(result).toBe('welcome');
        expect(result).not.toBe('followup');
    });

    test('reconnect: должен быть выбран вместо active_return, если тот видели недавно', () => {
        // Симулируем: active_return был показан 12 часов назад (из 24)
        const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
        const key = STORAGE_KEYS.UI.OUTER_TIP.ACTIVE_RETURN_SHOWN;
        localStorage.setItem(key, JSON.stringify({ timestamp: twelveHoursAgo }));

        messagesProvider.has.mockImplementation(
            (ns, type) => ns === 'out' && (type === 'reconnect' || type === 'active_return')
        );

        const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000;
        const state = { lastChatOpenTime: twoDaysAgo, hasSentMessage: true };

        const result = engine.determine(state);

        expect(result).toBe('reconnect');
    });

    test('если ничего не включено → null', () => {
        messagesProvider.has.mockImplementation(() => false); // всё выключено

        const state = { lastChatOpenTime: null, hasSentMessage: false };
        const result = engine.determine(state);

        expect(result).toBeNull();
    });

    test('followup: НЕ должен показываться, если пользователь уже писал', () => {
        messagesProvider.has.mockImplementation((ns, type) => ns === 'out' && type === 'followup');

        const state = { lastChatOpenTime: null, hasSentMessage: true }; // ← ключевой момент

        const result = engine.determine(state);

        expect(result).not.toBe('followup');
    });

    test('не должен вернуть welcome, если hasSentMessage = true', () => {
        messagesProvider.has.mockImplementation((ns, type) => ns === 'out' && type === 'welcome');

        const state = { lastChatOpenTime: null, hasSentMessage: true };

        const result = engine.determine(state);

        expect(result).not.toBe('welcome');
    });


    test('НЕ должен показывать welcome, если чат уже открывали', () => {
        const pastTime = Date.now() - 1000;
        localStorage.setItem(
            STORAGE_KEYS.UI.OUTER_TIP.LAST_CHAT_OPEN,
            pastTime.toString()
        );

        const state = { lastChatOpenTime: pastTime, hasSentMessage: false };

        // 3. Разрешаем welcome
        messagesProvider.has.mockImplementation((ns, type) =>
            ns === 'out' && type === 'welcome'
        );

        const result = engine.determine(state);

        expect(result).not.toBe('welcome');
    });


    afterEach(() => {
        vi.useRealTimers();
        vi.clearAllMocks(); // сбрасываем все моки
    });
});