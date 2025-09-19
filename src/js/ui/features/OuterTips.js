import { Utils } from '../utils';
import { EVENTS, SCHEDULER_TYPES } from '../../config';
import { DecisionEngine } from '@js/services/DecisionEngine';
import { TipStorage } from '../../storages/TipStorage';
import { UserActivityStorage } from '../../storages/UserActivityStorage';
import { outerRules } from '../tips/rules';
import { TipCooldown } from '../../services/TipCooldown';
import { TipPresenter } from '@js/services/TipPresenter';
import { TipScheduler } from '@js/services/TipScheduler';
import { UserActivityMonitor } from '@js/services/UserActivityMonitor';

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
        this.ui = ui;

        this.messagesProvider = messagesProvider;
        this.keysProvider = keysProvider;
        this.eventEmitter = eventEmitter;
        this.logger = logger;

        this.presenter = new TipPresenter(ui, logger);
        this.tipStorage = new TipStorage(this.keysProvider);
        this.userActivityStorage = new UserActivityStorage(this.keysProvider);

        this.userActivityMonitor = new UserActivityMonitor(
            eventEmitter,
            this.userActivityStorage,
            logger
        );

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

        this.scheduler = new TipScheduler(eventEmitter, logger);

        this.started = false;

        this.#bindSchedulerEvents();
        this.#bindUserActivityEvents();

        this.userActivityMonitor.start();
    }
    /**
     * Подписывается на события от TipScheduler.
     * @private
     */
    #bindSchedulerEvents() {
        this.eventEmitter.on(EVENTS.UI.OUTER_TIP_SCHEDULE_SHOW, ({ type }) => {
            const state = this.getCurrentState();
            const messageType = this.decisionEngine.determine(state);

            this.logger.info(
                '[OUTER_TIPS] Определён тип подсказки:',
                messageType
            );

            if (
                messageType &&
                !this.presenter.isShown &&
                this.presenter.canRender()
            ) {
                this.showMessage(messageType);
                this.scheduleAutoHide(messageType);

                if (messageType === 'welcome') {
                    this.scheduleFollowUpReminder();
                }
            }
        });

        this.eventEmitter.on(EVENTS.UI.OUTER_TIP_AUTO_HIDE, () => {
            if (this.presenter.isShown) {
                this.hideMessage();
            }
        });

        this.eventEmitter.on(EVENTS.UI.OUTER_TIP_FOLLOW_UP_TRIGGER, () => {
            if (
                !this.presenter.isShown &&
                !this.getLastChatOpenTime() &&
                this.presenter.canRender()
            ) {
                this.showMessageByType('followup');
            }
        });
    }

    #bindUserActivityEvents() {
        this.eventEmitter.on(EVENTS.UI.CHAT_OPEN, () => {
            this.markChatAsOpened();
        });

        this.eventEmitter.on(EVENTS.UI.CHAT_CLOSE, () => {
            this.handleChatClose();
        });

        this.eventEmitter.on(EVENTS.UI.MESSAGE_SENT, () => {
            this.markUserAsActive();
            if (this.presenter.isShown) {
                this.hideMessage();
            }
        });

        this.eventEmitter.on(EVENTS.UI.PAGE_RETURN, () => {
            this.scheduleActiveReturn();
        });
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

        const delay = this.messagesProvider.getField('out', 'welcome', 'delay');
        this.scheduler.scheduleShow(delay, 'welcome');
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

        const lastChatOpenTime = this.userActivityMonitor.getLastChatOpenTime();
        const lastMessageSentTime =
            this.userActivityMonitor.getLastMessageSentTime();

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

    getLastChatOpenTime() {
        return this.userActivityMonitor.getLastChatOpenTime();
    }

    hasUserSentMessage() {
        return this.userActivityMonitor.hasSentMessage();
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
    hideMessage() {
        this.presenter.hide();
        this.eventEmitter.emit(EVENTS.UI.OUTER_TIP_HIDE);
    }

    /**
     * Сохраняет временную метку открытия чата в localStorage.
     *
     * @returns {void}
     */
    markChatAsOpened() {
        this.userActivityMonitor.markChatOpen();
    }

    /**
     * Отмечает пользователя как активного (отправил сообщение).
     * Также обновляет метку времени открытия чата.
     *
     * @returns {void}
     */
    markUserAsActive() {
        this.userActivityMonitor.markMessageSent();
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
     * Планирует автоматическое скрытие сообщения через указанное время.
     *
     * @param {string} type - Тип сообщения (используется для получения duration)
     * @returns {void}
     */
    scheduleAutoHide(type) {
        const duration = this.messagesProvider.getField(
            'out',
            type,
            'duration'
        );

        this.scheduler.scheduleAutoHide(duration);
    }

    /**
     * Планирует показ напоминания (follow-up), если пользователь проигнорировал приветствие.
     *
     * Вызывается только после `welcome`, если чат так и не был открыт.
     *
     * @returns {void}
     */
    scheduleFollowUpReminder() {
        if (this.scheduler.hasScheduled(SCHEDULER_TYPES.OUTER.FOLLOW_UP)) {
            return;
        }

        if (this.getLastChatOpenTime()) {
            return;
        }

        const delay = this.messagesProvider.getField(
            'out',
            'followup',
            'delay'
        );

        this.scheduler.scheduleFollowUp(delay);
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
        const delay = this.messagesProvider.getField(
            'out',
            'active_return',
            'delay',
            500
        );

        this.scheduler.scheduleActiveReturnCheck(delay);
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

        if (this.presenter.isShown) {
            return;
        }

        const delay = this.messagesProvider.getField(
            'out',
            'returning',
            'delay'
        );
        this.scheduler.scheduleReturning(delay);
    }

    /**
     * Полностью уничтожает компонент: скрывает, очищает таймеры, удаляет обработчики.
     *
     * @returns {void}
     *
     * @emits EVENTS.UI.OUTER_TIP_DESTROY
     */
    destroy() {
        this.hideMessage();

        clearTimeout(this.showTimeout);
        clearTimeout(this.hideTimeout);
        clearTimeout(this.followUpTimeout);

        this.followUpTimeout = null;

        this.presenter.destroy();
        this.eventEmitter.emit(EVENTS.UI.OUTER_TIP_DESTROY);
    }
}
