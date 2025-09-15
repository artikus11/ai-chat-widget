import { describe, test, expect } from 'vitest';
import { WelcomeTipDecisionEngine } from '@js/ui/components/WelcomeTipDecisionEngine';
import { STORAGE_KEYS } from '@js/config';

describe('WelcomeTipDecisionEngine > getStorageKey()', () => {
    let engine;
    let messagesProvider;

    beforeEach(() => {
        messagesProvider = {
            has: () => true,
            getField: (type, field, def) => def
        };
        engine = new WelcomeTipDecisionEngine(messagesProvider);
    });

    test('возвращает правильный ключ для welcome', () => {
        expect(engine.getStorageKey('welcome')).toBe(STORAGE_KEYS.UI.WELCOME_TIP.WELCOME_SHOWN);
    });

    test('возвращает правильный ключ для followup', () => {
        expect(engine.getStorageKey('followup')).toBe(STORAGE_KEYS.UI.WELCOME_TIP.FOLLOWUP_SHOWN);
    });

    test('возвращает правильный ключ для returning', () => {
        expect(engine.getStorageKey('returning')).toBe(STORAGE_KEYS.UI.WELCOME_TIP.RETURNING_SHOWN);
    });

    test('возвращает правильный ключ для reconnect', () => {
        expect(engine.getStorageKey('reconnect')).toBe(STORAGE_KEYS.UI.WELCOME_TIP.RECONNECT_SHOWN);
    });

    test('возвращает правильный ключ для active_return', () => {
        expect(engine.getStorageKey('active_return')).toBe(STORAGE_KEYS.UI.WELCOME_TIP.ACTIVE_RETURN_SHOWN);
    });

    test('возвращает null для неизвестного типа', () => {
        expect(engine.getStorageKey('unknown')).toBeNull();
    });
});