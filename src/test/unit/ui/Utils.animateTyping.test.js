import { describe, test, expect, vi } from 'vitest';
import { Utils } from '@js/ui/utils';
import { EVENTS } from '@js/config';

describe('Utils > animateTyping', () => {
    let emitter;

    beforeEach(() => {
        // Очищаем моки
        vi.useFakeTimers();
        vi.spyOn(Utils, 'getRandomSpeed').mockImplementation(speed => speed);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    test('должен эмитить update и finish события по очереди', () => {
        const onUpdate = vi.fn();
        const onFinish = vi.fn();

        const text = 'Hi';
        emitter = Utils.animateTyping(text);

        emitter.on(EVENTS.UI.TYPING_UPDATE, onUpdate);
        emitter.on(EVENTS.UI.TYPING_FINISH, onFinish);

        // Запускаем таймеры
        vi.advanceTimersByTime(40); // первый символ
        expect(onUpdate).toHaveBeenCalledWith('H', 'H', 0);

        vi.advanceTimersByTime(40); // второй символ
        expect(onUpdate).toHaveBeenCalledWith('Hi', 'i', 1);

        vi.advanceTimersByTime(40); // завершение
        expect(onFinish).toHaveBeenCalled();
    });

    test('должен поддерживать кастомную скорость', () => {
        const onUpdate = vi.fn();
        const text = 'A';

        emitter = Utils.animateTyping(text, { speed: 100 });
        emitter.on(EVENTS.UI.TYPING_UPDATE, onUpdate);

        vi.advanceTimersByTime(90);
        expect(onUpdate).not.toHaveBeenCalled();

        vi.advanceTimersByTime(20);
        expect(onUpdate).toHaveBeenCalled();
    });

    test('должен корректно останавливаться через .stop()', () => {
        const onStop = vi.fn();
        const onFinish = vi.fn();
        const onUpdate = vi.fn();

        emitter = Utils.animateTyping('Hello');
        emitter.on(EVENTS.UI.TYPING_STOP, onStop);
        emitter.on(EVENTS.UI.TYPING_FINISH, onFinish);
        emitter.on(EVENTS.UI.TYPING_UPDATE, onUpdate);

        emitter.stop();

        expect(onStop).toHaveBeenCalled();
        expect(onFinish).toHaveBeenCalled();
        expect(onUpdate).toHaveBeenCalled(); // хотя бы частично
    });

    test('должен прокручивать контейнер, если включено scrollToBottom', () => {
        const scrollContainer = document.createElement('div');
        const spy = vi.spyOn(Utils, 'scrollToBottom');

        emitter = Utils.animateTyping('Test', {
            scrollToBottom: true,
            scrollContainer,
        });

        const onUpdate = vi.fn();
        emitter.on(EVENTS.UI.TYPING_UPDATE, onUpdate);

        vi.advanceTimersByTime(50);

        expect(spy).toHaveBeenCalledWith(scrollContainer);
        expect(onUpdate).toHaveBeenCalled();
    });

    test('если текст пустой — должен сразу emit finish', () => {
        const onFinish = vi.fn();
        emitter = Utils.animateTyping('');
        emitter.on(EVENTS.UI.TYPING_FINISH, onFinish);

        vi.advanceTimersByTime(0);

        expect(onFinish).toHaveBeenCalled();
    });
});