import withPrefix from '../utils/withPrefix';

export const STORAGE_KEYS = {
    API: {
        ID: withPrefix('api:request:id'),
    },
    CHAT: {
        CHAT_OPEN: withPrefix('chat:open'),
        CHAT_CLOSE: withPrefix('chat:open'),
        MESSAGE_SENT: withPrefix('chat:sent-message'),
    },
    OUTER_TIP: {
        WELCOME_SHOWN: withPrefix('outer-tip:welcome-shown'),
        FOLLOWUP_SHOWN: withPrefix('outer-tip:followup-shown'),
        RETURNING_SHOWN: withPrefix('outer-tip:returning-shown'),
        RECONNECT_SHOWN: withPrefix('outer-tip:reconnect-shown'),
        ACTIVE_RETURN_SHOWN: withPrefix('outer-tip:active-return-shown'),
    },
    INNER_TIP: {
        GREETING_SHOWN: withPrefix('outer-tip:greeting-shown'),
        FOLLOWUP_SHOWN: withPrefix('outer-tip:followup-shown'),
        ERROR_SHOWN: withPrefix('outer-tip:error-shown'),
        FALLBACK_SHOWN: withPrefix('outer-tip:fallback-shown'),
    },
};
