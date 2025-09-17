/**
 * Правило показа followup-подсказки для внешнего виджета
 * - показывается, если пользователь не открыл чат и не отправил сообщение
 * - показывается только один раз (если уже показывали, не показываем)
 * - показывается только если уже показывали welcome
 * - учитывает кулдаун (например, 6 часов)
 * - не показывается, если уже открывал чат
 * - не показывается, если уже отправил сообщение
 * - не показывается, если не показывали welcome
 * - не показывается, если уже показывали followup
 * - не показывается, если кулдаун не истёк
 * - не показывается, если нет текста followup в провайдере
 */
export const FollowupRule = {
    /**
     * Проверяет, соответствует ли текущее состояние пользователя условиям для показа followup-подсказки.
     *
     * @param {Object} state - Состояние пользователя
     * @param {number|null} state.lastChatOpenTime - Временная метка последнего открытия чата (timestamp), или `null`, если никогда.
     * @param {boolean} state.hasSentMessage - Флаг, указывающий, отправлял ли пользователь сообщение.
     * @param {DecisionEngine} engine - Экземпляр движка принятия решений, содержащий провайдер сообщений и вспомогательные сервисы.
     * @param {Object} context - Дополнительный контекст, который может быть полезен для правил (например, 'outer' или 'inner').
     * @return {string|null} Тип сообщения для показа ('followup') или `null`, если условия не выполнены.
     */
    matches(state, engine, context) {
        const { lastChatOpenTime, hasSentMessage } = state;
        const { storage, cooldown } = engine.helpers;

        const type = 'followup';
        const category = 'out';

        // 1. Есть ли сообщение?
        if (!engine.has(type, category)) {
            return null;
        }

        // 2. Уже показывали followup?
        if (storage.wasShown(type, category)) {
            return null;
        }

        // 3. Действует ли кулдаун (например, 6 часов)?
        if (!cooldown.canShow(type, category)) {
            return null;
        }

        // 4. Был ли показан welcome? (обязательное условие)
        if (!storage.wasShown('welcome', category)) {
            return null;
        }

        // 5. Уже открывал чат? Тогда не показываем
        if (lastChatOpenTime !== null) {
            return null;
        }

        // 6. Уже отправил сообщение?
        if (hasSentMessage) {
            return null;
        }

        // ✅ Все условия выполнены
        return type;
    },
};
