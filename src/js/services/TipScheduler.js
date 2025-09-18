// services/TipScheduler.js
import { EVENTS, SCHEDULER_TYPES } from '@js/config';

/**
 * Класс для управления планировкой событий подсказок.
 * Позволяет планировать, отменять и проверять таймеры для различных сценариев.
 *
 * Использует внутренние типы из SCHEDULER_TYPES для идентификации таймеров.
 *
 * @class TipScheduler
 */
export class TipScheduler {
    /**
     * Создаёт новый экземпляр планировщика подсказок.
     *
     * @param {EventEmitter} eventEmitter - Экземпляр EventEmitter для эмита событий.
     * @param {Logger} logger - Логгер для вывода информации (методы: info, warn, error).
     * @example
     * const scheduler = new TipScheduler(eventEmitter, logger);
     */
    constructor(eventEmitter, logger) {
        this.eventEmitter = eventEmitter;
        this.logger = logger;

        this.timeouts = new Map();
    }

    /**
     * Универсальный метод планирования таймера.
     *
     * @param {string} schedulerType - Внутренний тип таймера (ключ в this.timeouts)
     * @param {number} delay - Задержка в миллисекундах
     * @param {string} event - Событие, которое нужно эмитить
     * @param {Object} [payload] - Данные события
     * @returns {void}
     * @private
     * @example
     * this.#schedule(
     *   SCHEDULER_TYPES.OUTER.SHOW,
     *   5000,
     *   EVENTS.UI.OUTER_TIP_SCHEDULE_SHOW,
     *   { type: 'welcome' }
     * );
     */
    #schedule(schedulerType, delay, event, payload = {}) {
        this.cancel(schedulerType);

        const timeoutId = setTimeout(() => {
            this.timeouts.delete(schedulerType);
            this.logger.info(`[TipScheduler] Триггер: ${event}`);

            if (payload !== undefined) {
                this.eventEmitter.emit(event, payload);
            } else {
                this.eventEmitter.emit(event);
            }
        }, delay);

        this.timeouts.set(schedulerType, timeoutId);
        this.logger.info(
            `[TipScheduler] Запланировано: ${event} через ${delay}мс`
        );
    }

    /**
     * Планирует показ подсказки.
     * @param {number} delay
     * @param {string} messageType
     * @returns {void}
     * @example
     * scheduler.scheduleShow(3000, 'welcome'); // Планирует показ welcome через 3 секунды
     *
     */
    scheduleShow(delay, messageType) {
        this.#schedule(
            SCHEDULER_TYPES.OUTER.SHOW,
            delay,
            EVENTS.UI.OUTER_TIP_SCHEDULE_SHOW,
            { type: messageType }
        );
    }

    /**
     * Планирует авто-скрытие.
     * @param {number} duration
     * @returns {void}
     * @example
     * scheduler.scheduleAutoHide(10000); // Планирует авто-скрытие через 10 секунд
     */
    scheduleAutoHide(duration) {
        this.#schedule(
            SCHEDULER_TYPES.OUTER.AUTO_HIDE,
            duration,
            EVENTS.UI.OUTER_TIP_AUTO_HIDE
        );
    }

    /**
     * Планирует follow-up напоминание.
     * @param {number} delay
     * @returns {void}
     * @example
     * scheduler.scheduleFollowUp(15000); // Планирует follow-up через 15 секунд
     */
    scheduleFollowUp(delay) {
        this.#schedule(
            SCHEDULER_TYPES.OUTER.FOLLOW_UP,
            delay,
            EVENTS.UI.OUTER_TIP_FOLLOW_UP_TRIGGER
        );
    }

    /**
     * Планирует проверку active_return.
     * @param {number} delay
     * @returns {void}
     * @example
     * scheduler.scheduleActiveReturnCheck(5000); // Планирует проверку active_return через 5 секунд
     */
    scheduleActiveReturnCheck(delay) {
        this.#schedule(
            SCHEDULER_TYPES.OUTER.ACTIVE_RETURN,
            delay,
            EVENTS.UI.OUTER_TIP_ACTIVE_RETURN_TRIGGER
        );
    }

    /**
     * Планирует returning-подсказку.
     * @param {number} delay
     * @returns {void}
     * @example
     * scheduler.scheduleReturning(10000); // Планирует returning через 10 секунд
     */
    scheduleReturning(delay) {
        this.#schedule(
            SCHEDULER_TYPES.OUTER.RETURNING,
            delay,
            EVENTS.UI.OUTER_TIP_RETURNING_TRIGGER
        );
    }

    /**
     * Отменяет таймер по внутреннему типу.
     * @param {string} type - Внутренний тип таймера (ключ в this.timeouts)
     * @returns {void}
     * @example
     * scheduler.cancel(TIP_SCHEDULER_TYPES.OUTER.SHOW);
     */
    cancel(type) {
        const timeoutId = this.timeouts.get(type);
        if (timeoutId) {
            clearTimeout(timeoutId);
            this.timeouts.delete(type);
            this.logger.info(`[TipScheduler] Отменён таймер: ${type}`);
        }
    }

    /**
     * Отменяет все таймеры.
     * @returns {void}
     * @example
     * scheduler.clearAll(); // Отменяет все запланированные таймеры
     */
    clearAll() {
        for (const [type, id] of this.timeouts) {
            clearTimeout(id);
            this.logger.info(`[TipScheduler] Отменён таймер: ${type}`);
        }
        this.timeouts.clear();
    }

    /**
     * Проверяет, запланирован ли таймер по внутреннему типу.
     * @param {string} type - Внутренний тип таймера (ключ в this.timeouts)
     * @returns {boolean} true, если таймер запланирован, иначе false
     * @example
     * if (scheduler.hasScheduled(TIP_SCHEDULER_TYPES.OUTER.SHOW)) {
     *   // Таймер на показ уже запланирован
     * }
     */
    hasScheduled(type) {
        return this.timeouts.has(type);
    }
}
