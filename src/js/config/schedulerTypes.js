// config/tipSchedulerTypes.js

/**
 * Типы планировщиков подсказок.
 * Используются для идентификации различных сценариев показа и скрытия подсказок.
 * @enum {Object}
 * @property {Object} OUTER - Типы для внешних подсказок (вне чата).
 * @property {Object} INNER - Типы для внутренних подсказок (внутри чата).
 */
export const SCHEDULER_TYPES = {
    OUTER: {
        SHOW: 'outer-tip:show',
        AUTO_HIDE: 'outer-tip:auto-hide',
        FOLLOW_UP: 'outer-tip:follow-up',
        RETURNING: 'outer-tip:returning',
        ACTIVE_RETURN: 'outer-tip:active-return',
        RECONNECT: 'outer-tip:reconnect',
    },
    INNER: {
        SHOW: 'inner-tip:show',
        AUTO_HIDE: 'inner-tip:auto-hide',
        GREETING_START: 'inner-tip:greeting-start',
        FALLBACK_SHOW: 'inner-tip:fallback-show',
    },
};
