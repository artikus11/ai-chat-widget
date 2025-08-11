import { marked } from 'marked';
import DOMPurify from 'dompurify';

export default class ChatController {
    constructor(ui, api, options = {}) {
        this.ui = ui;
        this.api = api;
        this.greeting = options.greeting || 'Добрый день! Нужна ли вам помощь?';
        this.greetDelay = options.greetDelay || 600;
        this.followupDelay = options.followupDelay || 15000;
        this.hasGreeted = false;
        this.hasFollowedUp = false;
        this.greetingTimer = null;
        this.followupTimer = null;
        this.currentResponse = '';
    }

    async sendMessage(text, isUserInitiated = true) {
        if (!text.trim()) return;

        if (isUserInitiated) {
            this.ui.addMessage(text, true);
            this.ui.showTyping();
        }

        this.currentResponse = '';

        try {
            await this.api.sendMessage(
                text,
                (chunk) => {
                    this.currentResponse += chunk;
                    this.ui.updateTyping(this.currentResponse);
                },
                () => {
                    this.ui.hideTyping();

                    if (this.currentResponse.trim()) {
                        let cleaned = this.normalizeMarkdown(this.currentResponse);

                        // Опционально: сделать ссылки кликабельными
                        cleaned = cleaned.replace(/(https?:\/\/[^\s]+)/g, '[$1]($1)');

                        // Парсинг в HTML
                        const html = DOMPurify.sanitize(marked.parse(cleaned));

                        this.ui.addMessage(html, false, true);
                        this.currentResponse = '';
                    }
                },
                (error) => {
                    this.ui.hideTyping();
                    this.ui.addMessage(`Ошибка: ${error.message}`, false);
                }
            );
        } catch {
            this.ui.hideTyping();
            this.ui.addMessage('Ошибка подключения.', false);
        }
    }

    autoGreet() {
        if (this.hasGreeted) return;

        this.greetingTimer = setTimeout(() => {
            this.ui.showTyping();

            const text = this.greeting;
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
        }, 600);

        this.followupTimer = setTimeout(() => {
            if (!this.hasFollowedUp && this.ui.elements.messages.children.length < 3) {
                this.ui.addMessage('Вы всё ещё думаете? Готова помочь!', false);
                this.hasFollowedUp = true;
            }
        }, 15000);
    }

    toggle() {
        if (this.ui.isOpen()) {
            this.ui.close();
            if (this.greetingTimer) clearTimeout(this.greetingTimer);
            if (this.followupTimer) clearTimeout(this.followupTimer);
        } else {
            this.ui.open();
            if (!this.hasGreeted) this.autoGreet();
        }
    }

    normalizeMarkdown(text) {
        text = text.replace(/https\s*?:\s*?\/\s*?\/\s*?/g, 'https://');
        text = text.replace(/^(#{1,3})\s*(.+?)\s*-\s*(\*\*.+?\*\*:)/gm, '$1 $2\n\n-$3');
        text = text.replace(/(https?:\/\/[^\s]+)(?=[^\s])/g, '$1 ');
        text = text.replace(/([^\s])(https?:\/\/)/g, '$1 $2');
        text = text.replace(/\[LINK\]\[\/LINK\]/g, '');
        text = text.replace(/^(#{3})\s*(.+?)\s*-\s*/gm, '### $2\n\n');
        text = text.replace(/\n{3,}/g, '\n\n');
        return text.trim();
    }
}
