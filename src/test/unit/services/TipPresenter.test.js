// __tests__/services/TipPresenter.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TipPresenter } from '@js/services/TipPresenter';
import { Utils } from '@js/ui/utils';
import { createAnimationMock } from '@test/mocks/ui/animateTypingMock';
import { EVENTS } from '@js/config';


describe('TipPresenter', () => {
    let presenter;
    let logger;
    let animateTypingSpy;
    let mockAnimation;

    const setupDOM = () => {
        document.body.innerHTML = `
            <div id="welcome-tip" class=""></div>
            <button id="toggle-button"></button>
        `;
    };

    const createUI = (classes = { welcomeTipShow: 'show' }) => {
        return {
            elements: {
                welcomeTip: document.getElementById('welcome-tip'),
                toggle: document.getElementById('toggle-button')
            },
            classes
        };
    };

    const createLogger = () => ({
        info: vi.fn(),
        warn: vi.fn()
    });

    beforeEach(() => {
        document.body.innerHTML = `
        <div id="welcome-tip"></div>
        <button id="toggle-button"></button>
    `;

        const elements = {
            welcomeTip: document.getElementById('welcome-tip'),
            toggle: document.getElementById('toggle-button')
        };

        const ui = { elements, classes: { welcomeTipShow: 'show' } };
        logger = createLogger();

        mockAnimation = { on: vi.fn(), stop: vi.fn() };
        animateTypingSpy = vi.spyOn(Utils, 'animateTyping').mockReturnValue(mockAnimation);

        // 🔥 Новый экземпляр каждый раз!
        presenter = new TipPresenter(ui, logger);
    });

    afterEach(() => {
        document.body.innerHTML = '';
        if (animateTypingSpy && animateTypingSpy.mockRestore) {
            animateTypingSpy.mockRestore();
        }
        vi.clearAllMocks();
    });

    describe('Конструктор и инициализация', () => {
        it('должен создать экземпляр и назначить обработчики', () => {
            expect(presenter).toBeInstanceOf(TipPresenter);
            expect(presenter.isShown).toBe(false);
            expect(presenter._hideHandler).toBeTypeOf('function');
            expect(animateTypingSpy).not.toHaveBeenCalled();
            expect(presenter.tipElement).not.toBeNull();
            expect(presenter.toggleButton).not.toBeNull();
        });
    });

    describe('show()', () => {
        it('должен запустить анимацию и добавить класс', () => {
            const text = 'Привет!';
            const onFinished = vi.fn();

            presenter.show(text, onFinished, { type: 'welcome' });

            // Проверяем логирование
            expect(logger.info).toHaveBeenCalledWith('[TipPresenter] Запуск показа подсказки:', text);

            // Проверяем DOM
            expect(presenter.tipElement.classList.contains('show')).toBe(true);
            expect(presenter.tipElement.textContent).toBe('');

            // Проверяем вызов анимации
            expect(animateTypingSpy).toHaveBeenCalledWith(text);

            // Эмулируем событие обновления текста
            const [[updateEvent, updateHandler]] = mockAnimation.on.mock.calls;
            expect(updateEvent).toBe(EVENTS.UI.TYPING_UPDATE);
            updateHandler('П');
            expect(presenter.tipElement.textContent).toBe('П');

            // Эмулируем завершение анимации
            const finishCall = mockAnimation.on.mock.calls.find(([event]) => event === EVENTS.UI.TYPING_FINISH);
            const finishHandler = finishCall ? finishCall[1] : null;
            expect(finishHandler).toBeTypeOf('function');

            finishHandler?.();
            expect(presenter.isShown).toBe(true);
            expect(onFinished).toHaveBeenCalled();
        });

        it('не должен показывать, если уже показано', () => {
            presenter.isShown = true;

            presenter.show('Текст', () => { }, { type: 'followup' });

            expect(logger.info).toHaveBeenCalledWith('[TipPresenter] Подсказка уже показана');
            expect(animateTypingSpy).not.toHaveBeenCalled();
        });

        it('не должен показывать, если элементы не в DOM', () => {
            // Удаляем DOM
            document.body.innerHTML = '';

            presenter.show('Текст', () => { });

            expect(logger.warn).toHaveBeenCalledWith(
                '[TipPresenter] Невозможно показать: элементы не найдены'
            );
            expect(animateTypingSpy).not.toHaveBeenCalled();
        });
    });

    describe('hide()', () => {
        it('должен скрыть подсказку и остановить анимацию', () => {
            presenter.isShown = true;
            presenter.animation = mockAnimation;

            presenter.hide();

            expect(presenter.tipElement.classList.contains('show')).toBe(false);
            expect(mockAnimation.stop).toHaveBeenCalled();
            expect(presenter.isShown).toBe(false);
            expect(presenter.animation).toBeNull();
            expect(logger.info).toHaveBeenCalledWith('[TipPresenter] Подсказка скрыта');
        });

        it('должен удалять обработчик клика после hide()', () => {
            presenter.isShown = true;
            presenter.tipElement.classList.add('show');

            // Первый клик
            presenter.toggleButton.click();
            expect(presenter.isShown).toBe(false);
            expect(presenter.tipElement.classList.contains('show')).toBe(false);

            // Сохраняем количество логов
            const logCount = logger.info.mock.calls.length;

            // Второй клик
            presenter.toggleButton.click();

            // Логов не должно быть больше
            expect(logger.info.mock.calls.length).toBe(logCount);
        });

        it('не должен делать ничего, если подсказка не показана', () => {
            const initialText = presenter.tipElement.textContent;
            const isShownBefore = presenter.isShown;

            presenter.hide();

            expect(presenter.isShown).toBe(false);
            expect(presenter.tipElement.textContent).toBe(initialText);
            expect(mockAnimation.stop).not.toHaveBeenCalled();
            expect(logger.info).not.toHaveBeenCalledWith('[TipPresenter] Подсказка скрыта');
            expect(presenter.animation).toBeNull();
            expect(isShownBefore).toBe(false);
        });
    });

    describe('Обработчик клика', () => {
        it('должен скрывать подсказку при клике на кнопку чата', () => {
            presenter.isShown = true;
            const hideSpy = vi.spyOn(presenter, 'hide');

            presenter.toggleButton.click();

            expect(hideSpy).toHaveBeenCalled();
        });
    });

    describe('canRender()', () => {
        it('должен возвращать true, если элементы в DOM', () => {
            expect(presenter.canRender()).toBe(true);
        });

        it('должен возвращать false, если элементы удалены из DOM', () => {
            document.body.innerHTML = '';
            expect(presenter.canRender()).toBe(false);
        });
    });

    describe('destroy()', () => {
        it('должен вызвать hide() и очистить состояние', () => {
            const hideSpy = vi.spyOn(presenter, 'hide');
            presenter.destroy();
            expect(hideSpy).toHaveBeenCalled();
        });
    });
});