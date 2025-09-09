import '../scss/chat.scss';
import Api from './api/API';
import UI from './ui/UI';
import Controller from './controllers/Controller';
import MessagesProvider from './providers/MessagesProvider';
import { configureSanitizer } from './utils/sanitize';
import { defaultSelectors } from './ui/config';

/**
 * Основной класс для инициализации и управления AI-чатом.
 *
 * @example
 * const chat = new AIChat({
 *   apiOptions: { url: '/api/chat', token: 'xyz' },
 *   themeOptions: { primaryColor: '#007bff' },
 *   delayOptions: { toggleShowDelay: 500, chatShowDelay: 2000 }
 * });
 *
 * @class
 */
export default class AIChat {
    /**
     * Создаёт экземпляр AIChat.
     *
     * @param {Object} options - Конфигурационные опции.
     * @param {Object} options.apiOptions - Настройки API.
     * @param {string} options.apiOptions.url - URL API (обязательный).
     * @param {string} [options.apiOptions.token] - Токен аутентификации.
     * @param {Object} [options.themeOptions] - Тема оформления (цвета, шрифты и т.д.).
     * @param {Object} [options.selectorsOptions] - Кастомные CSS-селекторы.
     * @param {string} [options.selectorsOptions.container] - Селектор контейнера чата.
     * @param {string} [options.selectorsOptions.toggle] - Селектор кнопки-переключателя.
     * @param {Object} [options.delayOptions] - Задержки отображения.
     * @param {number} [options.delayOptions.toggleShowDelay=100] - Задержка показа кнопки.
     * @param {number} [options.delayOptions.chatShowDelay=0] - Задержка открытия чата.
     * @param {Object} [options.messagesOptions] - Опции провайдера сообщений.
     *
     * @throws {Error} Если не указан `apiOptions.url` или не найден контейнер.
     *
     * @example
     * new AIChat({
     *   apiOptions: { url: '/api/v1/chat' },
     *   delayOptions: { toggleShowDelay: 300 }
     * });
     */
    constructor(options = {}) {
        const {
            apiOptions = {},
            themeOptions = {},
            selectorsOptions = {},
            delayOptions = {},
            messagesOptions = {},
        } = options;

        if (!apiOptions.url) {
            throw new Error('AIChat: apiOptions.url is required');
        }

        this.delayOptions = {
            toggleShowDelay: 0,
            chatShowDelay: 0,
            ...delayOptions,
        };

        this.apiOptions = apiOptions;
        this.themeOptions = themeOptions;
        this.selectorsOptions = selectorsOptions;
        this.messagesOptions = messagesOptions;

        const containerSelector =
            selectorsOptions.container || '[data-aichat-box]';
        this.container = document.querySelector(containerSelector);

        if (!this.container) {
            throw new Error(
                `AIChat: Container not found with selector "${containerSelector}"`
            );
        }

        this.init();
    }

    /**
     * Инициализирует компоненты чата.
     * Вызывает цепочку внутренних методов.
     *
     * @private
     * @throws {Error} При ошибке инициализации с контекстом.
     */
    init() {
        try {
            this.configureSanitizer();
            this.initializeServices();
            this.bindUIEvents();
            this.setupDisplayDelays();
        } catch (error) {
            const initError = new Error(
                `AIChat initialization failed: ${error.message}`
            );
            initError.cause = error;
            throw initError;
        }
    }

    /**
     * Настраивает санитизацию HTML-контента.
     * Может быть расширена для кастомных правил.
     *
     * @private
     */
    configureSanitizer() {
        configureSanitizer();
    }

    /**
     * Создаёт и сохраняет экземпляры сервисов:
     * MessagesProvider, UI, Api, Controller.
     *
     * @private
     */
    initializeServices() {
        this.messagesProvider = new MessagesProvider(this.messagesOptions);
        this.ui = new UI(this.container, this.messagesProvider, {
            ...this.apiOptions,
            ...this.themeOptions,
            ...this.selectorsOptions,
        });
        this.api = new Api(this.messagesProvider, {
            api: { ...this.apiOptions },
        });
        this.controller = new Controller(
            this.ui,
            this.api,
            this.messagesProvider
        );
    }

    /**
     * Привязывает обработчики событий к UI.
     * Отправка сообщений и переключение видимости.
     *
     * @private
     */
    bindUIEvents() {
        this.ui.bindEvents(
            text => this.controller.sendMessage(text),
            () => this.ui.toggle()
        );
    }

    /**
     * Настраивает задержки отображения кнопки и чата.
     *
     * @private
     */
    setupDisplayDelays() {
        this.showToggleButton();
        this.showChat();
    }

    /**
     * Запуск кнопки чата
     *
     * @private
     */
    showToggleButton() {
        const toggleSelector =
            this.selectorsOptions.toggle || defaultSelectors.toggle;

        setTimeout(() => {
            const toggle = this.container.querySelector(toggleSelector);
            if (toggle) {
                toggle.style.display = 'flex';
            }
        }, this.delayOptions.toggleShowDelay);
    }

    /**
     * Автоматический запуск чата, елси задержка велючена
     *
     * @private
     */
    showChat() {
        if (this.ui.isOpen()) {
            return;
        }

        if (this.delayOptions.chatShowDelay <= 0) {
            return;
        }

        setTimeout(() => {
            this.ui.open();
            this.ui.autoGreetingHandler.start();
        }, this.delayOptions.chatShowDelay);
    }

    /**
     * Открывает окно чата.
     *
     * @example
     * chat.open();
     */
    open() {
        this.ui?.open();
    }

    /**
     * Закрывает окно чата.
     *
     * @example
     * chat.close();
     */
    close() {
        this.ui?.close();
    }

    /**
     * Переключает видимость окна чата.
     *
     * @example
     * chat.toggle();
     */
    toggle() {
        this.ui?.toggle();
    }

    /**
     * Отправляет сообщение в чат.
     *
     * @param {string} text - Текст сообщения.
     *
     * @example
     * chat.sendMessage("Привет, как дела?");
     */
    sendMessage(text) {
        this.controller?.sendMessage(text);
    }

    /**
     * Полностью уничтожает экземпляр чата:
     * - удаляет слушатели событий,
     * - очищает DOM,
     * - обнуляет ссылки.
     *
     * @example
     * chat.destroy();
     */
    destroy() {
        if (this.destroyed) {
            return;
        }

        this.destroyed = true;

        this.ui?.unbindEvents?.();
        this.ui?.cleanup?.();

        this.ui = null;
        this.api = null;
        this.controller = null;
        this.messagesProvider = null;
    }
}
