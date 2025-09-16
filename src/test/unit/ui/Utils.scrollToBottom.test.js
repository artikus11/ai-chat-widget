import { describe, test, expect, vi } from 'vitest';
import { Utils } from '@js/ui/utils';

describe('Utils > scrollToBottom', () => {
    beforeEach(() => {
        // Очищаем моки
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('должен установить scrollTop равным scrollHeight', () => {
        const element = {
            scrollHeight: 1000,
            scrollTop: 0
        };

        Utils.scrollToBottom(element);

        vi.runAllTimers(); // requestAnimationFrame

        expect(element.scrollTop).toBe(1000);
    });

    test('не должен запускать анимацию дважды для одного элемента', () => {
        const element = { scrollHeight: 1000, scrollTop: 0 };
        const rafSpy = vi.spyOn(global, 'requestAnimationFrame');

        Utils.scrollToBottom(element);
        Utils.scrollToBottom(element); // повторный вызов

        expect(rafSpy).toHaveBeenCalledTimes(1);
    });
});