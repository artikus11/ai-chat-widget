import { Utils } from '../utils';
import { EVENTS } from '../../config/events';

/**
 * Обработчик автоприветствия.
 * Отвечает за показ приветственного сообщения с анимацией печати
 * и отправку follow-up сообщения при определённых условиях.
 *
 * @class AutoGreetingHandler
 */
export class AutoGreetingHandler {
    /**
     * Создаёт экземпляр AutoGreetingHandler.
     *
     * @param {Object} ui - Экземпляр UI для управления интерфейсом чата.
     * @param {Object} messagesProvider - Провайдер текстов и задержек.
     * @param {HTMLElement} messagesContainer - DOM-элемент, куда добавляются сообщения.
     */
    constructor(ui, messagesProvider, messagesContainer, eventEmitter, logger) {
        this.ui = ui;
        this.messagesProvider = messagesProvider;
        this.eventEmitter = eventEmitter;
        this.logger = logger;

        this.messagesContainer = messagesContainer;

        this.hasGreeted = false;
        this.hasFollowedUp = false;
        this.greetingTimer = null;
        this.followupTimer = null;
    }

    /**
     * Запускает логику автоприветствия:
     * - блокирует форму ввода
     * - показывает "оператор печатает..." с анимацией
     * - после завершения — разблокирует форму
     * - планирует follow-up сообщение (если применимо)
     *
     * Если приветствие уже было показано — ничего не делает.
     */
    start() {
        if (this.hasGreeted) {
            return;
        }

        if (!this.isContainerConnected()) {
            return;
        }

        this.startGreeting();
        this.scheduleFollowUp();
    }

    /**
     * Начинает последовательность приветствия:
     * - блокирует форму
     * - через задержку запускает анимацию печати
     *
     * @private
     */
    startGreeting() {
        this.ui.disabledForm();

        this.greetingTimer = setTimeout(() => {
            if (!this.isContainerConnected() || this.hasGreeted) {
                this.ui.enableForm();
                return;
            }

            const greetingText = this.messagesProvider.getText('greeting');

            if (greetingText) {
                this.animateTyping(greetingText);
            }
        }, this.messagesProvider.getDelay('greeting'));
    }

    /**
     * Планирует отправку follow-up сообщения, если:
     * - оно не было отправлено
     * - в чате меньше 3 сообщений
     *
     * @private
     */
    scheduleFollowUp() {
        this.followupTimer = setTimeout(() => {
            if (!this.isContainerConnected() || this.hasFollowedUp) {
                return;
            }

            if (this.getMessageCount() >= 3) {
                return;
            }

            const followupText = this.messagesProvider.getText('followup');

            if (followupText) {
                this.animateTyping(followupText);
            }
        }, this.messagesProvider.getDelay('followup'));
    }

    /**
     * Анимирует появление текста по буквам в индикаторе "печатает".
     *
     * @param {string} text - Текст для анимации.
     * @param {number} speed - Скорость анимации.
     * @private
     */
    animateTyping(text, speed = 40) {
        this.ui.showTyping();

        const animation = Utils.animateTyping(text, {
            speed,
            scrollToBottom: true,
            scrollContainer: this.messagesContainer,
        });

        animation.on(EVENTS.UI.TYPING_UPDATE, currentText => {
            this.ui.updateTyping(currentText);
        });

        animation.on(EVENTS.UI.TYPING_FINISH, () => {
            this.ui.finalizeTypingAsMessage();
            this.ui.enableForm();
            this.hasGreeted = true;
        });

        this.currentAnimation = animation;
    }

    /**
     * Останавливает все активные таймеры.
     * Не сбрасывает флаги состояния.
     *
     * Используй, если нужно временно приостановить автоприветствие.
     */
    cancel() {
        if (this.greetingTimer) {
            clearTimeout(this.greetingTimer);
            this.greetingTimer = null;
        }
        if (this.followupTimer) {
            clearTimeout(this.followupTimer);
            this.followupTimer = null;
        }
    }

    /**
     * Полностью сбрасывает состояние автоприветствия:
     * - останавливает таймеры
     * - сбрасывает флаги hasGreeted и hasFollowedUp
     *
     * Используй при перезапуске чата или его уничтожении.
     */
    reset() {
        this.cancel();
        this.hasGreeted = false;
        this.hasFollowedUp = false;
    }

    /**
     * Проверяет, подключён ли контейнер сообщений к DOM.
     *
     * @private
     * @returns {boolean}
     */
    isContainerConnected() {
        return this.messagesContainer?.isConnected === true;
    }

    /**
     * Возвращает количество сообщений в контейнере.
     *
     * @private
     * @returns {number}
     */
    getMessageCount() {
        return this.messagesContainer?.children?.length || 0;
    }
}
