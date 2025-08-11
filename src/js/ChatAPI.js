export default class ChatAPI {
    constructor(apiUrl) {
        this.apiUrl = apiUrl;
        this.chatId = this.loadChatId();
        this.abortController = null;
    }

    loadChatId() {
        try {
            return localStorage.getItem('chatId');
        } catch (e) {
            console.warn('localStorage недоступен');
            return null;
        }
    }

    saveChatId(id) {
        try {
            localStorage.setItem('chatId', id);
            this.chatId = id;
        } catch (e) {
            console.warn('Не удалось сохранить chatId');
        }
    }
    async sendMessage(message, onChunk, onDone, onError) {
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();

        const payload = {
            message,
            idChat: this.chatId || null  // Если нет chatId — отправляем null
        };

        let retries = 0;
        const maxRetries = 3;

        const attempt = async () => {
            while (retries <= maxRetries) {
                try {
                    const response = await fetch(this.apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload),
                        signal: this.abortController.signal
                    });

                    if (!response.ok) {
                        throw new Error(`Ошибка: ${response.status}`);
                    }

                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    let buffer = '';

                    while (true) {
                        const { value, done } = await reader.read();
                        if (done && !buffer.trim()) break;

                        buffer += decoder.decode(value, { stream: true });

                        // Обрабатываем каждую полную строку (каждый JSON)
                        let lines = buffer.split('\n');
                        buffer = lines.pop(); // Последняя — неполная, оставляем в буфере

                        for (const line of lines) {
                            const trimmed = line.trim();
                            if (!trimmed) continue;

                            try {
                                const event = JSON.parse(trimmed);

                                if (event.type === 'Message') {
                                    if (event.response) {
                                        onChunk(event.response);
                                    }
                                    if (event.done) {
                                        onDone?.();
                                        return; // Завершаем, больше не читаем
                                    }
                                }

                                else if (event.type === 'Link') {
                                    // Можно передать ссылку как особый тип
                                    // Например: onChunk(`[LINK]${event.response}[/LINK]`);
                                    // Или отдельный обработчик
                                    // Пока просто передаём как есть (или игнорируем)
                                    onChunk(event.response);
                                }

                                else if (event.type === 'ChatId') {
                                    this.saveChatId(event.response);
                                    if (event.done) {
                                        onDone?.();
                                        return; // Это последнее сообщение
                                    }
                                }

                            } catch (parseError) {
                                console.warn('Не удалось распарсить JSON:', trimmed);
                                // Можно передать как обычный текст, если нужно
                                // onChunk(trimmed);
                            }
                        }
                    }

                    // После завершения чтения — если остался неполный JSON
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
                        } catch (e) {
                            console.warn('Остаток буфера не является валидным JSON:', buffer);
                        }
                    }

                    onDone?.(); // На всякий случай
                    return;

                } catch (error) {
                    if (error.name === 'AbortError') return;

                    retries++;
                    if (retries > maxRetries) {
                        return onError?.(error);
                    }

                    // Экспоненциальная задержка
                    await new Promise(r => setTimeout(r, 1000 * retries));
                }
            }
        };

        await attempt();
    }

    abort() {
        if (this.abortController) this.abortController.abort();
    }
}