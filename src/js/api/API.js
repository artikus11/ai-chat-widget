import EventEmitter from '../utils/EventEmitter.js';
import Logger from '../utils/Logger.js';

/**
 * Класс для взаимодействия с API чат-бота с поддержкой стриминга, повторов и управления сессией.
 * Использует EventEmitter для уведомлений.
 *
 * @example
 * const api = new Api({
 *   api: { url: 'https://api.example.com/chat', domain: 'example.com' },
 *   messages: { error: 'Ошибка соединения' }
 * });
 *
 * api.sendRequest('Привет!', onChunk, onDone, onError);
 */
export default class Api extends EventEmitter {
    /**
     * Создаёт экземпляр Api.
     *
     * @param {Object} options - Конфигурация API.
     * @param {Object} options.api - Настройки API.
     * @param {string} options.api.url - Базовый URL для запросов (обязательно).
     * @param {string} [options.api.domain] - Домен для заголовка X-API-DOMAIN.
     * @param {Object} [options.messages] - Локализованные сообщения.
     * @param {string} [options.messages.error] - Сообщение об ошибке.
     */
    constructor(options = {}) {
        super();

        if (!options.api?.url) {
            throw new Error('api.url is required');
        }

        this.apiUrl = options.api.url;
        this.domain = options.api.domain;
        this.messages = options.messages || { error: 'Произошла ошибка' };

        this.logger = this.resolveLogger(options);

        this.chatId = this.loadChatId();
        this.abortController = null;
    }

    /**
     * Загружает chatId из localStorage.
     *
     * @returns {string|null} Идентификатор чата или null, если недоступно.
     */
    loadChatId() {
        try {
            return localStorage.getItem('chatId');
        } catch {
            this.logger.warn('localStorage недоступен');
            return null;
        }
    }

    /**
     * Сохраняет chatId в localStorage и обновляет текущее значение.
     *
     * @param {string} id - Идентификатор чата.
     */
    saveChatId(id) {
        try {
            localStorage.setItem('chatId', id);
            this.chatId = id;
        } catch {
            this.logger.warn('Не удалось сохранить chatId');
        }
    }

    /**
     * Очищает строку от нежелательных символов перед парсингом JSON.
     *
     * @param {string} str - Входная строка.
     * @returns {string} Очищенная строка.
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
     * Отправляет сообщение на сервер с поддержкой стриминга, повторов и отмены.
     *
     * @param {string} message - Текст сообщения пользователя.
     *
     * @returns {Promise<void>} Промис, завершающийся после обработки ответа или ошибки.
     */
    async sendRequest(message) {
        this.abort(); // Отменяем предыдущий запрос
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

                // Если запрос отменён — выходим
                if (error.name === 'AbortError') {
                    return;
                }

                // Повторяем только на сетевых ошибках
                if (this.isNetworkRecoverableError(error)) {
                    if (attempt < maxRetries) {
                        await this.delay(1000 * (attempt + 1));
                        continue;
                    }
                } else {
                    break; // Ошибка несетевая — не повторяем
                }
            }
        }

        // Все попытки исчерпаны
        this.emit('error', { type: 'retry_limit', error: lastError });
        this.emit('chunk', { type: 'Message', response: this.messages.error });
        this.emit('done');
    }

    /**
     * Пытается выполнить один запрос и обработать поток.
     *
     * @private
     * @param {Object} payload - Данные для отправки.
     * @returns {Promise<boolean>} true, если запрос завершён (успешно или с ошибкой, не требующей повтора).
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
                this.emit('chunk', { type: 'Message', response: this.messages.error });
                this.emit('done');
                this.emit('error', new Error(this.messages.error));
                return true; // Не повторяем — это ошибка ответа, а не сети
            }

            if (!response.body) {
                this.emit('done');
                return true;
            }

            return await this.readStream(response.body);
        } catch (error) {
            if (error.name === 'AbortError') {
                throw error;
            }
            throw error; // Сетевая ошибка — будет обработана выше
        }
    }

    /**
     * Читает поток данных из response.body и передаёт чанки в обработку.
     *
     * @private
     * @param {ReadableStream} body - Тело ответа.
     * @returns {Promise<boolean>} true, если поток завершён.
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
                    this.emit('done');
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
     * Обрабатывает накопленный буфер, разбивая его на строки и парся JSON.
     *
     * @private
     * @param {string} buffer - Накопленные данные.
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
                console.warn('Ошибка:', e.message);
                console.warn('Stack:', e.stack);
            }
        }

        return { remaining };
    }

    /**
     * Обрабатывает одно событие из потока.
     * Поддерживает типы: Message, Link, ChatId.
     *
     * @private
     * @param {Object} event - Объект события.
     */
    handleEvent(event) {
        this.emit('chunk', event);

        if (event.done) {
            this.emit('done');
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

    /**
     * Решает, какой логгер использовать.
     * @private
     */
    resolveLogger(options) {
        // 1. Если передан кастомный логгер — используем его
        if (options.logger) {
            return options.logger;
        }

        // 2. Если debug: true — создаём логгер с консолью
        if (options.debug) {
            const logger = new Logger();
            // Можно добавить больше контекста
            logger.debug('Api debug mode enabled');
            return logger;
        }

        // 3. Если debug: false или не указан — создаём "тихий" логгер
        const silentLogger = new Logger();
        silentLogger.handlers.log = [];
        silentLogger.handlers.warn = [];
        silentLogger.handlers.error = [];
        silentLogger.handlers.debug = [];

        return silentLogger;
    }
}
