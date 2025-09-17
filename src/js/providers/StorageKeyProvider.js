import { STORAGE_KEYS } from '@js/config';

/**
 * Универсальный провайдер для доступа к STORAGE_KEYS.
 * Позволяет получать ключи по секции и имени.
 */
export default class StorageKeysProvider {
    constructor(keys = STORAGE_KEYS) {
        this.keys = keys;
    }

    /**
     * Получить ключ по секции и имени.
     *
     * @param {string} section - Название секции (например "CHAT" или "OUTER_TIP").
     * @param {string} name - Название ключа в секции (например "OPEN" или "WELCOME_SHOWN").
     * @returns {string|null} Возвращает ключ или null, если не найден.
     *
     * @example
     * provider.get('CHAT', 'OPEN') // → "ui:chat:open"
     * provider.get('OUTER_TIP', 'WELCOME_SHOWN') // → "ui:outer-tip:welcome-shown"
     */
    get(section, name) {
        return this.keys[section]?.[name] || null;
    }

    /**
     * Проверить, есть ли ключ в секции.
     */
    has(section, name) {
        return !!this.keys[section]?.[name];
    }

    /**
     * Вернуть список всех доступных секций.
     */
    listSections() {
        return Object.keys(this.keys);
    }

    /**
     * Вернуть все ключи из секции.
     */
    listKeys(section) {
        return Object.keys(this.keys[section] || {});
    }

    /**
     * Returns all stored keys.
     *
     * @returns {Array} An array containing all the keys managed by the provider.
     */
    listAll() {
        return this.keys;
    }
}
