import { Utils } from '../utils';
import { EVENTS, STORAGE_KEYS } from '../../config';
import { WelcomeTipDecisionEngine } from '../components/WelcomeTipDecisionEngine';

/**
 * Умный обработчик приглашающего сообщения под кнопкой чата.
 *
 * Отвечает за:
 * - показ/скрытие DOM-элемента
 * - анимацию печати
 * - автоскрытие
 * - реакцию на действия пользователя
 *
 * Логика определения типа вынесена в WelcomeTipDecisionEngine.
 *
 * @class WelcomeTip
 */
export class WelcomeTip {
    static DEFAULT_DURATIONS = {
        welcome: 8000,
        followup: 10000,
        reconnect: 10000,
        active_return: 7000,
        returning: 10000,
    };

    static DEFAULT_DELAY = {
        welcome: 3000,
        followup: 30000,
        reconnect: 8000,
        active_return: 5000,
        returning: 10000,
    };

    constructor(elements, classes, messagesProvider, eventEmitter, logger) {
        this.toggleButton = elements.toggle;
        this.tipElement = elements.welcomeTip;
        this.tipClassShow = classes.welcomeTipShow;

        this.messagesProvider = messagesProvider;
        this.eventEmitter = eventEmitter;
        this.logger = logger;

        // Создаём движок решений
        this.decisionEngine = new WelcomeTipDecisionEngine(messagesProvider);

        this.started = false;
        this.isShown = false;
        this.animation = null;
        this.showTimeout = null;
        this.hideTimeout = null;
        this.followUpTimeout = null;

        this.bindEvents();
        this.listenForUserActivity();
    }

    start() {
        if (this.started) {
            return;
        }
        this.started = true;

        const state = this.getCurrentState();
        const messageType = this.decisionEngine.determine(state);

        this.logger.log('[WELCOME] Определён тип:', messageType);

        if (!messageType || !this.canRender()) {
            return;
        }

        const delay = this.getDelayForType(messageType);

        this.showTimeout = setTimeout(() => {
            if (this.canRender() && !this.isShown) {
                this.showMessage(messageType);
                this.scheduleAutoHide(messageType);

                if (messageType === 'welcome') {
                    this.scheduleFollowUpReminder();
                }
            }
        }, delay);
    }

    getCurrentState() {
        return {
            lastChatOpenTime: this.getLastChatOpenTime(),
            hasSentMessage: this.hasUserSentMessage(),
        };
    }

    getDelayForType(type) {
        return this.messagesProvider.getField(
            type,
            'delay',
            WelcomeTip.DEFAULT_DELAY[type]
        );
    }

    getDurationForType(type) {
        return this.messagesProvider.getField(
            type,
            'duration',
            WelcomeTip.DEFAULT_DURATIONS[type]
        );
    }

    getLastChatOpenTime() {
        const raw = localStorage.getItem(
            STORAGE_KEYS.UI.WELCOME_TIP.LAST_CHAT_OPEN
        );
        return raw ? parseInt(raw, 10) : null;
    }

    hasUserSentMessage() {
        return (
            localStorage.getItem(STORAGE_KEYS.UI.WELCOME_TIP.MESSAGE_SENT) ===
            'true'
        );
    }

    showMessage(type) {
        if (this.isShown) {
            return;
        }

        const text = this.messagesProvider.getText(type);
        this.tipElement.textContent = '';
        this.tipElement.classList.add(this.tipClassShow);

        this.animation = Utils.animateTyping(text);

        this.animation.on(EVENTS.UI.TYPING_UPDATE, typedText => {
            this.tipElement.textContent = typedText;
        });

        this.animation.on(EVENTS.UI.TYPING_FINISH, () => {
            this.eventEmitter.emit(EVENTS.UI.WELCOME_TIP_SHOW, { type });
        });

        this.markAsShown(type);
        this.isShown = true;
    }

    showMessageByType(type) {
        if (
            !this.messagesProvider.has(type) ||
            !this.decisionEngine.canShow(type)
        ) {
            return;
        }

        this.logger.log('[WELCOME] Принудительный показ:', type);

        this.showMessage(type);
        this.scheduleAutoHide(type);
        this.markAsShown(type);
    }

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

        clearTimeout(this.hideTimeout);

        this.unbindEvents();

        this.eventEmitter.emit(EVENTS.UI.WELCOME_TIP_HIDE);
    }

    bindEvents() {
        this._hideHandler = () => this.hide();
        this.toggleButton.addEventListener('click', this._hideHandler);
    }

    unbindEvents() {
        if (this._hideHandler) {
            this.toggleButton.removeEventListener('click', this._hideHandler);
            this._hideHandler = null;
        }
    }

    listenForUserActivity() {
        this.eventEmitter.on(EVENTS.UI.CHAT_OPEN, () => {
            this.markChatAsOpened();
        });

        this.eventEmitter.on(EVENTS.UI.CHAT_CLOSE, () => {
            this.handleChatClose();
        });

        this.eventEmitter.on(EVENTS.UI.MESSAGE_SENT, () => {
            this.markUserAsActive();
            if (this.isShown) {
                this.hide();
            }
        });
    }

    markChatAsOpened() {
        try {
            localStorage.setItem(
                STORAGE_KEYS.UI.WELCOME_TIP.LAST_CHAT_OPEN,
                Date.now().toString()
            );
        } catch (e) {
            this.logger.warn(
                '[WelcomeTip] Не удалось сохранить время открытия:',
                e
            );
        }
    }

    markUserAsActive() {
        try {
            localStorage.setItem(
                STORAGE_KEYS.UI.WELCOME_TIP.MESSAGE_SENT,
                'true'
            );
            this.markChatAsOpened();
        } catch (e) {
            this.logger.warn(
                '[WelcomeTip] Не удалось сохранить активность:',
                e
            );
        }
    }

    markAsShown(type) {
        const key = this.decisionEngine.getStorageKey(type);

        if (!key) {
            return;
        }

        try {
            localStorage.setItem(
                key,
                JSON.stringify({
                    type,
                    timestamp: new Date().toISOString(),
                })
            );

            if (type === 'welcome') {
                this.incrementWelcomeCount();
            }
        } catch (e) {
            this.logger.warn(
                '[WelcomeTip] Не удалось сохранить факт показа:',
                e
            );
        }
    }

    incrementWelcomeCount() {
        const count =
            parseInt(
                sessionStorage.getItem('aichat:welcome:count') || '0',
                10
            ) + 1;
        sessionStorage.setItem('aichat:welcome:count', count.toString());
    }

    canRender() {
        return !!(
            this.toggleButton &&
            this.tipElement &&
            document.body.contains(this.toggleButton)
        );
    }

    scheduleAutoHide(type) {
        const duration = this.getDurationForType(type);

        if (typeof duration !== 'number' || duration <= 0) {
            return;
        }

        this.hideTimeout = setTimeout(() => {
            if (this.isShown) {
                this.hide();
            }
        }, duration);
    }

    scheduleFollowUpReminder() {
        if (this.followUpTimeout) {
            return;
        }
        if (this.getLastChatOpenTime()) {
            return;
        }

        // Используем delay из welcome.followup_delay или по умолчанию
        const initialDelay = this.messagesProvider.getField(
            'followup',
            'delay',
            30000
        );

        this.followUpTimeout = setTimeout(() => {
            if (
                this.isShown ||
                this.getLastChatOpenTime() ||
                !this.canRender()
            ) {
                return;
            }
            this.showMessageByType('followup');
        }, initialDelay);
    }

    handleChatClose() {
        if (this.hasUserSentMessage()) {
            return;
        }
        if (this.isShown) {
            return;
        }

        setTimeout(() => {
            if (this.hasUserSentMessage() || this.isShown) {
                return;
            }

            this.showMessageByType('returning');
        }, this.getDelayForType('returning'));
    }

    destroy() {
        this.hide();

        clearTimeout(this.showTimeout);
        clearTimeout(this.hideTimeout);
        clearTimeout(this.followUpTimeout);

        this.followUpTimeout = null;
        this.unbindEvents();

        this.eventEmitter.emit(EVENTS.UI.WELCOME_TIP_DESTROY);
    }
}
