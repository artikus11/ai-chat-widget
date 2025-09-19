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
     * @param {Scheduler} scheduler - Экземпляр базового планировщика (Scheduler).
     * @param {Logger} logger - Логгер для вывода информации (методы: info, warn, error).
     * @example
     * const scheduler = new TipScheduler(eventEmitter, logger);
     */
    constructor(scheduler, eventEmitter, logger) {
        this.scheduler = scheduler;
        this.eventEmitter = eventEmitter;
        this.logger = logger;

        this.timeouts = new Map();
    }

    /**
     * Планирует показ подсказки.
     */
    scheduleShow(delay, messageType) {
        this.scheduler.schedule(SCHEDULER_TYPES.OUTER.SHOW, delay, () => {
            this.logger.info(
                `[TipScheduler] Триггер: ${EVENTS.UI.OUTER_TIP_SCHEDULE_SHOW}`
            );
            this.eventEmitter.emit(EVENTS.UI.OUTER_TIP_SCHEDULE_SHOW, {
                type: messageType,
            });
        });
    }

    /**
     * Планирует авто-скрытие.
     */
    scheduleAutoHide(duration) {
        this.scheduler.schedule(
            SCHEDULER_TYPES.OUTER.AUTO_HIDE,
            duration,
            () => {
                this.logger.info(
                    `[TipScheduler] Триггер: ${EVENTS.UI.OUTER_TIP_AUTO_HIDE}`
                );
                this.eventEmitter.emit(EVENTS.UI.OUTER_TIP_AUTO_HIDE);
            }
        );
    }

    /**
     * Планирует follow-up напоминание.
     */
    scheduleFollowUp(delay) {
        this.scheduler.schedule(SCHEDULER_TYPES.OUTER.FOLLOW_UP, delay, () => {
            this.logger.info(
                `[TipScheduler] Триггер: ${EVENTS.UI.OUTER_TIP_FOLLOW_UP_TRIGGER}`
            );
            this.eventEmitter.emit(EVENTS.UI.OUTER_TIP_FOLLOW_UP_TRIGGER);
        });
    }

    /**
     * Планирует проверку active_return.
     */
    scheduleActiveReturnCheck(delay) {
        this.scheduler.schedule(
            SCHEDULER_TYPES.OUTER.ACTIVE_RETURN,
            delay,
            () => {
                this.logger.info(
                    `[TipScheduler] Триггер: ${EVENTS.UI.OUTER_TIP_ACTIVE_RETURN_TRIGGER}`
                );
                this.eventEmitter.emit(
                    EVENTS.UI.OUTER_TIP_ACTIVE_RETURN_TRIGGER
                );
            }
        );
    }

    /**
     * Планирует returning-подсказку.
     */
    scheduleReturning(delay) {
        this.scheduler.schedule(SCHEDULER_TYPES.OUTER.RETURNING, delay, () => {
            this.logger.info(
                `[TipScheduler] Триггер: ${EVENTS.UI.OUTER_TIP_RETURNING_TRIGGER}`
            );
            this.eventEmitter.emit(EVENTS.UI.OUTER_TIP_RETURNING_TRIGGER);
        });
    }

    /**
     * Отменяет таймер по внутреннему типу.
     * @param {string} type - Внутренний тип таймера (ключ в this.timeouts)
     * @returns {void}
     * @example
     * scheduler.cancel(TIP_SCHEDULER_TYPES.OUTER.SHOW);
     */
    cancel(type) {
        this.scheduler.cancel(type);
    }

    /**
     * Отменяет все таймеры.
     * @returns {void}
     * @example
     * scheduler.clearAll(); // Отменяет все запланированные таймеры
     */
    clearAll() {
        this.scheduler.clearAll();
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
        this.scheduler.hasScheduled(type);
    }
}
