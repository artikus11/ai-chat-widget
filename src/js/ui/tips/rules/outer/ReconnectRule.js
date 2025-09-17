/**
 * Правило для показа reconnect-сообщения.
 *
 * Условия показа:
 * - Сообщение существует в провайдере
 * - Сообщение еще не показывали
 * - Не действует кулдаун (например, раз в 24 часа)
 * - Пользователь подходит по времени и активности (например, вернулся после длительного отсутствия и не отправил сообщение)
 * - Иначе не показываем.
 */
export const ReconnectRule = {
    /**
     * Проверяет, соответствует ли текущее состояние пользователя условиям для показа приветственного сообщения.
     *
     * @param {Object} state - Состояние пользователя
     * @param {number|null} state.lastChatOpenTime - Временная метка последнего открытия чата (timestamp), или `null`, если никогда.
     * @param {boolean} state.hasSentMessage - Флаг, указывающий, отправлял ли пользователь сообщение.
     * @param {boolean} state.isEligibleForReconnect - Флаг, указывающий, подходит ли пользователь для показа reconnect-сообщения.
     * @param {DecisionEngine} engine - Экземпляр движка принятия решений, содержащий провайдер сообщений и вспомогательные сервисы.
     * @param {Object} context - Дополнительный контекст, который может быть полезен для правил (например, 'outer' или 'inner').
     * @returns {string|null} Тип сообщения для показа ('welcome') или `null`, если условия не выполнены.
     */
    matches(state, engine, context) {
        const { isEligibleForReconnect } = state;
        const { storage, cooldown } = engine.helpers;

        const type = 'reconnect';
        const category = 'out';

        // 1. Существует ли?
        if (!engine.has(type, category)) {
            return null;
        }

        // 2. Уже показывали?
        if (storage.wasShown(type, category)) {
            return null;
        }

        // 3. Действует ли кулдаун? (например, раз в 24 часа)
        if (!cooldown.canShow(type, category)) {
            return null;
        }

        // 4. Подходит по времени и активности?
        if (!isEligibleForReconnect) {
            return null;
        }

        // ✅ Все условия выполнены
        return type; // 'reconnect'
    },
};
