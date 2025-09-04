import ResponseFormatter from '../formatters/ResponseFormatter.js';

/**
 * Обработчик потоковых ответов от API
 * Отвечает за обработку чанков данных и форматирование ответов
 *
 * @class ResponseHandler
 */
export default class ResponseHandler {
    /**
     * Создаёт обработчик ответов
     * @param {Object} ui - Экземпляр UI для отображения данных
     * @param {Object} api - Экземпляр API для управления сессией
     */
    constructor(ui, api) {
        this.ui = ui;
        this.api = api;
        this.formatter = new ResponseFormatter();

        /** @type {string} Накопленный текст ответа */
        this.currentResponse = '';

        /** @type {Array<string>} Собранные ссылки */
        this.links = [];
    }

    /**
     * Обрабатывает пришедший чанк данных
     * @param {Object} chunk - Объект чанка данных
     * @param {string} chunk.type - Тип чанка (Message, Link, ChatId)
     * @param {string} chunk.response - Содержимое чанка
     */
    onChunk(chunk) {
        switch (chunk.type) {
            case 'Message':
                if (chunk.response) {
                    this.currentResponse += chunk.response;
                    this.ui.updateTyping(this.currentResponse);
                }
                break;

            case 'Link':
                this.links.push(chunk.response);
                break;

            case 'ChatId':
                this.api.saveChatId(chunk.response);
                break;

            default:
                // Игнорируем неизвестные типы чанков
                break;
        }
    }

    /**
     * Обрабатывает завершение потока данных
     */
    onDone() {
        this.ui.hideTyping();
        this.finalize();
    }

    /**
     * Обрабатывает ошибку в потоке данных
     */
    onError() {
        this.ui.hideTyping();
    }

    /**
     * Финализирует обработку данных - добавляет накопленные сообщения в UI
     * @private
     */
    finalize() {
        // Добавляем основное текстовое сообщение
        if (this.currentResponse.trim()) {
            const finalHtml = this.formatter.formatText(this.currentResponse);
            this.ui.addMessage(finalHtml, false, true);
            this.currentResponse = '';
        }

        // Добавляем ссылки отдельным сообщением
        if (this.links.length > 0) {
            const linksHtml = this.formatter.formatLinks(this.links);
            this.ui.addMessage(linksHtml, false, true);
            this.links = [];
        }
    }

    /**
     * Проверяет, были ли получены данные
     * Используется Controller для обработки ошибок
     * @returns {boolean} true если были получены данные
     */
    hasReceivedData() {
        return !!this.currentResponse.trim() || this.links.length > 0;
    }

    /**
     * Сбрасывает состояние обработчика
     */
    reset() {
        this.currentResponse = '';
        this.links = [];
    }
}
