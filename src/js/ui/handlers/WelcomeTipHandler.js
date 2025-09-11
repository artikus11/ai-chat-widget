import { Utils } from '../utils';
import { Evented } from '../../events/Evented';
import { EVENTS } from '../../events/eventsConfig';

/**
 * Обработчик приглашающей подсказки.
 * Показывает выезжающее сообщение под кнопкой чата через 5 секунд.
 * Анимирует текст как "печатание".
 * Отображается только один раз (через localStorage).
 *
 * @class WelcomeTipHandler
 */
export class WelcomeTipHandler extends Evented {
    /**
     * Создаёт экземпляр WelcomeTipHandler.
     *
     * @param {HTMLElement} toggleButton - Кнопка открытия чата
     * @param {HTMLElement} tipElement - Элемент с текстом подсказки
     * @param {Object} options - Настройки
     */
    constructor(toggleButton, tipElement, options = {}) {
        super();

        this.toggleButton = toggleButton;
        this.tipElement = tipElement;

        this.options = {
            delay: 5000,
            duration: 4000,
            storageKey: 'aiChatWelcomeShown',
            message: 'Готов помочь! Нажмите, чтобы начать',
            ...options,
        };

        this.isShown = false;
        this.animation = null;
        this.showTimeout = null;
        this.hideTimeout = null;

        //this.emitter = new EventEmitter();

        this.bindEvents();
    }

    start() {
        if (this.hasAlreadySeen() || !this.canShow()) {
            return;
        }

        this.showTimeout = setTimeout(() => {
            if (!this.canShow()) {
                return;
            }
            this.show();
            this.scheduleAutoHide();
        }, this.options.delay);
    }

    show() {
        if (this.isShown) {
            return;
        }

        this.tipElement.textContent = '';
        this.tipElement.classList.add('show');

        this.animation = Utils.animateTyping(this.options.message);

        this.animation.on(EVENTS.UI.TYPING_UPDATE, text => {
            this.tipElement.textContent = text;
        });

        this.isShown = true;

        this.emit(EVENTS.UI.WELCOME_TIP_SHOW);
    }

    hide() {
        if (!this.isShown) {
            return;
        }

        if (this.animation) {
            this.animation.stop();
            this.animation = null;
        }

        this.tipElement.classList.remove('show');
        this.isShown = false;

        clearTimeout(this.hideTimeout);

        this.unbindEvents();
        this.emit(EVENTS.UI.WELCOME_TIP_HIDE);
    }

    scheduleAutoHide() {
        this.hideTimeout = setTimeout(() => {
            this.hide();
        }, this.options.duration);
    }

    bindEvents() {
        this._hideHandler = () => this.hide();

        this.toggleButton.addEventListener('click', this._hideHandler);
        this.toggleButton.addEventListener('mouseenter', this._hideHandler);
    }

    unbindEvents() {
        if (this._hideHandler) {
            this.toggleButton.removeEventListener('click', this._hideHandler);
            this.toggleButton.removeEventListener(
                'mouseenter',
                this._hideHandler
            );
            this._hideHandler = null;
        }
    }

    hasAlreadySeen() {
        return localStorage.getItem(this.options.storageKey) === 'true';
    }

    canShow() {
        return (
            this.toggleButton &&
            this.tipElement &&
            document.body.contains(this.toggleButton)
        );
    }

    destroy() {
        this.hide();
        clearTimeout(this.showTimeout);
        this.emit(EVENTS.UI.WELCOME_TIP_DESTROY);
    }
}
