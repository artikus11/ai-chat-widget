import EventEmitter from '@js/events/EventEmitter';
import { EVENTS } from '@js/config';
import { vi } from 'vitest';

/**
 * Предсказуемый мок animateTyping для тестов.
 */
export const Utils = {
    animateTyping: vi.fn().mockImplementation((text, options = {}) => {
        const emitter = new EventEmitter();
        let isStopped = false;

        emitter.stop = vi.fn().mockImplementation(() => {
            if (isStopped) return;
            isStopped = true;
            emitter.emit(EVENTS.UI.TYPING_STOP);
            emitter.emit(EVENTS.UI.TYPING_FINISH);
        });

        emitter.on = vi.fn().mockImplementation(function (event, handler) {
            if (event === EVENTS.UI.TYPING_UPDATE && !isStopped) {
                for (let i = 0; i < text.length; i++) {
                    if (isStopped) break;
                    setTimeout(() => {
                        if (!isStopped) handler(text.slice(0, i + 1), text[i], i);
                    }, i * 10);
                }
            }
            if (event === EVENTS.UI.TYPING_FINISH && !isStopped) {
                setTimeout(() => {
                    if (!isStopped) handler();
                }, text.length * 10 + 1);
            }
            return this;
        });

        return emitter;
    }),
};
