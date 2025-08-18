/**
 * Вызывается при получении каждого фрагмента данных от сервера.
 * @callback ChunkCallback
 * @param {Object} chunk - Объект с данными от сервера
 * @param {'Message'|'Link'|'ChatId'} chunk.type - Тип пришедшего события
 * @param {string} [chunk.response] - Текст сообщения или ссылка
 * @param {boolean} [chunk.done] - Признак завершения потока
 */

/**
 * Вызывается, когда ответ от сервера полностью получен.
 * @callback DoneCallback
 */

/**
 * Вызывается при ошибке (сетевой или серверной).
 * @callback ErrorCallback
 * @param {Error} error - Объект ошибки
 */

/**
 * API для общения с чат-ботом через стриминг (постепенная отправка ответа).
 * @param {Object} apiOptions - Настройки API
 * @param {string} apiOptions.url - URL сервера (обязательно)
 * @param {string} apiOptions.domain - Домен для заголовка X-API-DOMAIN
 * @param {string} apiOptions.greeting - Приветственное сообщение
 */
export default class ChatAPI {
    constructor(apiOptions = {}) {
        if (!apiOptions.url) {
            throw new Error('apiOptions.url is required');
        }
        this.apiUrl = apiOptions.url;
        this.domain = apiOptions.domain;
        this.greeting = apiOptions.greeting || '';
        this.chatId = this.loadChatId();
        this.abortController = null;
    }

    loadChatId() {
        try {
            return localStorage.getItem('chatId');
        } catch {
            console.warn('localStorage недоступен');
            return null;
        }
    }

    saveChatId(id) {
        try {
            localStorage.setItem('chatId', id);
            this.chatId = id;
        } catch {
            console.warn('Не удалось сохранить chatId');
        }
    }

    /**
     * Отправляет сообщение на сервер и обрабатывает потоковый ответ (streaming).
     * Поддерживает постепенное получение данных (чанки), завершение и повторные попытки.
     *
     * @param {string} message - Текст сообщения от пользователя
     * @param {Function} onChunk - Вызывается при получении каждого фрагмента (например, часть текста, ссылка)
     * @param {Function} onDone - Вызывается, когда ответ полностью получен
     * @param {Function} onError - Вызывается при фатальной ошибке (после всех попыток)
     */
    async sendRequest(message, onChunk, onDone, onError) {
        if (this.abortController) {
            this.abortController.abort();
        }
        this.abortController = new AbortController();

        const payload = {
            message,
            idChat: this.chatId || null,
        };

        let retries = 0;
        const maxRetries = 3;

        const attempt = async () => {
            while (retries <= maxRetries) {
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
                        let errorMsg = `Ошибка соединения с сервером: ${response.status}`;

                        try {
                            const errorData = await response.json();
                            if (errorData.message) {
                                errorMsg = errorData.message;
                            }
                        } catch {
                            // Если JSON не пришёл, оставляем дефолтное сообщение
                        }

                        onChunk(`❌ ${errorMsg}`);

                        setTimeout(() => {
                            onDone?.();
                        }, 0);

                        if (onError) {
                            onError(new Error(errorMsg));
                        }

                        return;
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';

                    while (true) {
                        const { value, done } = await reader.read();
                        if (done && !buffer.trim()) {
                            break;
                        }

                        buffer += decoder.decode(value, { stream: true });
                        let lines = buffer.split('\n');
                        buffer = lines.pop();

                        for (const line of lines) {
                            let trimmed = this.cleanString(line);
                            if (!trimmed) {
                                continue;
                            }

                            try {
                                const event = JSON.parse(trimmed);

                                if (event.type === 'Message') {
                                    if (event.response) {
                                        onChunk(event);
                                    }
                                    if (event.done) {
                                        onDone?.();
                                        return;
                                    }
                                } else if (event.type === 'Link') {
                                    onChunk(event);
                                } else if (event.type === 'ChatId') {
                                    this.saveChatId(event.response);
                                    if (event.done) {
                                        onDone?.();
                                        return;
                                    }
                                }
                            } catch (e) {
                                console.warn('Не удалось распарсить JSON:', trimmed);
                                console.warn('Ошибка в обработке JSON или onChunk:', e.message);
                                console.warn('Stack:', e.stack);
                                console.warn('Raw:', trimmed);
                            }
                        }
                    }

                    if (buffer.trim()) {
                        try {
                            const event = JSON.parse(buffer.trim());
                            if (event.type === 'Message' && event.response) {
                                onChunk(event.response);
                            }
                            if (event.done) {
                                onDone?.();
                                return;
                            }
                        } catch {
                            console.warn('Остаток буфера не является валидным JSON:', buffer);
                        }
                    }

                    onDone?.();
                    return;
                } catch (error) {
                    if (error.name === 'AbortError') {
                        return;
                    }

                    retries++;
                    if (retries > maxRetries) {
                        // После исчерпания попыток — показываем сообщение в чат
                        onChunk('❌ Не удалось отправить сообщение: превышено количество попыток подключения.');
                        onDone?.();
                        return onError?.(error);
                    }

                    await new Promise(r => setTimeout(r, 1000 * retries));
                }
            }
        };

        await attempt();
    }

    abort() {
        if (this.abortController) {
            this.abortController.abort();
        }
    }

    cleanString(str) {
        str = str.replace(/^\uFEFF/, '');
        str = str.replace(/[\u00A0\u2028\u2029]/g, ' ');
        // eslint-disable-next-line no-control-regex
        str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
        str = str.replace(/“|”/g, '"');
        str = str.replace(/‘|’/g, "'");

        return str.trim();
    }
}
