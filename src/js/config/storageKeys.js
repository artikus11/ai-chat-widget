import withPrefix from '../utils/withPrefix';

export const STORAGE_KEYS = {
    API: {
        ID: withPrefix('api:request:id'),
    },
    UI: {
        OUTER_TIP: {
            LAST_CHAT_OPEN: withPrefix('ui:outer-tip:last-open'),
            MESSAGE_SENT: withPrefix('ui:outer-tip:sent-message'),

            WELCOME_SHOWN: withPrefix('ui:outer-tip:welcome-shown'),
            FOLLOWUP_SHOWN: withPrefix('ui:outer-tip:followup-shown'),
            RETURNING_SHOWN: withPrefix('ui:outer-tip:returning-shown'),
            RECONNECT_SHOWN: withPrefix('ui:outer-tip:reconnect-shown'),
            ACTIVE_RETURN_SHOWN: withPrefix(
                'ui:outer-tip:active-return-shown'
            ),
        },
    },
};
