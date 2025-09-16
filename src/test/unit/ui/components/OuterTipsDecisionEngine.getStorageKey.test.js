import { describe, test, expect } from 'vitest';
import { OuterTipsDecisionEngine } from '@js/ui/components/OuterTipsDecisionEngine';
import { STORAGE_KEYS } from '@js/config';

describe('OuterTipsDecisionEngine > getStorageKey()', () => {
    let engine;
    let messagesProvider;

    beforeEach(() => {
        messagesProvider = {
            has: () => true,
            getField: (type, field, def) => def
        };
        engine = new OuterTipsDecisionEngine(messagesProvider);
    });

    test('возвращает правильный ключ для welcome', () => {
        expect(engine.getStorageKey('welcome')).toBe(STORAGE_KEYS.UI.OUTER_TIP.WELCOME_SHOWN);
    });

    test('возвращает правильный ключ для followup', () => {
        expect(engine.getStorageKey('followup')).toBe(STORAGE_KEYS.UI.OUTER_TIP.FOLLOWUP_SHOWN);
    });

    test('возвращает правильный ключ для returning', () => {
        expect(engine.getStorageKey('returning')).toBe(STORAGE_KEYS.UI.OUTER_TIP.RETURNING_SHOWN);
    });

    test('возвращает правильный ключ для reconnect', () => {
        expect(engine.getStorageKey('reconnect')).toBe(STORAGE_KEYS.UI.OUTER_TIP.RECONNECT_SHOWN);
    });

    test('возвращает правильный ключ для active_return', () => {
        expect(engine.getStorageKey('active_return')).toBe(STORAGE_KEYS.UI.OUTER_TIP.ACTIVE_RETURN_SHOWN);
    });

    test('возвращает null для неизвестного типа', () => {
        expect(engine.getStorageKey('unknown')).toBeNull();
    });
});