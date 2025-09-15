// src/test/unit/ui/components/WelcomeTipDecisionEngine.canShow.test.js
import { describe, test, expect, vi } from 'vitest';
import { WelcomeTipDecisionEngine } from '@js/ui/components/WelcomeTipDecisionEngine';
import { STORAGE_KEYS } from '@js/config';

const NOW = 1700000000000;

describe('WelcomeTipDecisionEngine > canShow()', () => {
    let engine;
    let messagesProvider;

    beforeEach(() => {
        vi.useFakeTimers().setSystemTime(NOW);

        messagesProvider = {
            has: () => true,
            getField: (type, field, def) => def
        };

        localStorage.clear();
        engine = new WelcomeTipDecisionEngine(messagesProvider);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('разрешает показ, если кулдаун 0', () => {
        vi.spyOn(engine, 'getCooldownHours').mockReturnValue(0);

        const result = engine.canShow('welcome');

        expect(result).toBe(true);
    });

    test('разрешает показ, если нет записи в storage', () => {
        vi.spyOn(engine, 'getCooldownHours').mockReturnValue(24);

        const result = engine.canShow('welcome');

        expect(result).toBe(true);
    });

    test('запрещает показ, если прошло меньше кулдауна', () => {
        const twelveHoursAgo = NOW - 12 * 60 * 60 * 1000;
        const key = STORAGE_KEYS.UI.WELCOME_TIP.WELCOME_SHOWN;
        localStorage.setItem(key, JSON.stringify({ timestamp: twelveHoursAgo }));
        vi.spyOn(engine, 'getCooldownHours').mockReturnValue(24);

        const result = engine.canShow('welcome');

        expect(result).toBe(false);
    });

    test('разрешает показ, если прошло больше кулдауна', () => {
        const thirtyHoursAgo = NOW - 30 * 60 * 60 * 1000;
        const key = STORAGE_KEYS.UI.WELCOME_TIP.WELCOME_SHOWN;
        localStorage.setItem(key, JSON.stringify({ timestamp: thirtyHoursAgo }));
        vi.spyOn(engine, 'getCooldownHours').mockReturnValue(24);

        const result = engine.canShow('welcome');

        expect(result).toBe(true);
    });

    test('игнорирует ошибку парсинга JSON', () => {
        const key = STORAGE_KEYS.UI.WELCOME_TIP.WELCOME_SHOWN;
        localStorage.setItem(key, '{ сломанный JSON');
        vi.spyOn(engine, 'getCooldownHours').mockReturnValue(24);

        const result = engine.canShow('welcome');

        expect(result).toBe(true);
    });
});