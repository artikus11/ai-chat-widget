import { STORAGE_KEYS } from '../../config';

/**
 * Движок принятия решений о показе внешних подсказок (всплывающих сообщений вне чата).
 *
 * Определяет, какое сообщение следует показать пользователю на основе его поведения:
 * - первый визит
 * - возвращение после отсутствия
 * - активность в чате
 *
 * Учитывает кулдауны через localStorage, чтобы избежать спама.
 *
 * @class OuterTipsDecisionEngine
 */
export class OuterTipsDecisionEngine {
    /**
     * Стандартные значения кулдаунов (в часах) для каждого типа сообщения,
     * если не переопределены в `messagesProvider`.
     *
     * @type {Object.<string, number>}
     * @property {number} welcome - 24 часа
     * @property {number} followup - 6 часов
     * @property {number} returning - 6 часов
     * @property {number} reconnect - 24 часа
     * @property {number} active_return - 24 часа
     * @readonly
     */
    static DEFAULT_COOLDOWN_HOURS = {
        welcome: 24,
        followup: 6,
        returning: 6,
        reconnect: 24,
        active_return: 24,
    };

    /**
     * Создаёт новый экземпляр движка принятия решений.
     *
     * @param {MessagesProvider} messagesProvider - Провайдер сообщений, содержащий тексты и настройки.
     * @param {Storage} [storage=localStorage] - Хранилище (например, localStorage), где сохраняются метки показа.
     *
     * @example
     * const engine = new OuterTipsDecisionEngine(messagesProvider);
     */
    constructor(messagesProvider, storage = localStorage) {
        this.messagesProvider = messagesProvider;
        this.storage = storage;
    }

    /**
     * Определяет, какое сообщение следует показать, на основе состояния пользователя.
     *
     * Логика приоритетов:
     * 1. welcome — первый визит, чат ещё не открывался
     * 2. followup — игнорирует >30 сек после первого посещения
     * 3. returning — открывал чат, но не писал, был ≤10 минут назад
     * 4. reconnect — писал ранее, вернулся через >10 мин, но не более недели
     * 5. active_return — перешёл на страницу после отправки сообщения или перегерузил страницу
     *
     * @param {Object} state - Состояние пользователя
     * @param {number|null} state.lastChatOpenTime - Временная метка последнего открытия чата (timestamp), или `null`, если никогда.
     * @param {boolean} state.hasSentMessage - Было ли когда-либо отправлено сообщение.
     * @returns {string|null} Тип сообщения (`'welcome'`, `'followup'`, и т.д.) или `null`, если показывать нечего.
     *
     * @example
     * engine.determine({
     *   lastChatOpenTime: null,
     *   hasSentMessage: false
     * }); // → 'welcome'
     */
    determine(state) {
        const { lastChatOpenTime, hasSentMessage } = state;

        const timeSinceOpen =
            lastChatOpenTime !== null
                ? Date.now() - lastChatOpenTime
                : Infinity;

        const recentlyActive =
            timeSinceOpen >= 1000 * 60 * 2 &&  // был хотя бы 2 мин
            timeSinceOpen <= 1000 * 60 * 10; // и не больше 10 мин назад
        const tooLongAgo = timeSinceOpen >= 1000 * 60 * 60 * 24 * 7; // >7 дней

        // 1. welcome — первый визит
        if (
            lastChatOpenTime === null &&
            !hasSentMessage &&
            this.has('welcome') &&
            this.canShow('welcome')
        ) {
            return 'welcome';
        }

        // 2. followup — новый, игнорирует >30 сек (показывается через scheduleFollowUpReminder)
        if (
            lastChatOpenTime === null &&
            !hasSentMessage &&
            this.has('followup') &&
            this.canShow('followup')
        ) {
            return 'followup';
        }

        // 3. returning — открывал, но не писал, и был ≤10 мин назад
        if (
            lastChatOpenTime !== null &&
            !hasSentMessage &&
            recentlyActive &&
            this.has('returning') &&
            this.canShow('returning')
        ) {
            return 'returning';
        }

        // 4. reconnect — писал, но давно (>10 мин), но не более недели
        if (
            !recentlyActive &&
            hasSentMessage &&
            !tooLongAgo &&
            this.has('reconnect') &&
            this.canShow('reconnect')
        ) {
            return 'reconnect';
        }

        // 5. active_return — писал ранее, перешёл на страницу
        if (
            hasSentMessage &&
            !this.hasSeenRecently('active_return') &&
            this.has('active_return') &&
            this.canShow('active_return')
        ) {
            return 'active_return';
        }

        return null;
    }

    /**
     * Проверяет, существует ли сообщение указанного типа во внешнем провайдере.
     *
     * @param {string} type - Тип сообщения, например `'welcome'`, `'followup'`.
     * @returns {boolean} `true`, если сообщение существует в пространстве `'out'`.
     *
     * @example
     * engine.has('welcome'); // → true
     */
    has(type) {
        return this.messagesProvider.has('out', type);
    }

    /**
     * Проверяет, можно ли показать сообщение, учитывая кулдаун (интервал между показами).
     *
     * Если `cooldownHours === 0`, сообщение можно показывать всегда.
     * Иначе проверяется временная метка в хранилище.
     *
     * @param {string} type - Тип сообщения.
     * @returns {boolean} `true`, если сообщение можно показать.
     *
     * @example
     * engine.canShow('followup'); // → true, если прошло больше 6 часов с последнего показа
     */
    canShow(type) {
        const cooldownHours = this.getCooldownHours(type);

        // Если 0 — разрешаем всегда
        if (cooldownHours === 0) {
            return true;
        }

        const key = this.getStorageKey(type);
        if (!key) {
            return true;
        }

        const raw = this.storage.getItem(key);
        if (!raw) {
            return true;
        }

        try {
            const data = JSON.parse(raw);
            const last = new Date(data.timestamp).getTime();
            const hoursSince = (Date.now() - last) / (1000 * 60 * 60);
            return hoursSince >= cooldownHours;
        } catch {
            return true;
        }
    }
    /**
     * Проверяет, видел ли пользователь сообщение "недавно" (по умолчанию — за последние 24 часа).
     * Используется, например, для `active_return`, чтобы не показывать часто.
     *
     * @param {string} type - Тип сообщения.
     * @param {number} [hours=24] - Сколько часов считается "недавним".
     * @returns {boolean} `true`, если сообщение было показано менее `hours` назад.
     *
     * @example
     * engine.hasSeenRecently('active_return'); // → true, если показывали <24ч назад
     */
    hasSeenRecently(type, hours = 24) {
        const key = this.getStorageKey(type);
        const raw = this.storage.getItem(key);
        if (!raw) {
            return false;
        }

        try {
            const data = JSON.parse(raw);
            const last = new Date(data.timestamp).getTime();
            const hoursSince = (Date.now() - last) / (1000 * 60 * 60);
            return hoursSince < hours;
        } catch {
            return true;
        }
    }

    /**
     * Возвращает ключ хранилища для заданного типа сообщения.
     *
     * @param {string} type - Тип сообщения (`'welcome'`, `'followup'` и т.д.).
     * @returns {string|null} Ключ из `STORAGE_KEYS`, или `null`, если не найден.
     *
     * @example
     * engine.getStorageKey('welcome'); // → 'ui.welcome_tip.welcome_shown'
     */
    getStorageKey(type) {
        const map = {
            welcome: STORAGE_KEYS.UI.OUTER_TIP.WELCOME_SHOWN,
            followup: STORAGE_KEYS.UI.OUTER_TIP.FOLLOWUP_SHOWN,
            returning: STORAGE_KEYS.UI.OUTER_TIP.RETURNING_SHOWN,
            reconnect: STORAGE_KEYS.UI.OUTER_TIP.RECONNECT_SHOWN,
            active_return: STORAGE_KEYS.UI.OUTER_TIP.ACTIVE_RETURN_SHOWN,
        };
        return map[type] || null;
    }

    /**
     * Возвращает длительность кулдауна в часах для указанного типа сообщения.
     *
     * Значение берётся из `messagesProvider`, если задано, иначе — из `DEFAULT_COOLDOWN_HOURS`.
     *
     * @param {string} type - Тип сообщения.
     * @returns {number} Количество часов, которое должно пройти перед повторным показом.
     *
     * @example
     * engine.getCooldownHours('followup'); // → 6 (или переопределённое значение)
     */
    getCooldownHours(type) {
        return this.messagesProvider.getField(
            'out',
            type,
            'cooldownHours',
            OuterTipsDecisionEngine.DEFAULT_COOLDOWN_HOURS[type]
        );
    }
}
