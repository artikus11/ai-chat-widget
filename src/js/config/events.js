import withPrefix from '../utils/withPrefix';

/**
 * Константа, содержащая иерархическую структуру строковых ключей,
 * используемых как типы событий в приложении.
 *
 * События разделены на логические группы:
 * - `UI` — события, связанные с пользовательским интерфейсом.
 * - `API` — события, связанные с взаимодействием с API.
 *
 * @type {Object}
 * @property {Object} UI - События, связанные с UI-компонентами и их состоянием.
 *
 * @property {Object} API - События, связанные с сетевыми запросами к API.
 */
export const EVENTS = {
    UI: {
        PAGE_RETURN: withPrefix('ui:page:return'),

        CHAT_OPEN: withPrefix('ui:chat:open'),
        CHAT_CLOSE: withPrefix('ui:chat:close'),

        OUTER_TIP_SHOW: withPrefix('ui:outer-tip:show'),
        OUTER_TIP_HIDE: withPrefix('ui:outer-tip:hide'),
        OUTER_TIP_DESTROY: withPrefix('ui:outer-tip:destroy'),

        // --- События планировщика (новые) ---
        OUTER_TIP_SCHEDULE_SHOW: withPrefix('ui:outer-tip:schedule:show'),
        OUTER_TIP_AUTO_HIDE: withPrefix('ui:outer-tip:auto-hide'),
        OUTER_TIP_FOLLOW_UP_TRIGGER: withPrefix(
            'ui:outer-tip:follow-up:trigger'
        ),
        OUTER_TIP_ACTIVE_RETURN_TRIGGER: withPrefix(
            'ui:outer-tip:active-return:trigger'
        ),
        OUTER_TIP_RETURNING_TRIGGER: withPrefix(
            'ui:outer-tip:returning:trigger'
        ),

        TYPING_UPDATE: withPrefix('ui:typing:update'),
        TYPING_FINISH: withPrefix('ui:typing:finish'),
        TYPING_STOP: withPrefix('ui:typing:stop'),

        GREETING_START: withPrefix('ui:greeting:start'),
        GREETING_FINISH: withPrefix('ui:greeting:finish'),
        FOLLOW_UP_SHOW: withPrefix('ui:follow-up:show'),

        MESSAGE_SENT: withPrefix('ui:message:sent'),
        MESSAGE_SEND_ATTEMPT: withPrefix('ui:message:send-attempt'),
    },
    API: {
        REQUEST_START: withPrefix('api:request:start'),
        CHUNK_RECEIVED: withPrefix('api:chunk:received'),
        REQUEST_DONE: withPrefix('api:request:done'),
        ERROR: withPrefix('api:error'),
    },
};
