import '../scss/chat.scss';
import ChatAPI from './ChatAPI.js';
import ChatUI from './ChatUI.js';
import ChatController from './ChatController.js';

class AIChat {
    constructor(options = {}) {
        const apiOptions = options.apiOptions || {};
        const themeOptions = options.themeOptions || {};
        const selectorsOptions = options.selectorsOptions || {};
        const delayOptions = options.delayOptions || {};

        if (!apiOptions.url) {
            throw new Error('apiOptions.url must be provided');
        }

        this.container = document.querySelector((selectorsOptions && selectorsOptions.container) || '.chatbox');

        if (!this.container) {
            console.error('Chat container not found');
            return;
        }

        this.apiUrl = apiOptions.url;
        this.greeting = apiOptions.greeting || 'Добрый день! Нужна ли вам помощь?';
        this.apiOptions = apiOptions;
        this.themeOptions = themeOptions;
        this.selectorsOptions = selectorsOptions;
        this.delayOptions = delayOptions;

        this.init();
    }

    init() {
        const ui = new ChatUI(this.container, {
            ...this.themeOptions,
            ...this.selectorsOptions,
        });

        const api = new ChatAPI(this.apiOptions);

        const controller = new ChatController(ui, api, {
            greeting: this.greeting,
            ...this.delayOptions,
        });

        ui.bindEvents(
            text => controller.sendMessage(text),
            () => controller.toggle()
        );

        setTimeout(() => {
            const toggle = this.container.querySelector(ui.selectors.toggle);
            if (toggle) {
                toggle.style.display = 'flex';
            }
        }, this.delayOptions.toggleDelay);
    }
}

export default AIChat;
