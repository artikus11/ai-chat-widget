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
        this.links = [];
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

        this.currentResponse = '';

        try {
            await this.api.sendRequest(
                text,
                chunk => {
                    if (chunk.type === 'Message') {
                        this.currentResponse += chunk.response;
                        this.ui.updateTyping(this.currentResponse);
                    } else if (chunk.type === 'Link') {
                        this.links.push(chunk.response.trim());
                    }
                },
                () => {
                    this.ui.hideTyping();

                    if (this.currentResponse.trim()) {
                        let cleaned = this.normalizeMarkdown(this.currentResponse);

                        cleaned = cleaned.replace(/(https?:\/\/[^\s]+)/g, '[$1]($1)');

                        const html = DOMPurify.sanitize(marked.parse(cleaned));

                        this.ui.addMessage(html, false, true);
                        this.currentResponse = '';
                    }

                    if (this.links.length > 0) {
                        const linksHtml = this.links
                            .map(link => {
                                try {
                                    const url = new URL(link);
                                    const pathname = url.pathname.replace(/^\/|\/$/g, '');
                                    const productName = pathname.split('/').pop();
                                    console.log(productName);
                                    return `<li><a href="${link}" target="_blank" rel="noopener noreferrer">${productName}</a></li>`;
                                } catch {
                                    return `<li><a href="${link}" target="_blank" rel="noopener noreferrer">Ссылка</a></li>`;
                                }
                            })
                            .join('');

                        const listHtml = `<ul class="links__list">${linksHtml}</ul>`;
                        this.ui.addMessage(listHtml, false, true); // isHtml=true
                        this.links = []; // Очищаем массив ссылок
                    }
                },
                error => {
                    this.ui.hideTyping();
                    this.ui.addMessage(`Ошибка: ${error.message}`, false);
                }
            );

            this.ui.activeForm();
        } catch {
            this.ui.hideTyping();
            this.ui.addMessage('Ошибка подключения.', false);
        }
    }

    autoGreet() {
        if (this.hasGreeted) {
            return;
        }

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
