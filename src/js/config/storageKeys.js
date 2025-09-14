import withPrefix from '../utils/withPrefix';

export const STORAGE_KEYS = {
    API: {
        ID: withPrefix('api:request:id'),
    },
    UI: {
        WELCOME_TIP: {
            LAST_CHAT_OPEN: withPrefix('ui:welcome-tip:last-open'),
            MESSAGE_SENT: withPrefix('ui:welcome-tip:sent-message'),

            WELCOME_SHOWN: withPrefix('ui:welcome-tip:welcome-shown'),
            FOLLOWUP_SHOWN: withPrefix('ui:welcome-tip:followup-shown'),
            RECONNECT_SHOWN: withPrefix('ui:welcome-tip:reconnect-shown'),
            ACTIVE_RETURN_SHOWN: withPrefix(
                'ui:welcome-tip:active-return-shown'
            ),
        },
    },
};
