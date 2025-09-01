import ResponseFormatter from '../formatters/ResponseFormatter.js';

export default class ResponseHandler {
    constructor(ui, api, fallbackMessage) {
        this.ui = ui;
        this.api = api;
        this.fallbackMessage = fallbackMessage;
        this.formatter = new ResponseFormatter();

        this.currentResponse = '';
        this.links = [];
        this.hasReceivedData = false;
    }

    onChunk(chunk) {
        this.hasReceivedData = true;

        if (chunk.type === 'Message' && chunk.response) {
            this.currentResponse += chunk.response;
            this.ui.updateTyping(this.currentResponse);
        } else if (chunk.type === 'Link') {
            this.links.push(chunk.response);
        } else if (chunk.type === 'ChatId') {
            this.api.saveChatId(chunk.response);
        }
    }

    onDone() {
        this.ui.hideTyping();
        this.finalize();
    }

    onError() {
        this.ui.hideTyping();
        if (!this.hasReceivedData) {
            this.ui.addMessage(this.fallbackMessage, false);
        }
    }

    finalize() {
        if (this.currentResponse.trim()) {
            const finalHtml = this.formatter.formatText(this.currentResponse);
            this.ui.addMessage(finalHtml, false, true);
            this.currentResponse = '';
        }

        if (this.links.length > 0) {
            const linksHtml = this.formatter.formatLinks(this.links);
            this.ui.addMessage(linksHtml, false, true);
            this.links = [];
        }
    }
}
