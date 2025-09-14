import { MessageRenderer } from '../renderer/MessageRenderer';

/**
 * Класс для управления отображением сообщений в контейнере чата.
 * Позволяет добавлять текстовые сообщения (пользователя и оператора), ссылки и очищать историю.
 *
 * @class MessageHandler
 */
export class Messages {
    /**
     * Создаёт экземпляр MessageHandler.
     * @param {HTMLElement|null} messagesContainer - DOM-элемент, в который добавляются сообщения.
     * @param {Object} options - Настройки компонента.
     * @param {Object} options.classes - Объект с CSS-классами для стилизации.
     * @param {string} options.classes.message - Базовый класс для всех сообщений.
     * @param {string} options.classes.user - Класс для сообщений пользователя.
     * @param {string} options.classes.operator - Класс для сообщений оператора.
     * @param {string} options.classes.content - Класс для контейнера содержимого сообщения.
     * @param {string} options.classes.text - Класс для текста сообщения.
     */
    constructor(messagesContainer, classes, eventEmitter, logger) {
        this.messagesContainer = messagesContainer;
        this.classes = classes;
        this.eventEmitter = eventEmitter;

        this.renderer = new MessageRenderer(messagesContainer, classes, logger);
    }

    /**
     * Добавляет новое сообщение в контейнер.
     * @param {string} text - Текст сообщения.
     * @param {boolean} isUser - Является ли сообщение от пользователя.
     * @param {boolean} [isHtml=false] - Если true, текст вставляется как HTML (опасно при непроверенных данных).
     * @returns {void}
     */
    addMessage(text, isUser, isHtml = false) {
        return this.renderer.render({
            type: 'text',
            text,
            isUser,
            isHtml,
        });
    }

    /**
     * Добавляет ссылку от оператора как кликабельный элемент.
     * Автоматически проверяет валидность URL и отображает домен.
     * @param {string} url - Полный URL (должен начинаться с http:// или https://).
     * @returns {void}
     */
    addLink(url) {
        return this.renderer.render({
            type: 'link',
            url,
        });
    }

    /**
     * Очищает историю сообщений
     * @returns {void}
     */
    clearHistoryMessages() {
        if (this.messagesContainer) {
            this.messagesContainer.innerHTML = '';
        }
    }
}
