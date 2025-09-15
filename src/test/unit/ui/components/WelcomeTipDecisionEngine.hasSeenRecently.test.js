// src/test/unit/ui/components/WelcomeTipDecisionEngine.hasSeenRecently.test.js
import { describe, test, expect, vi } from 'vitest';
import { WelcomeTipDecisionEngine } from '@js/ui/components/WelcomeTipDecisionEngine';
import { STORAGE_KEYS } from '@js/config';

const NOW = 1700000000000;

describe('WelcomeTipDecisionEngine > hasSeenRecently()', () => {
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

    test('возвращает true, если видели 6 часов назад (меньше 24)', () => {
        const sixHoursAgo = NOW - 6 * 60 * 60 * 1000;
        const key = STORAGE_KEYS.UI.WELCOME_TIP.ACTIVE_RETURN_SHOWN;
        localStorage.setItem(key, JSON.stringify({ timestamp: sixHoursAgo }));

        const result = engine.hasSeenRecently('active_return', 24);

        expect(result).toBe(true);
    });

    test('возвращает false, если видели 30 часов назад (больше 24)', () => {
        const thirtyHoursAgo = NOW - 30 * 60 * 60 * 1000;
        const key = STORAGE_KEYS.UI.WELCOME_TIP.ACTIVE_RETURN_SHOWN;
        localStorage.setItem(key, JSON.stringify({ timestamp: thirtyHoursAgo }));

        const result = engine.hasSeenRecently('active_return', 24);

        expect(result).toBe(false);
    });

    test('возвращает false, если записи нет', () => {
        const result = engine.hasSeenRecently('active_return', 24);
        expect(result).toBe(false);
    });

    test('возвращает true при ошибке парсинга JSON', () => {
        const key = STORAGE_KEYS.UI.WELCOME_TIP.ACTIVE_RETURN_SHOWN;
        localStorage.setItem(key, '{ некорректный JSON');

        const result = engine.hasSeenRecently('active_return', 24);

        expect(result).toBe(true);
    });
});