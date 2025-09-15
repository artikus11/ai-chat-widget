// import { Utils } from '../utils';
// import { EVENTS, STORAGE_KEYS } from '../../config';

// /**
//  * Умный обработчик приглашающего сообщения под кнопкой чата.
//  *
//  * Показывает разные сообщения в зависимости от контекста пользователя:
//  * - Новый посетитель → приветствие (welcome)
//  * - Не открыл чат за 30 сек → напоминание (followup)
//  * - Открывал, но не писал → мягкое напоминание (returning)
//  * - Писал ранее, но давно → reconnect
//  * - Вернулся на другую страницу → active_return
//  *
//  * Автоматически скрывается при взаимодействии или по таймауту.
//  *
//  * @class WelcomeTip
//  */
// export class WelcomeTip {
//     static DEFAULT_DURATIONS = {
//         welcome: 8000,
//         followup: 10000,
//         reconnect: 10000,
//         active_return: 7000,
//     };

//     static DEFAULT_DELAY = {
//         welcome: 3000,
//         followup: 10000,
//         reconnect: 8000,
//         active_return: 5000,
//     };

//     static DEFAULT_COOLDOWN_HOURS = {
//         welcome: 24,
//         followup: 6,
//         returning: 0,
//         reconnect: 24,
//         active_return: 24,
//     };

//     constructor(elements, classes, messagesProvider, eventEmitter, logger) {
//         this.toggleButton = elements.toggle;
//         this.tipElement = elements.welcomeTip;
//         this.tipClassShow = classes.welcomeTipShow;

//         this.messagesProvider = messagesProvider;
//         this.eventEmitter = eventEmitter;
//         this.logger = logger;

//         this.started = false;
//         this.isShown = false;
//         this.animation = null;
//         this.showTimeout = null;
//         this.hideTimeout = null;
//         this.followUpTimeout = null;

//         this.bindEvents();
//         this.listenForUserActivity();
//     }

//     start() {
//         if (this.started) {
//             return;
//         }

//         this.started = true;

//         const messageType = this.determineMessageType();

//         this.logger.warn('[WELCOME] Определён тип до проверки:', messageType);

//         if (!messageType || !this.canRender()) {
//             return;
//         }

//         const delay = this.getDelayForType(messageType);

//         this.showTimeout = setTimeout(() => {
//             if (this.canRender() && !this.isShown) {
//                 this.showMessage(messageType);
//                 this.scheduleAutoHide(messageType);

//                 if (messageType === 'welcome') {
//                     this.scheduleFollowUpReminder();
//                 }
//             }
//         }, delay);
//     }

//     /**
//      * Определяет тип сообщения с приоритетами.
//      *
//      * Сценарии:
//      * 1. active_return — писал ранее, перешёл на страницу
//      * 2. reconnect — писал, но >30 мин
//      * 3. returning — был в чате, но не писал (≤10 мин)
//      * 4. followup — новый, игнорирует >30 сек
//      * 5. welcome — первый визит
//      */
//     determineMessageType() {
//         const lastOpenTime = this.getLastChatOpenTime();
//         const hasSentMessage = this.hasUserSentMessage();
//         const timeSinceOpen = lastOpenTime
//             ? Date.now() - lastOpenTime
//             : Infinity;
//         const recentlyActive = timeSinceOpen < 1000 * 60 * 10; // ≤10 минут
//         const tooLongAgo = timeSinceOpen > 1000 * 60 * 60 * 24 * 7; // >7 дней

//         // Сценарий: первый визит → welcome
//         if (
//             !lastOpenTime &&
//             this.messagesProvider.has('welcome') &&
//             this.canShowType('welcome')
//         ) {
//             return 'welcome';
//         }

//         // // Сценарий: НИКОГДА не открывал, не писал, прошло время → followup (напоминание)
//         if (
//             !lastOpenTime &&
//             !hasSentMessage &&
//             this.messagesProvider.has('followup') &&
//             this.canShowType('followup')
//         ) {
//             return 'followup';
//         }

//         // // Сценарий: открывал чат, но не писал, и был ≤30 мин назад → returning
//         if (
//             lastOpenTime &&
//             !hasSentMessage &&
//             recentlyActive &&
//             this.messagesProvider.has('returning') &&
//             this.canShowType('returning')
//         ) {
//             return 'returning';
//         }

//         // Сценарий: писал, но давно (>30 мин), но не более недели → reconnect
//         if (
//             !recentlyActive &&
//             hasSentMessage &&
//             !tooLongAgo &&
//             this.messagesProvider.has('reconnect') &&
//             this.canShowType('reconnect')
//         ) {
//             return 'reconnect';
//         }

//         // Сценарий: вернулся, писал ранее → active_return
//         if (
//             hasSentMessage &&
//             !this.hasSeenActiveReturnRecently() &&
//             this.messagesProvider.has('active_return') &&
//             this.canShowType('active_return')
//         ) {
//             return 'active_return';
//         }

//         return null;
//     }

//     getDelayForType(type) {
//         return this.messagesProvider.getField(type, 'delay', WelcomeTip.DEFAULT_DELAY[type]);
//     }

//     getDurationForType(type) {
//         return this.messagesProvider.getField(type, 'duration', WelcomeTip.DEFAULT_DURATIONS[type]);
//     }

//     getCooldownHoursForType(type) {
//         return this.messagesProvider.getField(type, 'cooldownHours', WelcomeTip.DEFAULT_COOLDOWN_HOURS[type]);
//     }

//     getStorageKeyForType(type) {
//         const keyMap = {
//             welcome: STORAGE_KEYS.UI.WELCOME_TIP.WELCOME_SHOWN,
//             followup: STORAGE_KEYS.UI.WELCOME_TIP.FOLLOWUP_SHOWN,
//             returning: STORAGE_KEYS.UI.WELCOME_TIP.RETURNING_SHOWN,
//             reconnect: STORAGE_KEYS.UI.WELCOME_TIP.RECONNECT_SHOWN,
//             active_return: STORAGE_KEYS.UI.WELCOME_TIP.ACTIVE_RETURN_SHOWN,
//         };

//         return keyMap[type];
//     }

//     getLastChatOpenTime() {
//         const raw = localStorage.getItem(
//             STORAGE_KEYS.UI.WELCOME_TIP.LAST_CHAT_OPEN
//         );
//         return raw ? parseInt(raw, 10) : null;
//     }

//     showMessage(type) {
//         if (this.isShown) {
//             return;
//         }

//         const text = this.messagesProvider.getText(type);

//         this.tipElement.textContent = '';
//         this.tipElement.classList.add(this.tipClassShow);

//         this.animation = Utils.animateTyping(text);

//         this.animation.on(EVENTS.UI.TYPING_UPDATE, typedText => {
//             this.tipElement.textContent = typedText;
//         });

//         this.animation.on(EVENTS.UI.TYPING_FINISH, () => {
//             this.eventEmitter.emit(EVENTS.UI.WELCOME_TIP_SHOW, { type });
//         });

//         this.markAsShown(type);
//         this.isShown = true;
//     }

//     showMessageByType(type) {
//         if (!this.messagesProvider.has(type) || !this.canShowType(type)) {
//             return;
//         }

//         this.logger.log('[WELCOME] Принудительный ', type);

//         this.showMessage(type);
//         this.scheduleAutoHide(type);
//         this.markAsShown(type);
//     }

//     hide() {
//         if (!this.isShown) {
//             return;
//         }

//         if (this.animation?.stop) {
//             this.animation.stop();
//         }
//         this.animation = null;

//         this.tipElement.classList.remove(this.tipClassShow);
//         this.isShown = false;

//         clearTimeout(this.hideTimeout);

//         this.unbindEvents();
//         this.eventEmitter.emit(EVENTS.UI.WELCOME_TIP_HIDE);
//     }

//     bindEvents() {
//         this._hideHandler = () => this.hide();
//         this.toggleButton.addEventListener('click', this._hideHandler);
//     }

//     unbindEvents() {
//         if (this._hideHandler) {
//             this.toggleButton.removeEventListener('click', this._hideHandler);
//             this._hideHandler = null;
//         }
//     }

//     listenForUserActivity() {
//         this.eventEmitter.on(EVENTS.UI.CHAT_OPEN, () => {
//             this.markChatAsOpened();
//         });

//         this.eventEmitter.on(EVENTS.UI.CHAT_CLOSE, () => {
//             this.handleChatClose();
//         });

//         this.eventEmitter.on(EVENTS.UI.MESSAGE_SENT, () => {
//             this.markUserAsActive();
//             if (this.isShown) {
//                 this.hide();
//             }
//         });
//     }

//     markChatAsOpened() {
//         try {
//             localStorage.setItem(
//                 STORAGE_KEYS.UI.WELCOME_TIP.LAST_CHAT_OPEN,
//                 Date.now().toString()
//             );
//         } catch (e) {
//             this.logger.warn(
//                 '[WelcomeTip] Не удалось сохранить время открытия:',
//                 e
//             );
//         }
//     }

//     markUserAsActive() {
//         try {
//             localStorage.setItem(
//                 STORAGE_KEYS.UI.WELCOME_TIP.MESSAGE_SENT,
//                 'true'
//             );
//             this.markChatAsOpened();
//         } catch (e) {
//             this.logger.warn('[WelcomeTip] Не удалось сохранить активность:', e);
//         }
//     }

//     markAsShown(type) {
//         const key = this.getStorageKeyForType(type);

//         if (!key) {
//             return;
//         }

//         try {
//             localStorage.setItem(
//                 key,
//                 JSON.stringify({
//                     type,
//                     timestamp: new Date().toISOString(),
//                 })
//             );

//             if (type === 'welcome') {
//                 this.incrementWelcomeCount();
//             }
//         } catch (e) {
//             this.logger.warn('[WelcomeTip] Не удалось сохранить факт показа:', e);
//         }
//     }

//     hasUserSentMessage() {
//         return (
//             localStorage.getItem(STORAGE_KEYS.UI.WELCOME_TIP.MESSAGE_SENT) ===
//             'true'
//         );
//     }

//     canShowType(type) {

//         const key = this.getStorageKeyForType(type);

//         if (!key) {
//             return true;
//         }

//         const hours = this.getCooldownHoursForType(type) || 0;
//         const raw = localStorage.getItem(key);

//         if (!raw) {
//             return true;
//         }

//         try {
//             const data = JSON.parse(raw);
//             const last = new Date(data.timestamp).getTime();
//             const hoursSince = (Date.now() - last) / (1000 * 60 * 60);

//             return hoursSince >= hours;

//         } catch {
//             return true;
//         }
//     }

//     hasShownWelcomeTwice() {
//         const count = parseInt(
//             sessionStorage.getItem('aichat:welcome:count') || '0',
//             10
//         );
//         return count >= 2;
//     }

//     incrementWelcomeCount() {
//         const count =
//             parseInt(
//                 sessionStorage.getItem('aichat:welcome:count') || '0',
//                 10
//             ) + 1;
//         sessionStorage.setItem('aichat:welcome:count', count.toString());
//     }

//     hasSeenActiveReturnRecently() {
//         const raw = localStorage.getItem(
//             STORAGE_KEYS.UI.WELCOME_TIP.ACTIVE_RETURN_SHOWN
//         );
//         if (!raw) {
//             return false;
//         }

//         try {
//             const data = JSON.parse(raw);
//             const last = new Date(data.timestamp).getTime();
//             const hoursSince = (Date.now() - last) / (1000 * 60 * 60);
//             return hoursSince < 24;
//         } catch {
//             return true;
//         }
//     }

//     canRender() {
//         return !!(
//             this.toggleButton &&
//             this.tipElement &&
//             document.body.contains(this.toggleButton)
//         );
//     }

//     scheduleAutoHide(type) {
//         const duration = this.getDurationForType(type);

//         if (typeof duration !== 'number' || duration <= 0) {
//             return;
//         }

//         this.hideTimeout = setTimeout(() => {
//             if (this.isShown) {
//                 this.hide();
//             }
//         }, duration);
//     }

//     /**
//      * Запускает напоминание через 30 секунд, если пользователь игнорирует чат.
//      * Показывается только если determineMessageType вернёт 'followup'.
//      */
//     scheduleFollowUpReminder() {
//         if (this.followUpTimeout) {
//             return;
//         }

//         if (this.getLastChatOpenTime()) {
//             return;
//         }

//         this.followUpTimeout = setTimeout(() => {
//             if (this.isShown) {
//                 return;
//             }

//             if (this.getLastChatOpenTime()) {
//                 return;
//             }

//             if (!this.canRender()) {
//                 return;
//             }

//             this.showMessageByType('followup');
//         }, this.getDelayForType('followup'));
//     }

//     scheduleReturningReminder() {
//         if (this.isShown) {
//             return;
//         }

//         if (this.hasUserSentMessage()) {
//             return;
//         }

//         setTimeout(() => {
//             if (this.hasUserSentMessage()) {
//                 return;
//             }

//             this.showMessageByType('returning');
//         }, this.getDelayForType('returning'));
//     }

//     handleChatClose() {
//         this.scheduleReturningReminder();
//     }

//     destroy() {
//         this.hide();

//         clearTimeout(this.showTimeout);
//         clearTimeout(this.hideTimeout);
//         clearTimeout(this.followUpTimeout);

//         this.followUpTimeout = null;
//         this.unbindEvents();

//         this.eventEmitter.emit(EVENTS.UI.WELCOME_TIP_DESTROY);
//     }
// }

// WelcomeTip.js

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
