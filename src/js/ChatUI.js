const defaultSelectors = {
  toggle: '.chatbox__toggle',
  wrapper: '.chatbox__wrapper',
  closeButton: '.chatbox__close',
  messages: '.chatbox__messages-inner',
  textarea: '.chatbox__textarea',
  inputForm: '.chatbox__input-form',
};

const defaultClasses = {
  message: 'chatbox__message',
  user: 'chatbox__message--user',
  operator: 'chatbox__message--operator',
  content: 'chatbox__message-content',
  text: 'chatbox__message-text',
  typingDots: 'chatbox__typing-dots',
  wrapperOpen: 'chatbox__wrapper--open',
  toggleHidden: 'chatbox__toggle--hidden',
};

export default class ChatUI {
  constructor(container, options = {}) {
    this.container = container;
    // themeOptions и selectorsOptions объединены в options
    this.selectors = { ...defaultSelectors, ...(options.selectors || {}) };
    this.classes = { ...defaultClasses, ...(options.classes || {}) };
    // Можно добавить обработку themeOptions (например, options.color)
    if (options.color) this.container.style.backgroundColor = options.color;
    if (options.size) this.container.style.fontSize = options.size;
    this.elements = this.selectElements();
    this.typingEl = null;
  }

  selectElements() {
    return {
      toggle: this.container.querySelector(this.selectors.toggle),
      wrapper: this.container.querySelector(this.selectors.wrapper),
      closeButton: this.container.querySelector(this.selectors.closeButton),
      messages: this.container.querySelector(this.selectors.messages),
      textarea: this.container.querySelector(this.selectors.textarea),
      inputForm: this.container.querySelector(this.selectors.inputForm),
    };
  }

  bindEvents(onSubmit, onToggle) {
    this.elements.inputForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.elements.textarea.value.trim();
      if (text) {
        onSubmit(text);
        this.elements.textarea.value = '';
        this.autoResize();
      }
    });

    this.elements.textarea?.addEventListener('keydown', (e) => {
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
    const el = document.createElement('div');
    el.classList.add(this.classes.message);
    el.classList.add(isUser ? this.classes.user : this.classes.operator);

    const content = document.createElement('div');
    content.className = this.classes.content;

    const textEl = document.createElement('div');
    textEl.className = this.classes.text;

    if (isHtml) {
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
    this.typingEl.className = `${this.classes.message} ${this.classes.operator}`;
    this.typingEl.innerHTML = `
        <div class="${this.classes.content}">
            <div class="${this.classes.text}">
                <span class="${this.classes.typingDots}"></span>
            </div>
        </div>
    `;
    this.elements.messages?.appendChild(this.typingEl);
    this.scrollToBottom();
  }

  updateTyping(text) {
    if (this.typingEl) {
      const textEl = this.typingEl.querySelector(`.${this.classes.text}`);
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
      const dots = this.typingEl.querySelector(`.${this.classes.typingDots}`);
      if (dots) {
        dots.remove();
      }
      this.typingEl = null;
    }
  }

  open() {
    this.elements.wrapper?.classList.add(this.classes.wrapperOpen);
    this.elements.toggle?.classList.add(this.classes.toggleHidden);
  }

  close() {
    this.elements.wrapper?.classList.remove(this.classes.wrapperOpen);
    this.elements.toggle?.classList.remove(this.classes.toggleHidden);
  }

  isOpen() {
    return this.elements.wrapper?.classList.contains(this.classes.wrapperOpen);
  }
}
