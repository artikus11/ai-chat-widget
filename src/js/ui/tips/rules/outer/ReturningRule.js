/**
 * Правило для показа приветственного сообщения пользователям, которые вернулись на сайт спустя 2–10 минут после
 * последнего посещения, но не отправляли сообщения в чат.
 *
 * Условия:
 * 1. Тип 'returning' существует в провайдере сообщений.
 * 2. Сообщение этого типа ранее не показывалось (проверка через TipStorage).
 * 3. Не действует кулдаун на показ этого типа сообщений (проверка через TipCooldown).
 * 4. Пользователь открывал чат ранее (lastChatOpenTime !== null).
 * 5. Пользователь не отправлял сообщения в чат (hasSentMessage === false).
 * 6. Пользователь вернулся на сайт спустя 2–10 минут после последнего посещения (isRecentlyReturned === true).
 *
 * Если все условия выполнены, возвращается тип 'returning' для показа соответствующего сообщения.
 * В противном случае возвращается null.
 */
export const ReturningRule = {
    /**
     * Проверяет, соответствует ли текущее состояние пользователя условиям для показа приветственного сообщения.
     *
     * @param {Object} state - Состояние пользователя
     * @param {number|null} state.lastChatOpenTime - Временная метка последнего открытия чата (timestamp), или `null`, если никогда.
     * @param {boolean} state.hasSentMessage - Флаг, указывающий, отправлял ли пользователь сообщение.
     * @param {boolean} state.isRecentlyReturned - Флаг, указывающий, вернулся ли пользователь в диапазоне 2–10 минут.
     * @param {DecisionEngine} engine - Экземпляр движка принятия решений, содержащий провайдер сообщений и вспомогательные сервисы.
     * @param {Object} context - Дополнительный контекст, который может быть полезен для правил (например, 'outer' или 'inner').
     * @returns {string|null} Тип сообщения для показа ('welcome') или `null`, если условия не выполнены.
     */
    matches(state, engine, context) {
        const { lastChatOpenTime, hasSentMessage, isRecentlyReturned } = state;
        const { storage, cooldown } = engine.helpers;

        const type = 'returning';
        const category = 'out';

        // Есть ли вообще такое сообщение?
        if (!engine.has(type, category)) {
            return null;
        }

        // Прошёл ли кулдаун?
        if (!cooldown.canShow(type, category)) {
            return null;
        }

        // Основные условия по действию
        if (lastChatOpenTime === null) {
            return null; // Не открывал чат
        }

        // Уже писал — не нуждается
        if (hasSentMessage) {
            return null;
        }

        // Не в диапазоне 2–10 ми
        if (!isRecentlyReturned) {
            return null;
            н;
        }

        //  Был ли показан welcome? (обязательное условие)
        if (!storage.wasShown('welcome', category)) {
            return null; // Ещё не видел приветствие — сначала welcome
        }

        //  Если есть followup, но его ещё не показывали — не показываем returning
        if (
            engine.has('followup', category) &&
            !storage.wasShown('followup', category)
        ) {
            return null;
        }

        return type;
    },
};
