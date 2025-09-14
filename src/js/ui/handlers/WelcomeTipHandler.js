import { Utils } from '../utils';
import { EVENTS, STORAGE_KEYS } from '../../config';

/**
 * Умный обработчик приглашающего сообщения под кнопкой чата.
 *
 * Показывает разные сообщения в зависимости от контекста пользователя:
 * - Новый посетитель → приветствие
 * - Вернулся, но не писал → напоминание
 * - Был активен → мягкое возобновление диалога
 *
 * Автоматически скрывается при взаимодействии или по таймауту.
 *
 * @class WelcomeTipHandler
 */
export class WelcomeTipHandler {
    /**
     * Создаёт экземпляр WelcomeTipHandler.
     *
     * @param {Object} elements - DOM-элементы интерфейса
     * @param {HTMLElement} elements.toggle - Кнопка открытия чата
     * @param {HTMLElement} elements.welcomeTip - Элемент для текста подсказки
     *
     * @param {Object} classes - CSS-классы
     * @param {string} classes.welcomeTipShow - Класс для отображения подсказки
     *
     * @param {MessagesProvider} messagesProvider - Поставщик текстов и задержек
     * @param {Evented} eventEmitter - Единая шина событий (через UI)
     */
    constructor(elements, classes, messagesProvider, eventEmitter, logger) {
        this.toggleButton = elements.toggle;
        this.tipElement = elements.welcomeTip;
        this.tipClassShow = classes.welcomeTipShow;

        this.messagesProvider = messagesProvider;
        this.eventEmitter = eventEmitter;
        this.logger = logger;

        /** @type {boolean} Флаг: уже запускали start() */
        this.started = false;

        /** @type {boolean} Флаг: сообщение сейчас показано */
        this.isShown = false;

        /** @type {Object|null} Анимация "печати" */
        this.animation = null;

        /** @type {number|null} Таймер показа */
        this.showTimeout = null;

        /** @type {number|null} Таймер автоскрытия */
        this.hideTimeout = null;

        /** @type {number|null} Таймер повторного напоминания */
        this.followUpTimeout = null;

        this.bindEvents();
        this.listenForUserActivity();
    }

    /**
     * Запускает логику показа подсказки.
     * Вызывается один раз после инициализации UI.
     */
    start() {
        if (this.started) {
            return;
        }

        this.started = true;

        const messageType = this.determineMessageType();

        if (!messageType || !this.canRender()) {
            return;
        }
        console.log('[WELCOME] Определён тип:', messageType);
        const delay = this.getDelayForType(messageType);

        console.log(delay);
        this.showTimeout = setTimeout(() => {
            if (this.canRender() && !this.isShown) {
                this.showMessage(messageType);
                this.scheduleAutoHide(messageType);

                // Если это первичное приветствие — запланировать повтор через 30 сек
                if (messageType === 'welcome') {
                    console.log(
                        '[WELCOME] запланировать повтор через 30 сек',
                        messageType
                    );
                    this.scheduleFollowUpReminder();
                }
            }
        }, delay);
    }

    /**
     * Определяет тип сообщения на основе поведения пользователя.
     *
     * Реализует следующие сценарии:
     *
     * 1. Никогда не открывал → welcome → 3 сек
     *    - Пользователь впервые видит чат
     *    - Сообщение: "Готов помочь! Нажмите, чтобы начать чат"
     *
     * 2. Никогда не открывал → welcome → 30 сек (повторное приглашение)
     *    - Прошло 30 сек, чат не открыт
     *    - Показываем followup как напоминание
     *    - Только один раз за сессию
     *
     * 3. Открыл, но не написал → followup → 10 сек
     *    - Был, но не отправил сообщение
     *    - Активен ≤30 минут
     *
     * 4. Открывал/писал недавно (≤30 мин) → followup → 10 сек
     *    - Есть активность, но давно не общались
     *    - Напоминаем, что чат доступен
     *
     * 5. Открыл, написал, но давно (>30 мин) → reconnect
     *    - Был, но прошло >30 минут
     *    - Считаем, что "ушёл"
     *
     * 6. Вернулся на сайт в течение недели → reconnect
     *    - То же, что и выше
     *    - Показываем reconnect, если не видел его недавно
     *
     * 7. Перешёл на другую страницу → active_return
     *    - Пользователь уже писал
     *    - Хотим мягко предложить продолжить
     *    - Только если не показывали recently
     *
     * @returns {string|null} Тип сообщения ('welcome', 'followup', 'reconnect', 'active_return') или null
     */
    determineMessageType() {
        const lastOpenTime = this.getLastChatOpenTime();
        const hasSentMessage = this.hasUserSentMessage();
        const timeSinceOpen = lastOpenTime
            ? Date.now() - lastOpenTime
            : Infinity;
        const recentlyActive = timeSinceOpen < 1000 * 60 * 30; // ≤30 минут

        // Сценарий 1 & 2: Никогда не открывал
        if (!lastOpenTime) {
            // Первый показ welcome
            if (this.canShowType('welcome')) {
                return 'welcome';
            }

            // Повторное напоминание через 30 сек (только один раз за сессию)
            if (
                !this.hasShownWelcomeTwice() &&
                this.messagesProvider.has('followup') &&
                this.canShowType('followup')
            ) {
                return 'followup';
            }
            return null;
        }

        // Сценарий 3 & 4: Открывал, активен ≤30 мин
        if (recentlyActive) {
            if (this.canShowType('followup')) {
                return 'followup';
            }
            return null;
        }

        // Сценарий 5 & 6: Был, но давно (>30 мин)
        if (
            this.messagesProvider.has('reconnect') &&
            this.canShowType('reconnect')
        ) {
            return 'reconnect';
        }

        // Сценарий 7: Перешёл на другую страницу, писал ранее
        if (
            hasSentMessage &&
            !this.hasSeenActiveReturnRecently() &&
            this.messagesProvider.has('active_return')
        ) {
            return 'active_return';
        }

        return null;
    }

    /**
     * Возвращает задержку показа для типа сообщения.
     * Берёт из messagesProvider, если есть, иначе — дефолт.
     *
     * @param {string} type - Тип сообщения
     * @returns {number}
     */
    getDelayForType(type) {
        const defaults = {
            welcome: 3000,
            followup: 10000,
            reconnect: 8000,
            active_return: 5000,
        };
        return this.messagesProvider.getField(type, 'delay', defaults[type]);
    }

    /**
     * Показывает сообщение с анимацией "печати".
     *
     * @param {string} type - Тип сообщения
     */
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

    /**
     * Запускает автоскрытие через duration.
     *
     * @param {string} type - Тип сообщения
     */
    scheduleAutoHide(type) {
        const duration = this.messagesProvider.getField(type, 'duration');

        if (duration <= 0) {
            return;
        }

        this.hideTimeout = setTimeout(() => {
            if (this.isShown) {
                this.hide();
            }
        }, duration);
    }

    /**
     * Принудительно скрывает подсказку.
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

        clearTimeout(this.hideTimeout);
        clearTimeout(this.followUpTimeout);

        this.followUpTimeout = null;

        this.unbindEvents();
        this.eventEmitter.emit(EVENTS.UI.WELCOME_TIP_HIDE);
    }

    /**
     * Привязывает события DOM.
     */
    bindEvents() {
        this._hideHandler = () => this.hide();
        this.toggleButton.addEventListener('click', this._hideHandler);
    }

    /**
     * Отвязывает события DOM.
     */
    unbindEvents() {
        if (this._hideHandler) {
            this.toggleButton.removeEventListener('click', this._hideHandler);
            this._hideHandler = null;
        }
    }

    /**
     * Подписывается на ключевые события приложения.
     */
    listenForUserActivity() {
        this.eventEmitter.on(EVENTS.UI.CHAT_OPEN, () => {
            this.markChatAsOpened();
        });

        this.eventEmitter.on(EVENTS.UI.MESSAGE_SENT, () => {
            this.markUserAsActive();
            if (this.isShown) {
                this.hide();
            }
        });
    }

    /**
     * Запоминает время последнего открытия чата.
     */
    markChatAsOpened() {
        try {
            localStorage.setItem(
                STORAGE_KEYS.UI.WELCOME_TIP.LAST_CHAT_OPEN,
                Date.now().toString()
            );
        } catch (e) {
            console.warn(
                '[WelcomeTip] Не удалось сохранить время открытия:',
                e
            );
        }
    }

    /**
     * Помечает пользователя как активного (отправил сообщение).
     */
    markUserAsActive() {
        try {
            localStorage.setItem(
                STORAGE_KEYS.UI.WELCOME_TIP.MESSAGE_SENT,
                'true'
            );
            this.markChatAsOpened();
        } catch (e) {
            console.warn('[WelcomeTip] Не удалось сохранить активность:', e);
        }
    }

    /**
     * Возвращает время последнего открытия чата.
     * @returns {number|null}
     */
    getLastChatOpenTime() {
        const raw = localStorage.getItem(
            STORAGE_KEYS.UI.WELCOME_TIP.LAST_CHAT_OPEN
        );
        return raw ? parseInt(raw, 10) : null;
    }

    /**
     * Был ли пользователь активным (отправлял сообщение).
     * @returns {boolean}
     */
    hasUserSentMessage() {
        return (
            localStorage.getItem(STORAGE_KEYS.UI.WELCOME_TIP.MESSAGE_SENT) ===
            'true'
        );
    }

    /**
     * Проверяет, можно ли показать тип сообщения (учитывая кулдаун).
     *
     * @param {string} type - Тип сообщения
     * @returns {boolean}
     */
    canShowType(type) {
        const cooldownHours = {
            welcome: 24,
            followup: 6,
            reconnect: 24,
            active_return: 24,
        };

        const keyMap = {
            welcome: STORAGE_KEYS.UI.WELCOME_TIP.WELCOME_SHOWN,
            followup: STORAGE_KEYS.UI.WELCOME_TIP.FOLLOWUP_SHOWN,
            reconnect: STORAGE_KEYS.UI.WELCOME_TIP.RECONNECT_SHOWN,
            active_return: STORAGE_KEYS.UI.WELCOME_TIP.ACTIVE_RETURN_SHOWN,
        };

        const key = keyMap[type];
        if (!key) {
            return true;
        }

        const hours = cooldownHours[type] || 24;
        const raw = localStorage.getItem(key);
        if (!raw) {
            return true;
        }

        try {
            const data = JSON.parse(raw);
            const last = new Date(data.timestamp).getTime();
            const hoursSince = (Date.now() - last) / (1000 * 60 * 60);
            return hoursSince >= hours;
        } catch {
            return true;
        }
    }

    /**
     * Помечает, что сообщение показано.
     * Обновляет соответствующий флаг в localStorage.
     *
     * @param {string} type - Тип сообщения
     */
    markAsShown(type) {
        const keyMap = {
            welcome: STORAGE_KEYS.UI.WELCOME_TIP.WELCOME_SHOWN,
            followup: STORAGE_KEYS.UI.WELCOME_TIP.FOLLOWUP_SHOWN,
            reconnect: STORAGE_KEYS.UI.WELCOME_TIP.RECONNECT_SHOWN,
            active_return: STORAGE_KEYS.UI.WELCOME_TIP.ACTIVE_RETURN_SHOWN,
        };

        const key = keyMap[type];
        if (!key) {
            return;
        }

        try {
            localStorage.setItem(
                key,
                JSON.stringify({
                    timestamp: new Date().toISOString(),
                    type,
                    version: '1.3',
                })
            );

            // Для welcome увеличиваем счётчик в сессии
            if (type === 'welcome') {
                this.incrementWelcomeCount();
            }
        } catch (e) {
            console.warn('[WelcomeTip] Не удалось сохранить факт показа:', e);
        }
    }

    /**
     * Проверяет, показывали ли welcome дважды в этой сессии.
     * @returns {boolean}
     */
    hasShownWelcomeTwice() {
        const count = parseInt(
            sessionStorage.getItem('aichat:welcome:count') || '0',
            10
        );
        return count >= 2;
    }

    /**
     * Увеличивает счётчик показов welcome в рамках сессии.
     */
    incrementWelcomeCount() {
        const count =
            parseInt(
                sessionStorage.getItem('aichat:welcome:count') || '0',
                10
            ) + 1;
        sessionStorage.setItem('aichat:welcome:count', count.toString());
    }

    /**
     * Проверяет, показывали ли active_return недавно.
     * @returns {boolean}
     */
    hasSeenActiveReturnRecently() {
        const raw = localStorage.getItem(
            STORAGE_KEYS.UI.WELCOME_TIP.ACTIVE_RETURN_SHOWN
        );
        if (!raw) {
            return false;
        }

        try {
            const data = JSON.parse(raw);
            const last = new Date(data.timestamp).getTime();
            const hoursSince = (Date.now() - last) / (1000 * 60 * 60);
            return hoursSince < 24;
        } catch {
            return true;
        }
    }

    /**
     * Проверяет, можно ли рендерить (DOM элементы доступны).
     * @returns {boolean}
     */
    canRender() {
        return !!(
            this.toggleButton &&
            this.tipElement &&
            document.body.contains(this.toggleButton)
        );
    }

    /**
     * Запускает напоминание через 30 сек, если пользователь игнорирует чат.
     */
    scheduleFollowUpReminder() {
        if (this.followUpTimeout) {
            return;
        }
        console.log('[WELCOME] scheduleFollowUpReminder вызван');
        // Не ставим, если уже был активен
        if (this.getLastChatOpenTime() || this.hasUserSentMessage()) {
            return;
        }
        console.log('[WELCOME] followUp запланирован через 30 сек');
        // Показываем followup как "повторное приглашение"
        this.followUpTimeout = setTimeout(() => {
            if (this.isShown || this.getLastChatOpenTime()) {
                return;
            }

            if (
                this.messagesProvider.has('followup') &&
                this.canShowType('followup')
            ) {
                console.log('[WELCOME] Принудительный followup!');
                this.showMessage('followup');
                this.scheduleAutoHide('followup');
            }
        }, 5000); // 30 секунд
    }

    /**
     * Полная остановка и очистка.
     */
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
