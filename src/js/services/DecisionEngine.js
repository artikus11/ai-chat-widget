// DecisionEngine.js
/**
 * DecisionEngine отвечает за выбор подходящего сообщения на основе текущего состояния
 * и набора правил. Он взаимодействует с MessagesProvider для проверки наличия сообщений
 * и использует вспомогательные сервисы (например, хранилище и кулдауны) для принятия решений.
 *
 * @class DecisionEngine
 * @param {MessagesProvider} messagesProvider - Провайдер сообщений с текстами и настройками.
 * @param {Array} rules - Массив правил для определения подходящего сообщения.
 * @param {Object} helpers - Вспомогательные сервисы, такие как хранилище и кулдауны.
 * @example
 * const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });
 */
export class DecisionEngine {
    /**
     * Создаёт новый экземпляр движка принятия решений.
     * @param {MessagesProvider} messagesProvider - Провайдер сообщений, содержащий тексты и настройки.
     * @param {Array} rules - Массив правил для определения подходящего сообщения.
     * @param {Object} helpers - Вспомогательные сервисы, такие как хранилище и кулдауны.
     * @example
     * const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });
     * */
    constructor(messagesProvider, rules, helpers) {
        this.messagesProvider = messagesProvider;
        this.rules = rules;
        this.helpers = helpers; // { storage, cooldown }
    }

    /**
     * Определяет, какое сообщение следует показать, на основе состояния пользователя.
     * Проходит по всем правилам в порядке приоритета и возвращает первое подходящее сообщение.
     * Если ни одно правило не сработало, возвращает `null`.
     * @param {Object} state - Состояние пользователя
     * @param {number|null} state.lastChatOpenTime - Временная метка последнего открытия чата (timestamp), или `null`, если никогда.
     * @param {boolean} state.hasSentMessage - Флаг, указывающий, отправлял ли пользователь сообщение.
     * @param {Object} [options={}] - Дополнительные опции для определения сообщения.
     * @param {string} [options.context] - Контекст, который может быть полезен для правил (например, 'outer' или 'inner').
     * @return {string|null} Тип сообщения для показа (например, 'welcome', 'followup') или `null`, если ничего не подходит.
     * @example
     * const messageType = engine.determine(state);
     * if (messageType) {
     *   // Показать сообщение соответствующего типа
     * }
     * */
    determine(state, options = {}) {
        const { context } = options;

        for (const rule of this.rules) {
            const result = rule.matches(state, this, context);
            if (result) {
                return result;
            }
        }
        return null;
    }

    /**
     * Проверяет, есть ли сообщение данного типа в провайдере.
     * @param {string} type - Тип сообщения (например, 'welcome', 'followup').
     * @param {string} [category='out'] - Категория сообщения ('in' или 'out').
     * @return {boolean} `true`, если сообщение данного типа существует.
     * @example
     * if (engine.has('welcome')) {
     *   // Сообщение 'welcome' доступно
     * }
     * */

    has(type, category = 'out') {
        return this.messagesProvider.has(category, type);
    }
}
