import { Utils } from '../utils';
import { EVENTS } from '../../config';
import { DecisionEngine } from '@js/services/DecisionEngine';
import { TipStorage } from '../tips/TipStorage';
import { UserActivityStorage } from '../tips/UserActivityStorage';
import { outerRules } from '../tips/rules';
import { TipCooldown } from '../tips/TipCooldown';
import { TipPresenter } from '@js/services/TipPresenter';

/**
 * Умный обработчик внешних подсказок (всплывающих сообщений под кнопкой чата).
 *
 * Отвечает за:
 * - показ и скрытие DOM-элемента подсказки
 * - анимацию "печати" текста
 * - автоматическое скрытие через заданное время
 * - реакцию на действия пользователя (открытие чата, отправка сообщения)
 * - планирование напоминаний (follow-up)
 *
 * Логика определения типа сообщения вынесена в {@link OuterTipsDecisionEngine}.
 *
 * @class OuterTips
 */
export class OuterTips {
    /**
     * Стандартные длительности показа сообщений (в миллисекундах), если не заданы в провайдере.
     *
     * @type {Object.<string, number>}
     * @property {number} welcome - 8 секунд
     * @property {number} followup - 10 секунд
     * @property {number} reconnect - 10 секунд
     * @property {number} active_return - 7 секунд
     * @property {number} returning - 10 секунд
     * @readonly
     */
    static DEFAULT_DURATIONS = {
        welcome: 8000,
        followup: 10000,
        reconnect: 10000,
        active_return: 7000,
        returning: 10000,
    };

    /**
     * Стандартные задержки перед показом сообщений (в миллисекундах), если не заданы в провайдере.
     *
     * @type {Object.<string, number>}
     * @property {number} welcome - 3 секунды
     * @property {number} followup - 30 секунд
     * @property {number} reconnect - 8 секунд
     * @property {number} active_return - 5 секунд
     * @property {number} returning - 10 секунд
     * @readonly
     */
    static DEFAULT_DELAY = {
        welcome: 3000,
        followup: 30000,
        reconnect: 8000,
        active_return: 5000,
        returning: 10000,
    };

    /**
     * Создаёт экземпляр компонента управления внешними подсказками.
     *
     * @param {UI} ui - Контекст UI (элементы, классы, методы)
     * @param {MessagesProvider} messagesProvider - Провайдер текстов и конфигурации
     * @param {StorageKeysProvider} keysProvider - Провайдер ключей для хранения состояний и настроек
     * @param {EventEmitter} eventEmitter - Централизованный эмиттер событий
     * @param {Logger} logger - Логгер для отладки и диагностики
     * @example
     * const tips = new OuterTips(ui, messagesProvider, keysProvider, eventEmitter, console);
     *
     */
    constructor(ui, messagesProvider, keysProvider, eventEmitter, logger) {
        // const { elements, classes } = ui;

        this.ui = ui;

        // this.toggleButton = elements.toggle;
        // this.tipElement = elements.welcomeTip;
        // this.tipClassShow = classes.welcomeTipShow;

        this.messagesProvider = messagesProvider;
        this.keysProvider = keysProvider;
        this.eventEmitter = eventEmitter;
        this.logger = logger;

        this.presenter = new TipPresenter(ui, logger);
        console.log('this.presenter:', this.presenter);
        this.tipStorage = new TipStorage(this.keysProvider);
        this.userActivityStorage = new UserActivityStorage(this.keysProvider);

        this.tipCooldown = new TipCooldown(
            this.messagesProvider,
            this.tipStorage,
            this.logger
        );

        this.decisionEngine = new DecisionEngine(
            messagesProvider,
            outerRules,
            {
                storage: this.tipStorage,
                cooldown: this.tipCooldown,
            },
            this.logger
        );

        this.started = false;
        // this.isShown = false;
        // this.animation = null;
        // this.showTimeout = null;
        // this.hideTimeout = null;
        // this.followUpTimeout = null;

        this.bindEvents();
        this.listenForUserActivity();
    }

    /**
     * Запускает логику показа подсказки.
     *
     * Определяет тип сообщения на основе текущего состояния пользователя.
     * Если тип найден и можно показать — запланирует отображение с задержкой.
     *
     * @returns {void}
     *
     * @example
     * tips.start(); // Запуск после инициализации
     */
    start() {
        if (this.started) {
            return;
        }

        this.started = true;

        const delay = this.getDelayForType('welcome');

        this.showTimeout = setTimeout(() => {
            const state = this.getCurrentState();
            const messageType = this.decisionEngine.determine(state);

            this.logger.warn('[WELCOME] Определён тип:', messageType);

            if (messageType && this.presenter.canRender() && !this.presenter.isShown) {
                this.showMessage(messageType);
                this.scheduleAutoHide(messageType);

                if (messageType === 'welcome') {
                    this.scheduleFollowUpReminder();
                }
            }
        }, delay);
    }

    /**
     * Получает текущее состояние пользователя для принятия решения.
     *
     * @returns {Object}
     * @property {number|null} lastChatOpenTime - Временная метка последнего открытия чата или `null`
     * @property {boolean} hasSentMessage - Было ли отправлено хотя бы одно сообщение
     */
    getCurrentState() {
        const now = Date.now();

        const lastChatOpenTime = this.getLastChatOpenTime();
        const lastMessageSentTime =
            this.userActivityStorage.getLastMessageSentTime();
        const hasSentMessage = lastMessageSentTime !== null;

        const timeSinceLastOpen =
            lastChatOpenTime !== null ? now - lastChatOpenTime : null;
        const timeSinceLastMessage = hasSentMessage
            ? now - lastMessageSentTime
            : null;

        const tenMinutes = 10 * 60 * 1000;
        const oneWeek = 7 * 24 * 60 * 60 * 1000;

        return {
            lastChatOpenTime,
            lastMessageSentTime,
            hasSentMessage,

            timeSinceLastOpen,
            timeSinceLastMessage,

            isRecentlyReturned:
                lastChatOpenTime !== null &&
                timeSinceLastOpen >= 2 * 60 * 1000 &&
                timeSinceLastOpen <= 10 * 60 * 1000,

            wasInactiveLongEnough:
                lastChatOpenTime !== null && timeSinceLastOpen > 10 * 60 * 1000,

            isEligibleForReconnect:
                hasSentMessage &&
                timeSinceLastMessage > tenMinutes &&
                timeSinceLastMessage <= oneWeek,
        };
    }

    /**
     * Получает задержку перед показом сообщения указанного типа.
     *
     * Использует значение из `messagesProvider`, иначе — из `DEFAULT_DELAY`.
     *
     * @param {string} type - Тип сообщения (`'welcome'`, `'followup'` и т.д.)
     * @returns {number} Задержка в миллисекундах
     *
     * @example
     * this.getDelayForType('welcome'); // → 3000
     */
    getDelayForType(type) {
        return this.messagesProvider.getField(
            'out',
            type,
            'delay',
            OuterTips.DEFAULT_DELAY[type]
        );
    }

    /**
     * Получает длительность показа сообщения указанного типа.
     *
     * Использует значение из `messagesProvider`, иначе — из `DEFAULT_DURATIONS`.
     *
     * @param {string} type - Тип сообщения
     * @returns {number} Длительность в миллисекундах
     *
     * @example
     * this.getDurationForType('active_return'); // → 7000
     */
    getDurationForType(type) {
        return this.messagesProvider.getField(
            'out',
            type,
            'duration',
            OuterTips.DEFAULT_DURATIONS[type]
        );
    }

    /**
     * Получает временную метку последнего открытия чата из localStorage.
     *
     * @returns {number|null} Timestamp или `null`, если не открывался
     */
    getLastChatOpenTime() {
        const raw = this.userActivityStorage.getLastChatOpenTime();

        return raw ? parseInt(raw, 10) : null;
    }

    /**
     * Проверяет, отправлял ли пользователь сообщение ранее.
     *
     * @returns {boolean} `true`, если сообщение было отправлено
     */
    hasUserSentMessage() {
        return this.userActivityStorage.hasSentMessage();
    }

    /**
     * Показывает сообщение указанного типа с анимацией печати.
     *
     * @param {string|null} type - Тип сообщения (`'welcome'`, `'reconnect'` и т.д.)
     * @returns {void}
     *
     * @emits EVENTS.UI.TYPING_UPDATE - При каждом обновлении текста анимации
     * @emits EVENTS.UI.TYPING_FINISH - Когда анимация завершена
     * @emits EVENTS.UI.OUTER_TIP_SHOW - Когда сообщение полностью показано
     */
    showMessage(type) {

        const text = this.messagesProvider.getText('out', type);

        if (!text) {
            this.logger.warn('[OuterTips] No text for type:', type);
            return;
        }

        this.presenter.show(text, () => {
            // Анимация завершена
            this.eventEmitter.emit(EVENTS.UI.OUTER_TIP_SHOW, { type });
        });

        this.markAsShown(type);
    }

    /**
     * Принудительно показывает сообщение указанного типа (например, по команде).
     *
     * Проверяет возможность показа через .
     *
     * @param {string} type - Тип сообщения
     * @returns {void}
     *
     * @example
     * tips.showMessageByType('reconnect');
     */
    showMessageByType(type) {
        if (!this.messagesProvider.has('out', type)) {
            return;
        }

        if (this.tipStorage.wasShown(type, 'out')) {
            return;
        }

        this.logger.warn('[WELCOME] Принудительный показ:', type);

        this.showMessage(type);
        this.scheduleAutoHide(type);
        this.markAsShown(type);
    }

    /**
     * Скрывает текущее сообщение, останавливает анимацию и очищает таймеры.
     *
     * @returns {void}
     *
     * @emits EVENTS.UI.OUTER_TIP_HIDE
     */
    hide() {
        // if (!this.isShown) {
        //     return;
        // }

        // if (this.animation?.stop) {
        //     this.animation.stop();
        // }
        // this.animation = null;

        // this.tipElement.classList.remove(this.tipClassShow);
        // this.isShown = false;

        // clearTimeout(this.hideTimeout);

        // this.unbindEvents();

        // this.eventEmitter.emit(EVENTS.UI.OUTER_TIP_HIDE);

        this.presenter.hide();
        this.eventEmitter.emit(EVENTS.UI.OUTER_TIP_HIDE);
    }

    /**
     * Назначает обработчики DOM-событий.
     *
     * @private
     * @returns {void}
     */
    bindEvents() {
        // this._hideHandler = () => this.hide();
        // this.toggleButton.addEventListener('click', this._hideHandler);
    }

    /**
     * Удаляет обработчики DOM-событий.
     *
     * @private
     * @returns {void}
     */
    unbindEvents() {
        // if (this._hideHandler) {
        //     this.toggleButton.removeEventListener('click', this._hideHandler);
        //     this._hideHandler = null;
        // }
    }

    /**
     * Подписывается на внутренние события приложения (через EventEmitter).
     *
     * @private
     * @returns {void}
     */
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

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                // Пользователь вернулся на страницу
                this.scheduleActiveReturn();
            }
        });

        // Или дополнительно:
        window.addEventListener('focus', () => {
            this.scheduleActiveReturn();
        });
    }

    /**
     * Сохраняет временную метку открытия чата в localStorage.
     *
     * @returns {void}
     */
    markChatAsOpened() {
        this.userActivityStorage.markChatOpen();
    }

    /**
     * Отмечает пользователя как активного (отправил сообщение).
     * Также обновляет метку времени открытия чата.
     *
     * @returns {void}
     */
    markUserAsActive() {
        try {
            this.userActivityStorage.markMessageSent();
            this.markChatAsOpened();
        } catch (e) {
            this.logger.warn(
                '[WelcomeTip] Не удалось сохранить активность:',
                e
            );
        }
    }

    /**
     * Отмечает факт показа сообщения в localStorage.
     *
     * @param {string} type - Тип сообщения
     * @returns {void}
     */
    markAsShown(type) {
        try {
            this.tipStorage.markAsShown(type, 'out');
        } catch (e) {
            this.logger.warn(
                '[WelcomeTip] Не удалось сохранить факт показа:',
                e
            );
        }
    }

    /**
     * Проверяет, можно ли рендерить подсказку (элементы существуют и в DOM).
     *
     * @returns {boolean} `true`, если элементы доступны и видимы
     */
    canRender() {
        return !!(
            this.toggleButton &&
            this.tipElement &&
            document.body.contains(this.toggleButton)
        );
    }

    /**
     * Планирует автоматическое скрытие сообщения через указанное время.
     *
     * @param {string} type - Тип сообщения (используется для получения duration)
     * @returns {void}
     */
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

    /**
     * Планирует показ напоминания (follow-up), если пользователь проигнорировал приветствие.
     *
     * Вызывается только после `welcome`, если чат так и не был открыт.
     *
     * @returns {void}
     */
    scheduleFollowUpReminder() {
        if (this.followUpTimeout) {
            return;
        }

        if (this.getLastChatOpenTime()) {
            return;
        }

        const initialDelay = this.messagesProvider.getField(
            'out',
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

    /**
     * Планирует проверку для показа `active_return`, если пользователь вернулся на страницу.
     *
     * Проверяет, писал ли пользователь ранее, не открыт ли чат и не показывали ли уже `active_return`.
     * Если все условия выполнены, использует `decisionEngine` для определения возможности показа.
     *
     * @returns {void}
     */
    scheduleActiveReturn() {
        // Задержка на случай, если это просто переключение между вкладками
        setTimeout(() => {
            const state = this.getCurrentState();

            // Только если он уже писал
            if (!state.hasSentMessage) {
                return;
            }

            // Не показывать, если чат уже открыт
            if (this.ui.isOpen()) {
                // нужно реализовать
                return;
            }

            // Не показывать, если уже показывали
            if (this.tipStorage.wasShown('active_return', 'out')) {
                return;
            }

            // Можно показать?
            if (!this.canRender() || this.isShown) {
                return;
            }

            // Проверим через decisionEngine
            const messageType = this.decisionEngine.determine(state, {
                context: 'return', // опционально: подсказка движку
            });

            if (messageType === 'active_return') {
                this.showMessageByType('active_return');
            }
        }, 500); // небольшая задержка, чтобы избежать ложных срабатываний
    }

    /**
     * Обрабатывает закрытие чата: если пользователь не писал, может показать `returning`.
     *
     * @returns {void}
     */
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

    /**
     * Полностью уничтожает компонент: скрывает, очищает таймеры, удаляет обработчики.
     *
     * @returns {void}
     *
     * @emits EVENTS.UI.OUTER_TIP_DESTROY
     */
    destroy() {
        this.hide();

        clearTimeout(this.showTimeout);
        clearTimeout(this.hideTimeout);
        clearTimeout(this.followUpTimeout);

        this.followUpTimeout = null;

        this.presenter.destroy();
        this.eventEmitter.emit(EVENTS.UI.OUTER_TIP_DESTROY);
    }
}
