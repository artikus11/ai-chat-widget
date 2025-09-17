import { EVENTS } from '../config';
/**
 * @typedef {Object} MessagesProvider
 * @property {function(string): string} getText - Возвращает локализованное сообщение по ключу.
 */

/**
 * Класс для взаимодействия с API чат-бота с поддержкой стриминга, повторов и управления сессией.
 * Использует {@link Evented} для уведомления о событиях (например, получении чанка или ошибке).
 *
 * @class Api
 * @extends EventEmitter
 *
 * @example
 * const api = new Api(messagesProvider, {
 *   api: {
 *     url: 'https://api.example.com/chat',
 *     domain: 'example.com'
 *   }
 * });
 *
 * api.on(EVENTS.API.CHUNK_RECEIVED, (event) => console.log('Chunk:', event));
 * api.on(EVENTS.API.ERROR, (error) => console.error('Error:', error));
 *
 * await api.sendRequest('Привет!');
 */
export default class Api {
    /**
     * Создаёт экземпляр Api.
     *
     * @param {Object} options - Конфигурация API.
     * @param {Object} options.api - Настройки API.
     * @param {string} options.api.url - Базовый URL для запросов (обязательно).
     * @param {string} options.api.domain - Домен для заголовка X-API-DOMAIN.
     * @param {MessagesProvider} messagesProvider - Провайдер локализованных сообщений
     * @param {StorageKeysProvider} keysProvider - Провайдер ключей для localStorage
     * @param {Evented} eventEmitter - Экземпляр Evented для эмита событий.
     * @param {Object} logger - Логгер с методами info, warn, error.
     *
     * @throws {Error} Если не указан обязательный параметр `api.url`.
     *
     * @example
     * const api = new Api(messagesProvider, {
     *   api: {
     *     url: 'https://api.example.com/chat',
     *     domain: 'example.com'
     *   }
     * });
     */
    constructor(
        messagesProvider,
        keysProvider,
        options = {},
        eventEmitter,
        logger
    ) {
        if (!options.api?.url) {
            throw new Error('api.url is required');
        }

        this.apiUrl = options.api.url;
        this.domain = options.api.domain;

        this.messagesProvider = messagesProvider;
        this.keysProvider = keysProvider;
        this.eventEmitter = eventEmitter;
        this.logger = logger;

        this.chatId = this.loadChatId();
        this.abortController = null;
    }

    /**
     * Загружает chatId из localStorage.
     * При ошибке доступа к localStorage выводит предупреждение.
     *
     * @returns {string|null} Идентификатор чата или `null`, если недоступен или отсутствует.
     */
    loadChatId() {
        try {
            return localStorage.getItem(this.keysProvider.get('API', 'ID'));
        } catch {
            this.logger.warn('localStorage недоступен');
            return null;
        }
    }
    /**
     * Сохраняет chatId в localStorage и обновляет свойство экземпляра.
     * При ошибке сохранения выводит предупреждение.
     *
     * @param {string} id - Идентификатор чата.
     */
    saveChatId(id) {
        try {
            localStorage.setItem(this.keysProvider.get('API', 'ID'), id);
            this.chatId = id;
        } catch {
            this.logger.warn('Не удалось сохранить chatId');
        }
    }

    /**
     * Очищает строку от потенциально проблемных символов перед парсингом JSON.
     * Удаляет BOM, управляющие символы, "умные" кавычки и заменяет специальные пробелы.
     *
     * @param {string} str - Исходная строка.
     * @returns {string} Очищенная строка, пригодная для парсинга.
     */
    cleanString(str) {
        return (
            str
                .replace(/^\uFEFF/, '') // Удалить BOM
                .replace(/[\u00A0\u2028\u2029]/g, ' ') // Заменить специальные пробелы
                // eslint-disable-next-line no-control-regex
                .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '') // Удалить управляющие символы
                .replace(/“|”/g, '"') // Заменить "умные" кавычки
                .replace(/‘|’/g, "'")
                .trim()
        );
    }

    /**
     * Отправляет сообщение на сервер с поддержкой:
     * - стриминга ответа (chunked)
     * - автоматических повторов при сетевых ошибках
     * - отмены через AbortController
     *
     * Эмитит события:
     * - {@link EVENTS.API.CHUNK_RECEIVED} — при получении каждого чанка
     * - {@link EVENTS.API.REQUEST_DONE} — при завершении запроса
     * - {@link EVENTS.API.ERROR} — при фатальной ошибке или превышении попыток
     *
     * @param {string} message - Сообщение пользователя для отправки.
     * @returns {Promise<void>} Промис, который завершается после успешного получения данных или всех попыток.
     */
    async sendRequest(message) {
        this.abort();
        this.abortController = new AbortController();

        const payload = {
            message,
            idChat: this.chatId || null,
        };

        const maxRetries = 2;
        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const success = await this.attemptRequest(payload);

                if (success) {
                    return;
                }
            } catch (error) {
                lastError = error;

                if (error.name === 'AbortError') {
                    return;
                }

                if (this.isNetworkRecoverableError(error)) {
                    this.logger.error('Сетевая ошибка:', lastError);

                    this.eventEmitter.emit(EVENTS.API.REQUEST_DONE);
                    this.eventEmitter.emit(
                        EVENTS.API.ERROR,
                        new Error(this.messagesProvider.getText('in', 'error'))
                    );

                    return;
                }

                if (attempt < maxRetries) {
                    await this.delay(1000 * (attempt + 1));
                }
            }
        }

        this.logger.error('Все попытки запроса провалены:', lastError);

        this.eventEmitter.emit(EVENTS.API.REQUEST_DONE);
        this.eventEmitter.emit(EVENTS.API.ERROR, {
            type: 'retry_limit',
            error: lastError,
        });
    }

    /**
     * Пытается выполнить один запрос к API и обработать потоковый ответ.
     * При успехе запускает чтение стрима.
     *
     * @private
     * @param {Object} payload - Данные, отправляемые на сервер.
     * @param {string} payload.message - Текст сообщения.
     * @param {string|null} [payload.idChat] - ID чата (если есть).
     * @returns {Promise<boolean>} `true`, если запрос завершён (успешно или с ошибкой, не требующей повтора).
     * @throws {Error} Если произошла ошибка, требующая повтора (например, сетевая).
     */
    async attemptRequest(payload) {
        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-DOMAIN': this.domain,
                },
                body: JSON.stringify(payload),
                signal: this.abortController.signal,
            });

            if (!response.ok) {
                this.logger.warn('Ошибка сервера:', response.status);

                this.eventEmitter.emit(EVENTS.API.REQUEST_DONE);
                this.eventEmitter.emit(
                    EVENTS.API.ERROR,
                    new Error(this.messagesProvider.getText('in', 'error'))
                );

                return true;
            }

            if (!response.body) {
                this.eventEmitter.emit(EVENTS.API.REQUEST_DONE);
                return true;
            }

            return await this.readStream(response.body);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw error;
            }

            throw error;
        }
    }

    /**
     * Читает потоковые данные из ReadableStream, декодирует их и передаёт в обработку.
     * Накапливает буфер, разбивает на строки и вызывает {@link processBuffer}.
     *
     * @private
     * @param {ReadableStream} body - Тело HTTP-ответа.
     * @returns {Promise<boolean>} `true`, если поток успешно завершён.
     * @throws {Error} При ошибках чтения или обработки.
     */
    async readStream(body) {
        const reader = body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
            while (true) {
                const { value, done } = await reader.read();
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                if (done) {
                    this.processBuffer(buffer);
                    this.eventEmitter.emit(EVENTS.API.REQUEST_DONE);
                    return true;
                }

                const { remaining } = this.processBuffer(buffer);
                buffer = remaining;
            }
        } catch (error) {
            reader.cancel();
            throw error;
        }
    }

    /**
     * Обрабатывает накопленный буфер, разбивая его на строки и пытаясь распарсить каждую как JSON.
     * Неполные строки сохраняются для следующего вызова.
     *
     * @private
     * @param {string} buffer - Сырые данные из потока.
     * @returns {{ remaining: string }} Остаток буфера (незавершённая строка).
     */
    processBuffer(buffer) {
        let lines = buffer.split('\n');
        let remaining = lines.pop(); // Последняя строка может быть неполной

        for (const line of lines) {
            const cleaned = this.cleanString(line);
            if (!cleaned) {
                continue;
            }

            try {
                const event = JSON.parse(cleaned);
                this.handleEvent(event);
            } catch (e) {
                this.logger.warn('Не удалось распарсить JSON:', cleaned);
                this.logger.warn('Ошибка:', e.message);
                this.logger.warn('Stack:', e.stack);
            }
        }

        return { remaining };
    }

    /**
     * Обрабатывает одно событие из потока данных.
     * Поддерживает события типа:
     * - `Message` — текстовое сообщение
     * - `Link` — ссылка
     * - `ChatId` — установка нового ID чата
     *
     * Эмитит {@link EVENTS.API.CHUNK_RECEIVED}, а при `event.done` — {@link EVENTS.API.REQUEST_DONE}.
     *
     * @private
     * @param {Object} event - Событие из стрима.
     * @param {string} event.type - Тип события (например, "Message", "ChatId").
     * @param {*} [event.response] - Полезная нагрузка (зависит от типа).
     * @param {boolean} [event.done] - Флаг завершения диалога.
     */
    handleEvent(event) {
        this.eventEmitter.emit(EVENTS.API.CHUNK_RECEIVED, event);

        if (event.done) {
            this.eventEmitter.emit(EVENTS.API.REQUEST_DONE);
        }

        if (event.type === 'ChatId') {
            this.saveChatId(event.response);
        }
    }

    /**
     * Проверяет, является ли ошибка сетевой и можно ли повторить запрос.
     *
     * @private
     * @param {Error} error - Ошибка.
     * @returns {boolean} true, если ошибка восстановима (можно повторить).
     */
    isNetworkRecoverableError(error) {
        return (
            error.message.includes('CONNECTION_RESET') ||
            error.message.includes('CONNECTION_CLOSED') ||
            (error.message.includes('Failed to fetch') && navigator.onLine)
        );
    }

    /**
     * Возвращает промис, который разрешается через указанное количество миллисекунд.
     *
     * @private
     * @param {number} ms - Задержка в миллисекундах.
     * @returns {Promise<void>}
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Отменяет текущий активный запрос, если он есть.
     */
    abort() {
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
    }
}
