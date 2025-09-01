import '../scss/chat.scss';
import Api from './api/API';
import UI from './ui/UI';
import Controller from './controllers/Controller';
import { configureSanitizer } from './utils/sanitize';

class AIChat {
    constructor(options = {}) {
        const apiOptions = options.apiOptions || {};
        const themeOptions = options.themeOptions || {};
        const selectorsOptions = options.selectorsOptions || {};
        const delayOptions = options.delayOptions || {};
        const messagesOptions = options.messagesOptions || {};

        if (!apiOptions.url) {
            throw new Error('apiOptions.url must be provided');
        }

        this.container = document.querySelector(
            (selectorsOptions && selectorsOptions.container) || '[data-aichat-box]'
        );

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
        this.messagesOptions = messagesOptions;

        this.init();
    }

    init() {
        configureSanitizer();

        const ui = new UI(this.container, {
            ...this.themeOptions,
            ...this.selectorsOptions,
        });

        const api = new Api({
            api: { ...this.apiOptions },
            messages: { ...this.messagesOptions },
        });

        const controller = new Controller(ui, api, {
            ...this.messagesOptions,
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
