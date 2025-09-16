// src/test/unit/utils/Utils.updateChatHeight.test.js
import { describe, test, expect, vi } from 'vitest';
import { Utils } from '@js/ui/utils';

describe('Utils > updateChatHeight', () => {
    let wrapper;
    let inputForm;
    let textarea;

    beforeEach(() => {
        // Создаём DOM-элементы
        wrapper = document.createElement('div');
        inputForm = document.createElement('div');
        textarea = document.createElement('textarea');

        document.body.append(wrapper, inputForm, textarea);

        // Мокаем getBoundingClientRect
        inputForm.getBoundingClientRect = vi.fn(() => ({ height: 60 }));

        // Мокаем стили
        Object.assign(inputForm.style, {
            position: 'fixed',
            bottom: '0',
            height: '60px'
        });

        // Мокаем глобальные значения
        vi.spyOn(window.screen, 'height', 'get').mockReturnValue(800);
        Object.defineProperty(window, 'innerHeight', {
            value: 768,
            writable: true
        });
    });

    afterEach(() => {
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    test('должен установить высоту wrapper на основе visualViewport при фокусе на textarea', () => {
        const mockVisualViewport = { height: 500 };
        vi.stubGlobal('visualViewport', mockVisualViewport);

        textarea.focus();

        Utils.updateChatHeight({
            wrapper,
            inputForm,
            textarea
        }, 580);

        const expectedHeight = 500 - 60 - 40; // 400
        expect(wrapper.style.maxHeight).toBe(`${expectedHeight}px`);
    });

    test('не должен уменьшать высоту, если клавиатура не открыта (visualViewport близко к screen.height)', () => {
        const mockVisualViewport = { height: 780 };
        vi.stubGlobal('visualViewport', mockVisualViewport);

        textarea.focus();

        Utils.updateChatHeight({
            wrapper,
            inputForm,
            textarea
        }, 580);

        expect(wrapper.style.maxHeight).toBe('580px');
    });

    test('должен использовать originalHeight, если нет фокуса', () => {
        const mockVisualViewport = { height: 500 };
        vi.stubGlobal('visualViewport', mockVisualViewport);

        document.body.focus(); // снимаем фокус

        Utils.updateChatHeight({
            wrapper,
            inputForm,
            textarea
        }, 580);

        expect(wrapper.style.maxHeight).toBe('580px');
    });

    test('должен устанавливать минимальную высоту 200px', () => {
        const mockVisualViewport = { height: 300 };
        vi.stubGlobal('visualViewport', mockVisualViewport);

        textarea.focus();

        Utils.updateChatHeight({
            wrapper,
            inputForm,
            textarea
        }, 580);

        // 300 - 60 - 40 = 200 → min = 200
        expect(wrapper.style.maxHeight).toBe('200px');
    });

    test('если inputForm не задан, использует дефолтную высоту 60px', () => {
        const mockVisualViewport = { height: 400 };
        vi.stubGlobal('visualViewport', mockVisualViewport);

        textarea.focus();

        Utils.updateChatHeight({
            wrapper,
            inputForm: null,
            textarea
        }, 580);

        const expected = 400 - 60 - 40; // 300
        expect(wrapper.style.maxHeight).toBe('300px');
    });

    test('логгирует данные, если установлен logger', () => {
        const logger = { debug: vi.fn() };
        Utils.setLogger(logger);

        const mockVisualViewport = { height: 500 };
        vi.stubGlobal('visualViewport', mockVisualViewport);

        textarea.focus();

        Utils.updateChatHeight({
            wrapper,
            inputForm,
            textarea
        }, 580);

        expect(logger.debug).toHaveBeenCalledWith(
            '[Utils.updateChatHeight]',
            expect.objectContaining({
                finalHeight: 400,
                visualViewportHeight: 500,
                innerHeight: 768,
                isInputFocused: true,
                screenHeight: 800,
                keyboardLikelyOpen: true
            })
        );

        // Проверим, что inputAreaHeight тоже передаётся
        const call = logger.debug.mock.calls[0][1];
        expect(call.inputAreaHeight).toBe(60); // потому что getBoundingClientRect
    });
});