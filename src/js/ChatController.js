import { marked } from 'marked';
import DOMPurify from 'dompurify';

export default class ChatController {
    constructor(ui, api, greeting) {
        this.ui = ui;
        this.api = api;
        this.greeting = greeting;
        this.hasGreeted = false;
        this.hasFollowedUp = false;
        this.greetingTimer = null;
        this.followupTimer = null;
        this.currentResponse = '';
    }

    async sendMessage(text, isUserInitiated = true) {
        if (!text.trim()) return;
        console.log(isUserInitiated);
        if (isUserInitiated) {
            this.ui.addMessage(text, true);
            this.ui.showTyping();
        }


        this.currentResponse = '';

        try {
            await this.api.sendMessage(
                text,
                chunk => {
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
                error => {
                    this.ui.hideTyping();
                    this.ui.addMessage(`Ошибка: ${error.message}`, false);
                }
            );
        } catch (e) {
            this.ui.hideTyping();
            this.ui.addMessage('Ошибка подключения.', false);
        }
    }

    autoGreet() {
        if (this.hasGreeted) return;

        this.greetingTimer = setTimeout(() => {
            this.ui.showTyping(); // создаёт элемент с классом chatbox__message--operator и анимацией

            const text = this.greeting;
            let i = 0;

            const interval = setInterval(() => {
                if (i < text.length) {
                    // Обновляем текст в текущем typing-элементе
                    this.ui.updateTyping(text.slice(0, i + 1));
                    this.ui.scrollToBottom();
                    i++;
                } else {
                    clearInterval(interval);

                    // ✅ Важно: НЕ вызываем hideTyping() — не удаляем элемент!
                    // Вместо этого "фиксируем" его как обычное сообщение
                    this.ui.finalizeTypingAsMessage();
                    this.hasGreeted = true;
                }
            }, 40); // скорость печати — можно настроить

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
        // 1. Исправляем "https  ://" → "https://"
        text = text.replace(/https\s*?:\s*?\/\s*?\/\s*?/g, 'https://');

        // 2. Разделяем заголовки от текста: ### Заголовок - **Поле:** → ### Заголовок\n\n- **Поле:**
        text = text.replace(/^(#{1,3})\s*(.+?)\s*-\s*(\*\*.+?\*\*:)/gm, '$1 $2\n\n-$3');

        // 3. Добавляем пробелы перед и после ссылок, чтобы они не слипались
        text = text.replace(/(https?:\/\/[^\s]+)(?=[^\s])/g, '$1 '); // если ссылка вплотную к тексту
        text = text.replace(/([^\s])(https?:\/\/)/g, '$1 $2');

        // 4. Убираем дублирующиеся или "мёртвые" теги, если есть
        text = text.replace(/\[LINK\]\[\/LINK\]/g, '');

        // 5. Заменяем "### Название -" на нормальный заголовок
        text = text.replace(/^(#{3})\s*(.+?)\s*-\s*/gm, '### $2\n\n');

        // 6. Убираем лишние пробелы
        text = text.replace(/\n{3,}/g, '\n\n'); // больше 2 переносов → 2

        return text.trim();
    }
}