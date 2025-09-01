import ResponseHandler from '../handlers/ResponseHandler.js';

export default class Controller {
    constructor(ui, api, options = {}) {
        this.ui = ui;
        this.api = api;

        this.greeting = options.greeting || {};
        this.followup = options.followup || {};
        this.fallback = options.fallback || {};

        this.responseHandler = new ResponseHandler(this.ui, this.api, this.fallback.text);

        this.api.on('chunk', this.handleChunk.bind(this));
        this.api.on('done', this.handleDone.bind(this));
        this.api.on('error', this.handleError.bind(this));
    }

    handleChunk(event) {
        this.responseHandler.onChunk(event);
    }

    handleDone() {
        this.responseHandler.onDone();
        this.ui.activeForm();
    }

    handleError(error) {
        this.responseHandler.onError(error);
        this.ui.activeForm();
    }

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

    autoGreet() {
        if (this.hasGreeted) {
            return;
        }

        this.greetingTimer = setTimeout(() => {
            this.ui.showTyping();

            const text = this.greeting.text;
            let i = 0;

            const interval = setInterval(() => {
                if (i < text.length) {
                    this.ui.updateTyping(text.slice(0, i + 1));
                    this.ui.scrollToBottom();
                    i++;
                } else {
                    clearInterval(interval);

                    this.ui.finalizeTypingAsMessage();
                    this.hasGreeted = true;
                }
            }, 40);
        }, this.greeting.delay);

        this.followupTimer = setTimeout(() => {
            if (!this.hasFollowedUp && this.ui.elements.messages.children.length < 3) {
                this.ui.addMessage(this.followup.text, false);
                this.hasFollowedUp = true;
            }
        }, this.followup.delay);
    }

    toggle() {
        if (this.ui.isOpen()) {
            this.ui.close();
            if (this.greetingTimer) {
                clearTimeout(this.greetingTimer);
            }
            if (this.followupTimer) {
                clearTimeout(this.followupTimer);
            }
        } else {
            this.ui.open();
            this.autoGreet();
        }
    }
}
