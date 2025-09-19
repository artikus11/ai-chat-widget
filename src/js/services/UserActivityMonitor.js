// services/UserActivityMonitor.js
import { EVENTS } from '@js/config';

/**
 * Сервис для отслеживания активности пользователя.
 *
 * Отвечает за:
 * - фиксацию времени открытия чата
 * - фиксацию отправки сообщения
 * - определение "возврата" на страницу
 *
 * @class UserActivityMonitor
 */
export class UserActivityMonitor {
    /**
     * Создаёт экземпляр монитора активности.
     *
     * @param {EventEmitter} eventEmitter - глобальный эмиттер событий
     * @param {UserActivityStorage} storage - хранилище данных активности
     * @param {Logger} logger
     */
    constructor(eventEmitter, storage, logger) {
        this.eventEmitter = eventEmitter;
        this.storage = storage;
        this.logger = logger;

        this.listeners = [];
        this.isActive = false;
    }

    /**
     * Запускает прослушивание событий.
     */
    start() {
        if (this.isActive) {
            return;
        }
        this.isActive = true;

        this.#addListeners();
        this.logger.info('[UserActivityMonitor] Запущен');
    }

    /**
     * Останавливает прослушивание.
     */
    stop() {
        if (!this.isActive) {
            return;
        }
        this.isActive = false;

        this.#removeListeners();
        this.logger.info('[UserActivityMonitor] Остановлен');
    }

    /**
     * Добавляет все обработчики.
     * @private
     */
    #addListeners() {
        // UI-события
        const onChatOpen = () => this.markChatOpen();
        const onChatClose = () => this.markChatClose();
        const onMessageSent = () => this.markMessageSent();

        this.eventEmitter.on(EVENTS.UI.CHAT_OPEN, onChatOpen);
        this.eventEmitter.on(EVENTS.UI.CHAT_CLOSE, onChatClose);
        this.eventEmitter.on(EVENTS.UI.MESSAGE_SENT, onMessageSent);

        // DOM-события
        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                this.eventEmitter.emit(EVENTS.UI.PAGE_RETURN);
            }
        };

        const onFocus = () => {
            this.eventEmitter.emit(EVENTS.UI.PAGE_RETURN);
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('focus', onFocus);

        // Сохраняем для удаления
        this.listeners.push(
            () => this.eventEmitter.off(EVENTS.UI.CHAT_OPEN, onChatOpen),
            () => this.eventEmitter.off(EVENTS.UI.MESSAGE_SENT, onMessageSent),
            () =>
                document.removeEventListener(
                    'visibilitychange',
                    onVisibilityChange
                ),
            () => window.removeEventListener('focus', onFocus)
        );
    }

    /**
     * Удаляет все обработчики.
     * @private
     */
    #removeListeners() {
        this.listeners.forEach(remove => remove());
        this.listeners = [];
    }

    /**
     * Отмечает, что чат был открыт.
     */
    markChatOpen() {
        try {
            this.storage.markChatOpen();
            this.logger.info('[UserActivityMonitor] Чат открыт');
        } catch (e) {
            this.logger.warn(
                '[UserActivityMonitor] Ошибка при сохранении времени открытия чата:',
                e
            );
        }
    }

    /**
     * Отмечает, что чат был закрыт.
     */
    markChatClose() {
        try {
            this.storage.markChatClose();
            this.logger.info('[UserActivityMonitor] Чат закрыт');
        } catch (e) {
            this.logger.warn(
                '[UserActivityMonitor] Ошибка при сохранении времени закрытия чата:',
                e
            );
        }
    }

    /**
     * Отмечает, что сообщение было отправлено.
     */
    markMessageSent() {
        try {
            this.storage.markMessageSent();
            this.storage.markLastMessageSent();
            this.logger.info('[UserActivityMonitor] Сообщение отправлено');
        } catch (e) {
            this.logger.warn(
                '[UserActivityMonitor] Ошибка при сохранении времени отправки:',
                e
            );
        }
    }

    /**
     * Возвращает время последнего открытия чата.
     * @returns {number|null}
     */
    getLastChatOpenTime() {
        return this.storage.getLastChatOpenTime();
    }

    getLastMessageSentTime() {
        return this.storage.getLastMessageSentTime();
    }

    /**
     * Было ли отправлено хотя бы одно сообщение.
     * @returns {boolean}
     */
    hasSentMessage() {
        return this.storage.hasSentMessage();
    }

    /**
     * Полная очистка.
     */
    destroy() {
        this.stop();
    }
}
