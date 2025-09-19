import { EVENTS } from '../config';
import withPrefix from '../utils/withPrefix';

/**
 * Конфигурация публичных DOM-событий.
 * Определяет, какие внутренние события должны быть доступны снаружи
 * и как они будут называться в CustomEvent.
 *
 * Формат:
 *   [внутренний ключ]: 'имя DOM-события'
 */
export const EXTERNAL_EVENTS_MAP = {
    [EVENTS.UI.CHAT_OPEN]: withPrefix('open', '.'),
    [EVENTS.UI.CHAT_CLOSE]: withPrefix('close', '.'),
    [EVENTS.UI.MESSAGE_SENT]: withPrefix('message_sent', '.'),
    [EVENTS.UI.OUTER_TIP_SHOW]: withPrefix('outer_tip_show', '.'),
    [EVENTS.UI.OUTER_TIP_HIDE]: withPrefix('outer_tip_hide', '.'),
    [EVENTS.API.REQUEST_START]: withPrefix('request_start', '.'),
    [EVENTS.API.REQUEST_DONE]: withPrefix('request_done', '.'),
    [EVENTS.API.ERROR]: withPrefix('error', '.'),
};

/**
 * Список имён внешних событий (для документации или валидации)
 */
export const EXTERNAL_EVENT_NAMES = Object.values(EXTERNAL_EVENTS_MAP);
