import { Utils } from '../utils';

/**
 * Обработчик индикатора печатания («пользователь набирает...»).
 *
 * Отвечает за отображение, обновление и скрытие анимированного индикатора
 * с мигающими точками, а также за его преобразование в полноценное сообщение.
 *
 * @class TypingIndicator
 * @example
 * const handler = new TypingIndicator(messagesContainer, {
 *   message: 'message',
 *   operator: 'operator',
 *   content: 'content',
 *   text: 'text',
 *   typingDots: 'typing-dots'
 * });
 *
 * handler.show();           // Показать индикатор
 * handler.update('Частичный ответ...'); // Обновить текст
 * handler.finalizeAsMessage(); // Зафиксировать как сообщение
 * handler.hide();           // Скрыть полностью
 */
export class TypingIndicator {
    /**
     * Создает экземпляр TypingIndicator
     * @param {HTMLElement} messagesContainer - Контейнер для сообщений
     * @param {Object} classes - Объект с CSS классами
     * @param {string} classes.message - CSS класс сообщения
     * @param {string} classes.operator - CSS класс оператора
     * @param {string} classes.content - CSS класс контента
     * @param {string} classes.text - CSS класс текста
     * @param {string} classes.typingDots - CSS класс анимированных точек
     */
    constructor(messagesContainer, classes, eventEmitter, logger) {
        this.messagesContainer = messagesContainer;
        this.classes = classes;
        this.element = null;

        this.logger = logger;
        this.eventEmitter = eventEmitter;
    }

    /**
     * Отображает индикатор печатания с анимированными точками.
     *
     * Если индикатор уже показан, сначала удаляет старый, чтобы избежать дублирования.
     *
     * @returns {void}
     */
    show() {
        this.hide();

        this.typingEl = document.createElement('div');
        this.typingEl.className = `${this.classes.message} ${this.classes.operator}`;
        this.typingEl.innerHTML = `
        <div class="${this.classes.content}">
            <div class="${this.classes.text}">
                <span class="${this.classes.typingDots}"><span></span></span>
            </div>
        </div>
         `;

        this.messagesContainer.appendChild(this.typingEl);
        Utils.scrollToBottom(this.messagesContainer);
    }

    /**
     * Обновляет текст внутри индикатора.
     *
     * Полезно при потоковой передаче ответа (streaming).
     * При пустом тексте точки восстанавливаются.
     *
     * @param {string} text - Новый текст для отображения.
     * @returns {void}
     */
    update(text) {
        if (!this.typingEl) {
            return;
        }

        const textEl = this.typingEl.querySelector(`.${this.classes.text}`);
        if (textEl) {
            textEl.textContent = text;
        }
        Utils.scrollToBottom(this.messagesContainer);
    }

    /**
     * Скрывает и удаляет индикатор из DOM.
     *
     * Безопасно вызывать, даже если индикатор не отображается.
     *
     * @returns {void}
     */
    hide() {
        if (!this.typingEl) {
            return;
        }

        this.typingEl?.remove();
        this.typingEl = null;
    }

    /**
     * Преобразует индикатор в статическое сообщение:
     * удаляет анимацию точек, оставляя только текст.
     *
     * После вызова индикатор считается завершённым и обнуляется.
     *
     * @returns {void}
     */
    finalizeAsMessage() {
        if (!this.typingEl) {
            return;
        }

        const dots = this.typingEl.querySelector(`.${this.classes.typingDots}`);

        if (dots) {
            dots.remove();
        }

        this.typingEl = null;
    }
}
