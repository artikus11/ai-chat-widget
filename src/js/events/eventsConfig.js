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
 * @property {string} UI.CHAT_OPEN - Событие: чат был открыт пользователем.
 * @property {string} UI.CHAT_CLOSE - Событие: чат был закрыт пользователем.
 * @property {string} UI.WELCOME_TIP_SHOW - Событие: показано приветственное подсказывающее сообщение.
 * @property {string} UI.WELCOME_TIP_HIDE - Событие: скрыто приветственное подсказывающее сообщение.
 * @property {string} UI.WELCOME_TIP_DESTROY - Событие: уничтожено (полностью удалено) приветственное подсказывающее сообщение.
 * @property {string} UI.TYPING_UPDATE - Событие: обновление состояния печати (например, бот начал печатать).
 * @property {string} UI.TYPING_FINISH - Событие: завершение анимации печати.
 * @property {string} UI.TYPING_STOP - Событие: остановка процесса печати (может быть принудительной).
 * @property {string} UI.GREETING_START - Событие: начало показа приветственного сообщения.
 * @property {string} UI.GREETING_FINISH - Событие: завершение показа приветственного сообщения.
 * @property {string} UI.FOLLOW_UP_SHOW - Событие: отображение follow-up (дополнительного действия/вопроса) после основного сообщения.
 *
 * @property {Object} API - События, связанные с сетевыми запросами к API.
 * @property {string} API.REQUEST_START - Событие: начало HTTP-запроса к серверу.
 * @property {string} API.CHUNK_RECEIVED - Событие: получена chunk.
 * @property {string} API.REQUEST_DONE - Событие: запрос успешно завершён и данные получены.
 * @property {string} API.ERROR - Событие: произошла ошибка при выполнении API-запроса.
 */
export const EVENTS = {
    UI: {
        CHAT_OPEN: 'ui:chat:open',
        CHAT_CLOSE: 'ui:chat:close',

        WELCOME_TIP_SHOW: 'ui:welcome-tip:show',
        WELCOME_TIP_HIDE: 'ui:welcome-tip:hide',
        WELCOME_TIP_DESTROY: 'ui:welcome-tip:destroy',

        TYPING_UPDATE: 'ui:typing:update',
        TYPING_FINISH: 'ui:typing:finish',
        TYPING_STOP: 'ui:typing:stop',

        GREETING_START: 'ui:greeting:start',
        GREETING_FINISH: 'ui:greeting:finish',
        FOLLOW_UP_SHOW: 'ui:follow-up:show',
    },
    API: {
        REQUEST_START: 'api:request:start',
        CHUNK_RECEIVED: 'api:chunk:received',
        REQUEST_DONE: 'api:request:done',
        ERROR: 'api:error',
    },
};
