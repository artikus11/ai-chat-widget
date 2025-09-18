import { vi } from 'vitest';

/**
 * Создаёт мок engine для тестирования правил.
 * По умолчанию все зависимости замоканы с безопасными значениями.
 *
 * @param {Object} overrides - Перезапись полей: has, storage.wasShown, cooldown.canShow и др.
 * @returns {Object} Мок DecisionEngine
 *
 * @example
 * const engine = createEngineMock({ has: () => true });
 * const engine = createEngineMock({
 *   storage: { wasShown: vi.fn().mockReturnValue(true) }
 * });
 */
export function createEngineMock(overrides = {}) {
    const defaultHelpers = {
        storage: {
            wasShown: vi.fn(() => false),
        },
        cooldown: {
            canShow: vi.fn(() => true),
        },
    };

    const defaultHas = vi.fn((type, category) => {
        // По умолчанию считаем, что сообщения in/greeting, out/welcome, out/followup — есть
        const knownMessages = {
            out: ['welcome', 'followup', 'returning', 'reconnect', 'active_return'],
            in: ['greeting', 'followup', 'fallback', 'error'],
        };
        return knownMessages[category]?.includes(type) ?? false;
    });

    const engine = {
        has: defaultHas,
        helpers: defaultHelpers,
    };

    // Глубокое объединение с возможностью переопределения
    if (overrides.has) {
        engine.has = typeof overrides.has === 'function'
            ? vi.fn(overrides.has)
            : overrides.has;
    }

    if (overrides.helpers?.storage) {
        engine.helpers.storage = {
            ...defaultHelpers.storage,
            ...overrides.helpers.storage,
        };
    }

    if (overrides.helpers?.cooldown) {
        engine.helpers.cooldown = {
            ...defaultHelpers.cooldown,
            ...overrides.helpers.cooldown,
        };
    }

    return engine;
}