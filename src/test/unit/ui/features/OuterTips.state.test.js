import { describe, test, expect, vi } from 'vitest';
import { OuterTips } from '@js/ui/features/OuterTips';
import { STORAGE_KEYS } from '@js/config';

describe('OuterTips > getCurrentState()', () => {
    let instance;

    beforeEach(() => {
        const elements = {
            toggle: document.createElement('button'),
            welcomeTip: document.createElement('div')
        };
        const classes = { welcomeTipShow: 'show' };
        const messagesProvider = {
            has: () => true,
            getField: () => 0,
            getText: () => 'Test'
        };
        const eventEmitter = { on: vi.fn(), emit: vi.fn() };
        const logger = { log: vi.fn() };

        instance = new OuterTips(elements, classes, messagesProvider, eventEmitter, logger);
    });

    test('должен возвращать актуальное lastChatOpenTime из localStorage', () => {
        const time = Date.now();
        localStorage.setItem(STORAGE_KEYS.UI.OUTER_TIP.LAST_CHAT_OPEN, time.toString());

        const state = instance.getCurrentState();

        expect(state.lastChatOpenTime).toBe(time);
    });

    test('если ключ не установлен, lastChatOpenTime = null', () => {
        localStorage.removeItem(STORAGE_KEYS.UI.OUTER_TIP.LAST_CHAT_OPEN);

        const state = instance.getCurrentState();

        expect(state.lastChatOpenTime).toBeNull();
    });
});