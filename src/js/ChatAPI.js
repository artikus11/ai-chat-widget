export default class ChatAPI {
    constructor(apiOptions = {}) {
        if (!apiOptions.url) {
            throw new Error('apiOptions.url is required');
        }
        this.apiUrl = apiOptions.url;
        this.greeting = apiOptions.greeting || '';
        this.chatId = this.loadChatId();
        this.abortController = null;
    }

    loadChatId() {
        try {
            return localStorage.getItem('chatId');
        } catch {
            console.warn('localStorage недоступен');
            return null;
        }
    }

    saveChatId(id) {
        try {
            localStorage.setItem('chatId', id);
            this.chatId = id;
        } catch {
            console.warn('Не удалось сохранить chatId');
        }
    }

    abort() {
        if (this.abortController) this.abortController.abort();
    }
}
