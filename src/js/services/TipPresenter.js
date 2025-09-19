// services/TipPresenter.js
import { Utils } from '@js/ui/Utils';
import { EVENTS } from '../config';

/**
 * Класс для управления показом и скрытием внешней подсказки (tip).
 * Отвечает за анимацию, состояние и взаимодействие с DOM.
 *
 * @class TipPresenter
 */
export class TipPresenter {
    /**
     * Управляет DOM-элементом внешней подсказки: показ, скрытие, анимация.
     *
     * @param {UI} ui - Экземпляр UI для доступа к элементам и классам
     * @param {Logger} logger
     */
    constructor(ui, logger) {
        const { elements, classes } = ui;

        this.tipElement = elements.welcomeTip;
        this.toggleButton = elements.toggle;
        this.tipClassShow = classes.welcomeTipShow;

        this.logger = logger;

        this.animation = null;
        this.isShown = false;

        this.bindEvents();
    }

    /**
     * Назначает обработчики DOM-событий.
     *
     * @private
     * @returns {void}
     */
    bindEvents() {
        if (!this.toggleButton) {
            return;
        }

        this._hideHandler = () => {
            this.hide();
        };

        this.toggleButton.addEventListener('click', this._hideHandler);
    }

    /**
     * Удаляет обработчики DOM-событий.
     *
     * @private
     * @returns {void}
     */
    unbindEvents() {
        if (this._hideHandler && this.toggleButton) {
            const handler = this._hideHandler;
            this.toggleButton.removeEventListener('click', handler);

            this._hideHandler = null;
        }
    }
    /**
     * Показывает сообщение с анимацией "печати".
     * @param {string} text
     * @param {Function} onFinished - колбэк после завершения анимации
     */
    show(text, onFinished) {
        if (!this.canRender()) {
            this.logger.warn(
                '[TipPresenter] Невозможно показать: элементы не найдены'
            );
            return;
        }

        if (this.isShown) {
            this.logger.info('[TipPresenter] Подсказка уже показана');
            return;
        }

        // Очистка предыдущего состояния
        this.tipElement.textContent = '';
        this.tipElement.classList.add(this.tipClassShow);

        // Анимация печати
        this.animation = Utils.animateTyping(text);

        this.animation.on(EVENTS.UI.TYPING_UPDATE, typedText => {
            this.tipElement.textContent = typedText;
        });

        this.animation.on(EVENTS.UI.TYPING_FINISH, () => {
            this.isShown = true;
            onFinished?.();
        });

        this.logger.info('[TipPresenter] Запуск показа подсказки:', text);
    }

    /**
     * Скрывает подсказку, останавливает анимацию.
     */
    hide() {
        if (!this.isShown) {
            return;
        }

        if (this.animation?.stop) {
            this.animation.stop();
        }
        this.animation = null;

        this.tipElement.classList.remove(this.tipClassShow);
        this.isShown = false;

        this.unbindEvents();

        this.logger.info('[TipPresenter] Подсказка скрыта');
    }

    /**
     * Проверяет, можно ли рендерить (элементы в DOM).
     */
    canRender() {
        return !!(
            this.tipElement &&
            this.toggleButton &&
            document.body.contains(this.tipElement) &&
            document.body.contains(this.toggleButton)
        );
    }

    /**
     * Полная очистка.
     */
    destroy() {
        this.hide();
        this.unbindEvents();
    }
}
