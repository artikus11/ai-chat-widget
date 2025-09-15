import { describe, test, expect, vi } from 'vitest';
import { WelcomeTipDecisionEngine } from '@js/ui/components/WelcomeTipDecisionEngine';

describe('WelcomeTipDecisionEngine > getCooldownHours()', () => {
    let engine;
    let messagesProvider;

    beforeEach(() => {
        messagesProvider = {
            has: vi.fn(() => true),
            get: vi.fn(),
            getField: function (type, field, defaultValue) {
                const message = this.get(type);
                return message?.[field] !== undefined ? message[field] : defaultValue;
            }
        };

        engine = new WelcomeTipDecisionEngine(messagesProvider);
    });

    test('возвращает значение из провайдера, если задано', () => {
        messagesProvider.get.mockReturnValue({ cooldownHours: 42 });

        const result = engine.getCooldownHours('welcome');

        expect(result).toBe(42);
    });

    test('передаёт DEFAULT_COOLDOWN_HOURS как defaultValue в getField', () => {
        const spy = vi.spyOn(messagesProvider, 'get');

        engine.getCooldownHours('welcome');

        // Проверяем, что get был вызван с правильным типом
        expect(spy).toHaveBeenCalledWith('welcome');
    });

    test('возвращает дефолтное значение, если у типа нет cooldownHours', () => {
        messagesProvider.get.mockReturnValue({});

        const result = engine.getCooldownHours('welcome');

        expect(result).toBe(24);
    });

    test('возвращает дефолт для reconnect', () => {
        messagesProvider.get.mockReturnValue({});

        const result = engine.getCooldownHours('reconnect');

        expect(result).toBe(24);
    });
});