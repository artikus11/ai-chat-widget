import ResponseHandler from '../handlers/ResponseHandler.js';

/**
 * Основной контроллер приложения
 * Управляет взаимодействием между UI, API и бизнес-логикой
 * @class Controller
 */
export default class Controller {
    /**
     * Создаёт контроллер
     * @param {Object} ui - Экземпляр пользовательского интерфейса
     * @param {Object} api - Экземпляр API для работы с сервером
     * @param {MessagesProvider} messagesProvider - Провайдер локализованных сообщений
     * @param {Object} options - Дополнительные опции
     */
    constructor(ui, api, messagesProvider, logger) {
        this.ui = ui;
        this.api = api;
        this.messagesProvider = messagesProvider;
        this.logger = logger;

        this.responseHandler = new ResponseHandler(this.ui, this.api);

        this.api.on('chunk', this.handleChunk.bind(this));
        this.api.on('done', this.handleDone.bind(this));
        this.api.on('error', this.handleError.bind(this));
    }

    /**
     * Обрабатывает пришедший чанк данных от API
     * @param {Object} event - Событие с данными чанка
     */
    handleChunk(event) {
        this.responseHandler.onChunk(event);
    }

    /**
     * Обрабатывает завершение запроса к API
     */
    handleDone() {
        this.responseHandler.onDone();
        this.responseHandler.reset();
        this.ui.enableForm();
    }

    /**
     * Обрабатывает ошибку запроса к API
     * @param {Object} error - Объект ошибки
     */
    handleError() {
        // Показываем fallback-сообщение только если не было получено данных
        if (!this.responseHandler.hasReceivedData()) {
            const fallbackMessage = this.messagesProvider.getText('fallback');
            this.ui.addMessage(fallbackMessage, false, true);
        }

        this.responseHandler.reset();
        this.ui.enableForm();
    }

    /**
     * Отправляет сообщение через API
     * @param {string} text - Текст сообщения для отправки
     * @param {boolean} isUserInitiated - Флаг пользовательской инициации
     */
    async sendMessage(text, isUserInitiated = true) {
        if (!text.trim()) {
            return;
        }

        if (isUserInitiated) {
            this.ui.addMessage(text, true);
            this.ui.showTyping();
            this.ui.disabledForm();
        }

        await this.api.sendRequest(text);
    }
}
