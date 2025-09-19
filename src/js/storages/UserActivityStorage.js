export class UserActivityStorage {
    /**
     * @param {StorageKeysProvider } keysProvider - Провайдер ключей для хранения данных.
     * @param {Storage} storage - Объект хранилища (по умолчанию localStorage).
     * @param {Object} logger - Логгер для вывода предупреждений и ошибок.
     */
    constructor(keysProvider, storage = localStorage, logger) {
        this.storage = storage;
        this.keysProvider = keysProvider;
        this.logger = logger;
    }

    /**
     * Отмечает, что чат был открыт, сохраняя текущую временную метку.
     * Получает ключ хранилища с помощью keysProvider для 'CHAT' и 'CHAT_OPEN'.
     * Если ключ существует, сохраняет текущее время (в миллисекундах) как строку в хранилище.
     */
    markChatOpen() {
        const key = this.keysProvider.get('CHAT', 'CHAT_OPEN');

        if (key) {
            this.storage.setItem(key, Date.now().toString());
        }
    }

    /**
     * Отмечает, что чат был закрыт, сохраняя текущую временную метку.
     * Получает ключ хранилища с помощью keysProvider для 'CHAT' и 'CHAT_CLOSE'.
     * Если ключ существует, сохраняет текущее время (в миллисекундах) как строку в хранилище.
     */
    markChatClose() {
        const key = this.keysProvider.get('CHAT', 'CHAT_CLOSE');

        if (key) {
            this.storage.setItem(key, Date.now().toString());
        }
    }

    /**
     * Отмечает, что сообщение в чате было отправлено, устанавливая флаг в хранилище.
     * Получает ключ хранилища с помощью keysProvider и устанавливает его значение в 'true'.
     */
    markMessageSent() {
        const key = this.keysProvider.get('CHAT', 'MESSAGE_SENT');
        if (key) {
            this.storage.setItem(key, 'true');
        }
    }

    /**
     * Отмечает время отправки последнего сообщения.
     * Сохраняет текущую временную метку (в миллисекундах) в хранилище под ключом 'LAST_MESSAGE_SENT'.
     */
    markLastMessageSent() {
        this.storage.setItem(
            this.keysProvider.get('CHAT', 'LAST_MESSAGE_SENT'),
            Date.now().toString()
        );
    }

    /**
     * Получает временную метку последнего открытия чата.
     *
     * @returns {number|null} Временная метка (в миллисекундах) последнего открытия чата или null, если недоступно.
     */
    getLastChatOpenTime() {
        const key = this.keysProvider.get('CHAT', 'CHAT_OPEN');
        if (!key) {
            return null;
        }
        const raw = this.storage.getItem(key);
        return raw ? parseInt(raw, 10) : null;
    }

    /**
     * Получает временную метку последнего отправленного сообщения.
     *
     * @returns {number|null} Временная метка (в миллисекундах) последнего отправленного сообщения или null, если недоступно.
     */
    getLastMessageSentTime() {
        const key = this.keysProvider.get('CHAT', 'LAST_MESSAGE_SENT');
        if (!key) {
            return null;
        }

        const raw = this.storage.getItem(key);
        return raw ? parseInt(raw, 10) : null;
    }

    /**
     * Проверяет, отправлял ли пользователь сообщение.
     *
     * Получает ключ хранилища с помощью keysProvider для контекста 'CHAT' и 'MESSAGE_SENT'.
     * Возвращает true, если соответствующее значение в хранилище равно строке 'true', иначе false.
     *
     * @returns {boolean} True, если пользователь отправил сообщение, иначе false.
     */
    hasSentMessage() {
        const key = this.keysProvider.get('CHAT', 'MESSAGE_SENT');
        return key ? this.storage.getItem(key) === 'true' : false;
    }
}
