// tests/mocks/storageMocks.js
import { vi } from 'vitest';

/**
 * Создаёт мок хранилища (localStorage/sessionStorage).
 * Поддерживает getItem, setItem, removeItem, clear.
 *
 * @returns {Storage} Мок-объект с методами и возможностью проверки вызовов.
 *
 * @example
 * const storage = createMockStorage();
 * expect(storage.setItem).toHaveBeenCalledWith('key', 'value');
 */
export function createMockStorage() {
    let store = {};

    return {
        getItem: vi.fn((key) => (key in store ? store[key] : null)),
        setItem: vi.fn((key, value) => {
            store[key] = String(value); // localStorage всегда хранит строки
        }),
        removeItem: vi.fn((key) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        // Вспомогательный метод для доступа к состоянию (не часть Storage API)
        _getStore: () => ({ ...store })
    };
}


/**
 * Создаёт мок провайдера ключей (StorageKeysProvider).
 *
 * @param {Object} map - Карта соответствия [section, name] → ключ
 * @param {string} delimiter - Разделитель для объединения аргументов (по умолчанию ':')
 * @returns {Object} Мок с методом get
 *
 * @example
 * const keysProvider = createMockKeysProvider({ 'CHAT:CHAT_OPEN': 'ui:chat:open' });
 */
export function createMockKeysProvider(map = {}, delimiter = ':') {
    return {
        get: vi.fn((...args) => {
            const key = args.join(delimiter);
            return map[key] || null;
        }),
        has: vi.fn((...args) => {
            const key = args.join(delimiter);
            return !!map[key];
        })
    };
}