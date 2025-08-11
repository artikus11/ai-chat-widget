import '../scss/chat.scss';
import ChatAPI from './ChatAPI.js';
import ChatUI from './ChatUI.js';
import ChatController from './ChatController.js';

class AIChat {
    constructor(options = {}) {
        this.container = document.querySelector(options.container || '.chatbox');

        if (!options.apiUrl) {
            throw new Error('apiUrl must be provided in options');
        }

        this.apiUrl = options.apiUrl;
        this.greeting = options.greeting || 'Добрый день! Нужна ли вам помощь?';

        if (!this.container) {
            console.error('Chat container not found');
            return;
        }

        this.init();
    }

    init() {
        const ui = new ChatUI(this.container);
        const api = new ChatAPI(this.apiUrl);
        const controller = new ChatController(ui, api, this.greeting);

        ui.bindEvents(
            text => controller.sendMessage(text),
            () => controller.toggle()
        );

        // Показать тоггл через 5 сек
        setTimeout(() => {
            const toggle = this.container.querySelector('.chatbox__toggle');
            if (toggle) toggle.style.display = 'flex';
        }, 1000);
    }
}

export default AIChat;