// src/ChatUI.js
export default class ChatUI {
    constructor(container) {
        this.container = container;
        this.elements = this.selectElements();

        this.typingEl = null;
    }

    selectElements() {
        return {
            toggle: this.container.querySelector('.chatbox__toggle'),
            wrapper: this.container.querySelector('.chatbox__wrapper'),
            closeButton: this.container.querySelector('.chatbox__close'),
            messages: this.container.querySelector('.chatbox__messages-inner'),
            textarea: this.container.querySelector('.chatbox__textarea'),
            inputForm: this.container.querySelector('.chatbox__input-form')
        };
    }

    bindEvents(onSubmit, onToggle) {
        this.elements.inputForm?.addEventListener('submit', e => {
            e.preventDefault();
            const text = this.elements.textarea.value.trim();
            if (text) {
                onSubmit(text);
                this.elements.textarea.value = '';
                this.autoResize();


            }
        });

        this.elements.textarea?.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.elements.inputForm?.dispatchEvent(new Event('submit'));
            }
        });

        this.elements.textarea?.addEventListener('input', () => this.autoResize());
        this.elements.toggle?.addEventListener('click', onToggle);
        this.elements.closeButton?.addEventListener('click', onToggle);
    }

    autoResize() {
        const ta = this.elements.textarea;
        if (ta) {
            ta.style.height = 'auto';
            ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
        }
    }

    addMessage(text, isUser, isHtml = false) {
        // const el = document.createElement('div');
        // el.classList.add('chatbox__message');
        // el.classList.add(isUser ? 'chatbox__message--user' : 'chatbox__message--operator');

        // const escaped = this.escapeHtml(text);

        // el.innerHTML = `
        //     <div class="chatbox__message-content">
        //         ${!isUser ? `
        //             <span class="chatbox__message-avatar" style="background-image: url('https://image.crisp.chat/avatar/website/-JzqEmX56venQuQw4YV8/120/?1753352557765')"></span>
        //         ` : ''}
        //         <div class="chatbox__message-text">${escaped}</div>
        //     </div>
        // `;

        // this.elements.messages?.appendChild(el);
        // this.scrollToBottom();


        const el = document.createElement('div');
        el.classList.add('chatbox__message');
        el.classList.add(isUser ? 'chatbox__message--user' : 'chatbox__message--operator');

        const content = document.createElement('div');
        content.className = 'chatbox__message-content';

        // if (!isUser) {
        //     const avatar = document.createElement('span');
        //     avatar.className = 'chatbox__message-avatar';
        //     avatar.style.backgroundImage = "url('https://image.crisp.chat/avatar/website/-JzqEmX56venQuQw4YV8/120/?1753352557765')";
        //     content.appendChild(avatar);
        // }

        const textEl = document.createElement('div');
        textEl.className = 'chatbox__message-text';

        if (isHtml) {
            // Доверяем marked — он уже экранирует опасные теги
            // Но можно дополнительно очистить, если хочешь (см. ниже)
            textEl.innerHTML = text;
        } else {
            textEl.textContent = text;
        }

        content.appendChild(textEl);
        el.appendChild(content);

        this.elements.messages?.appendChild(el);
        this.scrollToBottom();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    scrollToBottom() {
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }

    showTyping() {
        this.typingEl = document.createElement('div');
        this.typingEl.className = 'chatbox__message chatbox__message--operator';
        this.typingEl.innerHTML = `
        <div class="chatbox__message-content">
            <div class="chatbox__message-text">
                <span class="chatbox__typing-dots"></span>
            </div>
        </div>
    `;
        this.elements.messages?.appendChild(this.typingEl);
        this.scrollToBottom();
    }

    updateTyping(text) {
        if (this.typingEl) {
            const textEl = this.typingEl.querySelector('.chatbox__message-text');

            if (textEl) {
                textEl.textContent = text;
            }

            this.scrollToBottom();
        }
    }

    hideTyping() {
        this.typingEl?.remove();
        this.typingEl = null;
    }

    finalizeTypingAsMessage() {
        if (this.typingEl) {
            // Убираем анимацию (точки)
            const dots = this.typingEl.querySelector('.chatbox__typing-dots');
            if (dots) {
                dots.remove();
            }

            // Можно добавить аватар, если его ещё нет
            // const content = this.typingEl.querySelector('.chatbox__message-content');
            // if (content && !this.typingEl.querySelector('.chatbox__message-avatar')) {
            //     const avatar = document.createElement('span');
            //     avatar.className = 'chatbox__message-avatar';
            //     avatar.style.backgroundImage = "url('https://image.crisp.chat/avatar/website/-JzqEmX56venQuQw4YV8/120/?1753352557765')";
            //     content.insertBefore(avatar, content.firstChild);
            // }

            // Убираем классы, связанные с "печатанием", если есть
            // (если ты их добавлял — сейчас не добавляешь, но на будущее)
            // Оставляем только базовые классы

            // Открепляем от контроллера
            this.typingEl = null;
        }
    }


    open() {
        this.elements.wrapper?.classList.add('chatbox__wrapper--open');
        this.elements.toggle?.classList.add('chatbox__toggle--hidden');
    }

    close() {
        this.elements.wrapper?.classList.remove('chatbox__wrapper--open');
        this.elements.toggle?.classList.remove('chatbox__toggle--hidden');
    }

    isOpen() {
        return this.elements.wrapper?.classList.contains('chatbox__wrapper--open');
    }
}