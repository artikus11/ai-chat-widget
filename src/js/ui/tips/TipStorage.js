

export class TipStorage {
    static TIP_STORAGE_MAP = {
        out: {
            welcome: ['OUTER_TIP', 'WELCOME_SHOWN'],
            followup: ['OUTER_TIP', 'FOLLOWUP_SHOWN'],
            returning: ['OUTER_TIP', 'RETURNING_SHOWN'],
            active_return: ['OUTER_TIP', 'ACTIVE_RETURN_SHOWN'],
            reconnect: ['OUTER_TIP', 'RECONNECT_SHOWN'],
        },
        in: {
            greeting: ['INNER_TIP', 'GREETING_SHOWN'],
            followup: ['INNER_TIP', 'FOLLOWUP_SHOWN'],
            error: ['INNER_TIP', 'ERROR_SHOWN'],
            fallback: ['INNER_TIP', 'FALLBACK_SHOWN'],
        }
    };

    constructor(keysProvider, storage = localStorage) {
        this.storage = storage;
        this.keysProvider = keysProvider;
    }

    /**
     * Retrieves a key for the specified section and name using the keysProvider.
     *
     * @param {string} section - The section to retrieve the key from.
     * @param {string} name - The name associated with the key.
     * @returns {*} The key retrieved from the keysProvider.
     */
    getKey(section, name) {
        return this.keysProvider.get(section, name);
    }

    /**
     * Получить ключ хранилища для типа подсказки по типу сообщения
     * @param {string} type - тип подсказки (welcome, followup, etc.)
     * @param {string} category - категория подсказки ('in' или 'out')
     * @returns {string|null}
     */
    getKeyByType(type, category = 'out') {
        const categoryMap = TipStorage.TIP_STORAGE_MAP[category];

        if (!categoryMap) {
            console.warn(`[TipStorage] Неопределена секция: ${category}`);
            return null;
        }

        const [section, keyName] = categoryMap[type] || [];

        if (!section || !keyName) {
            console.warn(`[TipStorage] Unknown type: ${type} for category: ${category}`);
            return null;
        }

        return this.keysProvider.get(section, keyName);
    }

    /**
     * Получить timestamp для типа подсказки
     * @param {string} type - тип подсказки
     * @param {string} category - категория подсказки ('in' или 'out')
     * @returns {number|null} timestamp в миллисекундах или null если не найден
     */
    getTimestamp(type, category = 'out') {
        const key = this.getKeyByType(type, category);
        if (!key) return null;

        try {
            const raw = this.storage.getItem(key);
            if (!raw) return null;

            const data = JSON.parse(raw);
            return data.timestamp ? new Date(data.timestamp).getTime() : null;
        } catch (error) {
            console.warn(`[TipStorage] Error reading timestamp for ${type}:`, error);
            return null;
        }
    }

    /**
     * Установить timestamp для типа подсказки
     * @param {string} type - тип подсказки
     * @param {string} category - категория подсказки ('in' или 'out')
     * @param {Date|number|string} timestamp - дата/время
     * @returns {boolean} успешно ли установлено
     */
    setTimestamp(type, category = 'out', timestamp = new Date()) {
        const key = this.getKeyByType(type, category);
        if (!key) return false;

        try {
            const date = new Date(timestamp);
            const data = JSON.stringify({
                timestamp: date.toISOString(),
                type,
                category
            });

            this.storage.setItem(key, data);
            return true;
        } catch (error) {
            console.warn(`[TipStorage] Error setting timestamp for ${type}:`, error);
            return false;
        }
    }

    /**
     * Проверить, была ли показана подсказка
     * @param {string} type - тип подсказки
     * @param {string} category - категория подсказки ('in' или 'out')
     * @returns {boolean}
     */
    hasBeenShown(type, category = 'out') {
        return this.getTimestamp(type, category) !== null;
    }

    /**
     * Очистить timestamp для типа подсказки
     * @param {string} type - тип подсказки
     * @param {string} category - категория подсказки ('in' или 'out')
     */
    clearTimestamp(type, category = 'out') {
        const key = this.getKeyByType(type, category);
        if (key) {
            this.storage.removeItem(key);
        }
    }

    /**
     * Получить все timestamps для категории
     * @param {string} category - категория подсказки ('in' или 'out')
     * @returns {Object} объект с timestamps для всех типов категории
     */
    getAllTimestamps(category = 'out') {
        const result = {};
        const categoryMap = TipStorage.TIP_STORAGE_MAP[category];

        if (!categoryMap) return result;

        for (const [type] of Object.entries(categoryMap)) {
            result[type] = this.getTimestamp(type, category);
        }

        return result;
    }
}

// Примеры использования:
// const tipStorage = new TipStorage();

// 1. Получение ключа
// const welcomeKey = tipStorage.getKey('welcome', 'out');

// 2. Получение timestamp
// const welcomeTimestamp = tipStorage.getTimestamp('welcome', 'out');

// 3. Установка timestamp
// tipStorage.setTimestamp('welcome', 'out', new Date());

// 4. Проверка показа
// const wasShown = tipStorage.hasBeenShown('welcome', 'out');

// 5. Очистка
// tipStorage.clearTimestamp('welcome', 'out');