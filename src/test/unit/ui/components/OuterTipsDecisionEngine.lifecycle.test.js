// src/test/unit/ui/components/OuterTipsDecisionEngine.lifecycle.test.js
import { describe, test, expect, vi } from 'vitest';
import { OuterTipsDecisionEngine } from '@js/ui/components/OuterTipsDecisionEngine';
import { STORAGE_KEYS } from '@js/config';

const NOW = 1700000000000;

describe('OuterTipsDecisionEngine > Жизненный цикл', () => {
    let engine;
    let messagesProvider;

    beforeEach(() => {
        vi.useFakeTimers().setSystemTime(NOW);

        messagesProvider = {
            has: vi.fn((ns, type) => ['welcome', 'followup'].includes(type)),
            getField: vi.fn((ns, type, field, def) => def),
        };

        localStorage.clear();
        engine = new OuterTipsDecisionEngine(messagesProvider);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('должен показать welcome при первом визите', () => {
        const state = { lastChatOpenTime: null, hasSentMessage: false };
        const result = engine.determine(state);

        expect(result).toBe('welcome');
    });

    test('после показа welcome, canShow(welcome) должен быть false (если прошло <24ч)', () => {
        // Симулируем: welcome был показан 1 час назад
        const oneHourAgo = NOW - 3600000;
        localStorage.setItem(
            STORAGE_KEYS.UI.OUTER_TIP.WELCOME_SHOWN,
            JSON.stringify({ timestamp: new Date(oneHourAgo).toISOString() })
        );

        const result = engine.canShow('welcome');

        // Кулдаун = 24 часа → нельзя показывать
        expect(result).toBe(false);
    });

    test('после welcome, determine() должен вернуть followup', () => {
        // 1. Показали welcome час назад
        const oneHourAgo = NOW - 3600000;
        localStorage.setItem(
            STORAGE_KEYS.UI.OUTER_TIP.WELCOME_SHOWN,
            JSON.stringify({ timestamp: new Date(oneHourAgo).toISOString() })
        );

        // 2. Пользователь всё ещё не открывал чат
        const state = { lastChatOpenTime: null, hasSentMessage: false };

        // 3. Определяем тип
        const result = engine.determine(state);

        // Ожидаем: welcome нельзя показать → fallback на followup
        expect(result).toBe('followup');
    });

    test('не должен показывать welcome повторно в течение 24 часов', () => {
        const oneHourAgo = NOW - 3600000;
        localStorage.setItem(
            STORAGE_KEYS.UI.OUTER_TIP.WELCOME_SHOWN,
            JSON.stringify({ timestamp: new Date(oneHourAgo).toISOString() })
        );

        const state = { lastChatOpenTime: null, hasSentMessage: false };
        const result = engine.determine(state);

        expect(result).not.toBe('welcome');
    });

    test('getCooldownHours для welcome должен быть 24 по умолчанию', () => {
        const result = engine.getCooldownHours('welcome');
        expect(result).toBe(24);
    });
});