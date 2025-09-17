/**
 * Полноценный адаптер хранения для управления состоянием показа подсказок.
 *
 * Отвечает за:
 * - получение правильного ключа через StorageKeysProvider
 * - сериализацию/десериализацию данных
 * - работу с любым storage (localStorage, sessionStorage, in-memory)
 * - предоставление высокоуровневого API: markAsShown(), wasShown(), clear(), etc.
 */
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

    /**
     * @param {StorageKeysProvider} keysProvider - провайдер ключей
     * @param {Storage} storage - экземпляр хранилища (например localStorage)
     * @param {Object} logger - Логгер для вывода предупреждений и ошибок.
     * @example
     * const storage = new TipStorage(keysProvider, localStorage);  // или sessionStorage, или свой объект с getItem/setItem
     * storage.markAsShown('welcome', 'out'); // пометить подсказку "welcome" из категории "out" как показанную
     * storage.wasShown('welcome', 'out'); // проверить, была ли показана подсказка "welcome" из категории "out"
     * storage.getLastShownTime('welcome', 'out'); // получить timestamp последнего показа  "welcome" из категории "out"
     * storage.getRecord('welcome', 'out'); // получить полную запись о показе подсказки "welcome" из категории "out"
     * storage.clear('welcome', 'out'); // очистить запись о показе подсказки "welcome" из категории "out"  
     */
    constructor(keysProvider, storage = localStorage, logger = console) {
        this.keysProvider = keysProvider;
        this.storage = storage;
        this.logger = logger;
    }

    /**
     * Получить внутренний ключ по категории и типу подсказки.
     *
     * @private
     * @param {string} type
     * @param {string} category ('in' | 'out')
     * @returns {string|null}
     */
    #getKey(type, category) {
        const entry = TipStorage.TIP_STORAGE_MAP[category]?.[type];
        if (!entry) {
            this.logger.warn(`[TipStorage] Unknown tip type "${type}" in category "${category}"`);
            return null;
        }

        const [section, keyName] = entry;
        return this.keysProvider.get(section, keyName);
    }

    /**
     * Прочитать данные из хранилища по ключу.
     *
     * @private
     * @param {string} key
     * @returns {any|null}
     */
    #read(key) {
        try {
            const raw = this.storage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            this.logger.warn(`[TipStorage] Failed to read from storage (key: ${key}):`, e);
            return null;
        }
    }

    /**
     * Записать данные в хранилище.
     *
     * @private
     * @param {string} key
     * @param {any} data
     * @returns {boolean}
     */
    #write(key, data) {
        try {
            this.storage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            this.logger.warn(`[TipStorage] Failed to write to storage (key: ${key}):`, e);
            return false;
        }
    }


    /**
     * Отметить, что подсказка была показана.
     *
     * @param {string} type - тип подсказки (welcome, followup...)
     * @param {string} category - категория ('in' или 'out')
     * @returns {boolean} успех операции
     *
     * @example
     * storage.markAsShown('welcome', 'out');
     */
    markAsShown(type, category = 'out') {
        const key = this.#getKey(type, category);
        if (!key) return false;

        const data = {
            type,
            category,
            timestamp: new Date().toISOString(),
            version: 1
        };

        return this.#write(key, data);
    }

    /**
     * Проверить, была ли показана подсказка.
     *
     * @param {string} type
     * @param {string} category
     * @returns {boolean}
     */
    wasShown(type, category = 'out') {
        const key = this.#getKey(type, category);
        if (!key) return false;

        const data = this.#read(key);
        return !!data && typeof data.timestamp === 'string';
    }

    /**
     * Получить временную метку последнего показа.
     *
     * @param {string} type
     * @param {string} category
     * @returns {number|null} timestamp в миллисекундах или null
     */
    getLastShownTime(type, category = 'out') {
        const key = this.#getKey(type, category);
        if (!key) return null;

        const data = this.#read(key);
        if (!data || !data.timestamp) return null;

        const time = new Date(data.timestamp).getTime();
        return isNaN(time) ? null : time;
    }

    /**
     * Получить всю информацию о показе подсказки.
     *
     * @param {string} type
     * @param {string} category
     * @returns {{ type: string, category: string, timestamp: string, ... } | null}
     */
    getRecord(type, category = 'out') {
        const key = this.#getKey(type, category);
        if (!key) return null;

        return this.#read(key);
    }

    /**
     * Очистить запись о показе подсказки.
     *
     * @param {string} type
     * @param {string} category
     * @returns {void}
     */
    clear(type, category = 'out') {
        const key = this.#getKey(type, category);
        if (key) {
            this.storage.removeItem(key);
        }
    }

    /**
     * Получить все записи по категории.
     *
     * @param {string} category
     * @returns {Object.<string, { timestamp: string, type: string, category: string }>}
     */
    getAll(category = 'out') {
        const result = {};
        const categoryMap = TipStorage.TIP_STORAGE_MAP[category];

        if (!categoryMap) return result;

        for (const [type] of Object.entries(categoryMap)) {
            const record = this.getRecord(type, category);
            if (record) {
                result[type] = record;
            }
        }

        return result;
    }

    /**
     * Проверить, было ли хоть что-то показано в этой категории.
     *
     * @param {string} category
     * @returns {boolean}
     */
    hasAnyBeenShown(category = 'out') {
        const records = this.getAll(category);
        return Object.keys(records).length > 0;
    }

    /**
     * Полная очистка всех записей в категории.
     *
     * @param {string} category
     * @returns {void}
     */
    clearAll(category = 'out') {
        const categoryMap = TipStorage.TIP_STORAGE_MAP[category];
        if (!categoryMap) return;

        for (const [type] of Object.entries(categoryMap)) {
            this.clear(type, category);
        }
    }
}