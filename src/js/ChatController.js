import { marked } from 'marked';
import DOMPurify from 'dompurify';

export default class ChatController {
    constructor(ui, api, options = {}) {
        this.ui = ui;
        this.api = api;

        console.log(this.api);
        this.greeting = options.greeting || {};
        this.followup = options.followup || {};
        this.fallback = options.fallback || {};
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
                        this.links.push(chunk.response);
                    }
                },
                () => {
                    this.ui.hideTyping();

                    if (this.currentResponse.trim()) {
                        let cleaned = this.normalizeMarkdown(this.currentResponse);

                        cleaned = cleaned.replace(/(https?:\/\/[^\s]+)/g, '[$1]($1)');

                        const html = DOMPurify.sanitize(marked.parse(cleaned));
                        const finalHtml = this.replaceBrWithSpan(html);

                        this.ui.addMessage(finalHtml, false, true);
                        this.currentResponse = '';
                    }

                    if (this.links.length > 0) {
                        const linksHtml = this.links
                            .map(item => {
                                try {
                                    const url = new URL(item.link.trim());
                                    const title = item.title?.trim() || 'Подробнее...';
                                    return `<li><a href="${url.href}" target="_blank" rel="noopener noreferrer">${title}</a></li>`;
                                } catch {
                                    const safeTitle = item.title?.trim() || 'Ссылка';
                                    return `<li><a href="#" target="_blank" rel="noopener noreferrer" onclick="event.preventDefault();">${safeTitle}</a></li>`;
                                }
                            })
                            .join('');

                        const listHtml = `<ul class="links__list">${linksHtml}</ul>`;
                        this.ui.addMessage(listHtml, false, true);
                        this.links = [];
                    }
                },
                () => {
                    this.ui.hideTyping();
                    this.ui.addMessage(this.fallback.text, false);
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

    replaceBrWithSpan(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const paragraphs = doc.querySelectorAll('p');

        paragraphs.forEach(p => {
            p.innerHTML = p.innerHTML.replace(/<br\s*\/?>/g, '<span class="line-break"></span>');
        });

        return doc.body.innerHTML;
    }
}
