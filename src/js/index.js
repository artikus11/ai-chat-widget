import '../scss/chat.scss';
import Api from './api/API';
import UI from './ui/UI';
import Controller from './controllers/Controller';
import MessagesProvider from './providers/MessagesProvider';
import { configureSanitizer } from './utils/sanitize';
import { defaultSelectors } from './config/';
import resolveLogger from './utils/resolveLogger';
import { Evented } from './events/Evented';
import { ExternalEventsBridge } from './events/ExternalEventsBridge';
import { Utils } from './ui/utils';

/**
 * Основной класс для инициализации и управления AI-чатом.
 *
 * Предоставляет API для интеграции чата в веб-приложение: отображение, отправка сообщений,
 * настройка темы, задержек и обработка событий. Внутренне использует модульную архитектуру
 * с разделением ответственности между UI, API, контроллером и провайдером сообщений.
 *
 * Все события внутри чата проходят через внутреннюю шину событий (`Evented`),
 * а также могут транслироваться во внешние DOM-события через `ExternalEventsBridge`.
 *
 * @example
 * const chat = new AIChat({
 *   apiOptions: { url: '/api/chat', token: 'xyz' },
 *   themeOptions: { primaryColor: '#007bff' },
 *   delayOptions: { toggleShowDelay: 500, chatShowDelay: 2000 }
 * });
 *
 * // Управление состоянием
 * chat.open();
 * chat.sendMessage("Привет!");
 *
 * // Слушаем внешние события
 * chat.container.addEventListener('chat.message.sent', (e) => {
 *   console.log('Отправлено:', e.detail);
 * });
 *
 * @class AIChat
 */
export default class AIChat {
    /**
     * Создаёт экземпляр AIChat с переданными опциями.
     *
     * @param {Object} options - Конфигурационные параметры чата.
     * @param {Object} options.apiOptions - Настройки подключения к API.
     * @param {string} options.apiOptions.url - URL-адрес API (обязательный).
     * @param {string} [options.apiOptions.domain] - Домен с которого передаются данные (опционально).
     * @param {Object} [options.themeOptions] - Параметры оформления чата.
     * @param {string} [options.themeOptions.primaryColor] - Основной цвет интерфейса.
     * @param {Object} [options.selectorsOptions] - Кастомные CSS-селекторы для элементов.
     * @param {string} [options.selectorsOptions.container="[data-aichat-box]"] - Селектор контейнера чата.
     * @param {string} [options.selectorsOptions.toggle] - Селектор кнопки-переключателя.
     * @param {Object} [options.delayOptions] - Задержки показа элементов.
     * @param {number} [options.delayOptions.toggleShowDelay=100] - Задержка (мс) перед появлением кнопки.
     * @param {number} [options.delayOptions.chatShowDelay=0] - Авто-открытие чата через указанное время.
     * @param {Object} [options.messagesOptions] - Дополнительные опции для провайдера сообщений.
     * @param {Function} [options.logger] - Кастомный логгер (с методами debug, info, error и т.д.).
     *
     * @throws {Error} Если не указан обязательный параметр `apiOptions.url`.
     * @throws {Error} Если не найден DOM-элемент по селектору контейнера.
     *
     * @example
     * const chat = new AIChat({
     *   apiOptions: { url: '/api/v1/chat', domain: 'abc123' },
     *   delayOptions: { toggleShowDelay: 300, chatShowDelay: 1500 },
     *   themeOptions: { primaryColor: '#ff6b6b' }
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

        /**
         * Опции задержек для отображения UI-элементов.
         * @type {Object}
         * @property {number} toggleShowDelay - Задержка показа кнопки.
         * @property {number} chatShowDelay - Задержка авто-открытия чата.
         */
        this.delayOptions = {
            toggleShowDelay: 100,
            chatShowDelay: 0,
            ...delayOptions,
        };

        /**
         * Опции API (URL, токен и т.д.).
         * @type {Object}
         */
        this.apiOptions = apiOptions;

        /**
         * Тема оформления (цвета, стили).
         * @type {Object}
         */
        this.themeOptions = themeOptions;

        /**
         * Кастомные CSS-селекторы.
         * @type {Object}
         */
        this.selectorsOptions = selectorsOptions;

        /**
         * Опции провайдера сообщений.
         * @type {Object}
         */
        this.messagesOptions = messagesOptions;

        /**
         * Внутренняя шина событий для коммуникации между компонентами.
         * @type {Evented}
         */
        this.eventEmitter = new Evented();

        /**
         * Мост для трансляции внутренних событий в DOM-события.
         * @type {ExternalEventsBridge|null}
         */
        this.externalEventsBridge = null;

        /**
         * Логгер, используемый всеми компонентами.
         * @type {Object|Function}
         */
        this.logger = resolveLogger(this.apiOptions);

        Utils.setLogger(this.logger);

        const containerSelector =
            selectorsOptions.container || '[data-aichat-box]';

        /**
         * Корневой DOM-элемент чата.
         * @type {HTMLElement}
         */
        this.container = document.querySelector(containerSelector);

        if (!this.container) {
            throw new Error(
                `AIChat: Container not found with selector "${containerSelector}"`
            );
        }

        /**
         * Флаг, указывающий, что экземпляр уже уничтожен.
         * @type {boolean}
         * @private
         */
        this.destroyed = false;

        this.init();
    }

    /**
     * Инициализирует все компоненты чата.
     * Вызывает приватные методы в нужном порядке.
     *
     * @private
     * @throws {Error} При возникновении ошибки при инициализации, с детализацией причины.
     */
    init() {
        try {
            this.#configureSanitizer();
            this.#initializeServices();
            this.#bindUIEvents();
            this.#setupDisplayDelays();
        } catch (error) {
            const initError = new Error(
                `AIChat initialization failed: ${error.message}`
            );
            initError.cause = error;
            this.logger?.error?.('[AIChat] Initialization error', { error });
            throw initError;
        }
    }

    /**
     * Настраивает санитизацию HTML-контента для защиты от XSS.
     * Может быть расширена или переопределена при необходимости.
     *
     * @private
     */
    #configureSanitizer() {
        configureSanitizer();
    }

    /**
     * Создаёт и сохраняет экземпляры ключевых сервисов:
     * - MessagesProvider — управление сообщениями
     * - UI — отображение интерфейса
     * - Api — взаимодействие с сервером
     * - Controller — логика управления потоком
     * - ExternalEventsBridge — мост для трансляции внутренних событий в DOM-события
     *
     * @private
     */
    #initializeServices() {
        this.messagesProvider = new MessagesProvider(this.messagesOptions);

        this.ui = new UI(
            this.container,
            this.messagesProvider,
            {
                ...this.apiOptions,
                ...this.themeOptions,
                ...this.selectorsOptions,
            },
            this.eventEmitter,
            this.logger
        );

        this.api = new Api(
            this.messagesProvider,
            {
                api: { ...this.apiOptions },
            },
            this.eventEmitter,
            this.logger
        );

        this.controller = new Controller(
            this.ui,
            this.api,
            this.messagesProvider,
            this.eventEmitter,
            this.logger
        );

        this.externalEventsBridge = new ExternalEventsBridge(
            this.eventEmitter,
            this.container,
            this.logger
        );
    }

    /**
     * Привязывает обработчики событий к UI.
     * Отправка сообщений и переключение видимости.
     *
     * @private
     */
    #bindUIEvents() {
        this.ui.bindEvents(
            text => this.controller.sendMessage(text),
            () => this.ui.toggle()
        );
    }

    /**
     * Настраивает отложенные действия: показ кнопки, приветствие, автозапуск чата.
     *
     * @private
     */
    #setupDisplayDelays() {
        this.#showToggleButton();
        this.#showWelcomTip();
        this.#showChat();
    }

    /**
     * Запуск кнопки чата
     *
     * @private
     */
    #showToggleButton() {
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
     * Запуск приветствия
     *
     * @private
     */
    #showWelcomTip() {
        if (this.ui.isOpen()) {
            return;
        }

        this.ui.startWelcomeTip();
    }

    /**
     * Автоматический запуск чата, если задержка велючена
     *
     * @private
     */
    #showChat() {
        if (this.ui.isOpen()) {
            return;
        }

        if (this.delayOptions.chatShowDelay <= 0) {
            return;
        }

        setTimeout(() => {
            this.ui.open();
            this.ui.autoGreeting.start();
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
