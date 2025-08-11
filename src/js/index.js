import '../scss/chat.scss';
import ChatAPI from './ChatAPI.js';
import ChatUI from './ChatUI.js';
import ChatController from './ChatController.js';

class AIChat {
    constructor(options = {}) {
        // 1. Опции API
        const apiOptions = options.apiOptions || {};
        // 2. Внешний вид
        const themeOptions = options.themeOptions || {};
        // 3. Селекторы и классы
        const selectorsOptions = options.selectorsOptions || {};
        // 4. Тайминги
        const delayOptions = options.delayOptions || {};

        // Контейнер для UI
        this.container = document.querySelector((selectorsOptions && selectorsOptions.container) || '.chatbox');

        if (!apiOptions.url) {
            throw new Error('apiOptions.url must be provided');
        }

        this.apiUrl = apiOptions.url;
        this.greeting = apiOptions.greeting || 'Добрый день! Нужна ли вам помощь?';

        if (!this.container) {
            console.error('Chat container not found');
            return;
        }

        this.apiOptions = apiOptions;

        this.themeOptions = themeOptions;
        this.selectorsOptions = selectorsOptions;
        this.delayOptions = delayOptions;

        this.init();
    }

    init() {
        // Передаём themeOptions и selectorsOptions в ChatUI
        const ui = new ChatUI(this.container, {
            ...this.themeOptions,
            ...this.selectorsOptions,
        });
        // Передаём apiUrl в ChatAPI
        const api = new ChatAPI(this.apiOptions);
        // Передаём greeting и тайминги в ChatController
        const controller = new ChatController(ui, api, {
            greeting: this.greeting,
            ...this.delayOptions,
        });

        ui.bindEvents(
            (text) => controller.sendMessage(text),
            () => controller.toggle()
        );

        // Показать тоггл через 5 сек
        setTimeout(() => {
            const toggle = this.container.querySelector(ui.selectors.toggle);
            if (toggle) toggle.style.display = 'flex';
        }, 1000);
    }
}

export default AIChat;
