import resolveLogger from '../../utils/resolveLogger';
import { Utils } from '../utils';

/**
 * Класс для рендеринга сообщений в DOM.
 * Поддерживает расширяемые типы контента через registerContentType.
 *
 * @class MessageRenderer
 * @example
 * const renderer = new MessageRenderer(container, classes);
 * renderer.render({ type: 'text', text: 'Привет!', isUser: true });
 * renderer.registerContentType('poll', renderPoll);
 */
export class MessageRenderer {
    /**
     * Создаёт экземпляр MessageRenderer.
     *
     * @param {HTMLElement} container - DOM-элемент, в который добавляются сообщения.
     * @param {Object} classes - Объект с CSS-классами для стилизации.
     * @param {string} classes.message - Базовый класс для всех сообщений.
     * @param {string} classes.user - Класс для сообщений пользователя.
     * @param {string} classes.operator - Класс для сообщений оператора.
     * @param {string} classes.content - Класс контейнера содержимого.
     * @param {string} classes.text - Класс для текста сообщения.
     * @param {string} [classes.image] - Опциональный класс для изображений.
     */
    constructor(container, classes, options) {
        this.messagesContainer = container;
        this.classes = classes;

        this.logger = resolveLogger(options);

        /**
         * Хранилище рендереров по типу контента.
         * Ключ — строка (тип), значение — функция (payload, contentEl) => boolean
         * @type {Map<string, Function>}
         * @private
         */
        this.renderers = new Map();

        /**
         * Рендерер по умолчанию (для неизвестных типов).
         * @type {Function}
         * @private
         */
        this.defaultRenderer = this.#renderUnknown.bind(this);

        this.#registerBuiltInRenderers();
    }

    /**
     * Регистрирует кастомный рендерер для указанного типа контента.
     * После регистрации можно использовать этот тип в методе render().
     *
     * @param {string} type - Уникальный идентификатор типа (например, 'poll', 'image', 'button').
     * @param {Function} renderer - Функция, которая рисует контент.
     *                              Принимает (payload, contentEl) => boolean.
     *                              Должна возвращать true при успехе.
     * @returns {MessageRenderer} this — для цепочки вызовов.
     * @example
     * renderer.registerContentType('poll', (payload, contentEl) => {
     *     const el = document.createElement('div');
     *     el.textContent = payload.question;
     *     contentEl.appendChild(el);
     *     return true;
     * });
     */
    registerContentType(type, renderer) {
        if (typeof renderer !== 'function') {
            this.logger.warn(
                `MessageRenderer.registerContentType: renderer must be a function for '${type}'`
            );
            return this;
        }
        this.renderers.set(type, renderer);
        return this;
    }

    /**
     * Удаляет зарегистрированный рендерер.
     *
     * @param {string} type - Тип контента, который нужно удалить.
     * @returns {MessageRenderer} this — для цепочки вызовов.
     */
    unregisterContentType(type) {
        this.renderers.delete(type);
        return this;
    }

    /**
     * Основной метод для отображения сообщения в чате.
     * Определяет тип контента и вызывает соответствующий рендерер.
     *
     * @param {Object} payload - Данные для отображения.
     * @param {string} payload.type - Тип контента (например, 'text', 'link').
     * @param {boolean} [payload.isUser=false] - Является ли сообщение от пользователя.
     * @param {...*} payload.* - Дополнительные поля, зависящие от типа.
     * @returns {boolean} Успешно ли отрисовано сообщение.
     * @example
     * renderer.render({ type: 'text', text: 'Привет!', isUser: true });
     * renderer.render({ type: 'link', url: 'https://example.com' });
     */
    render(payload) {
        if (!this.#isContainerAvailable()) {
            return false;
        }

        const { type, isUser = false } = payload;

        if (!type) {
            this.logger.warn(
                'MessageRenderer.render: missing "type" in payload',
                payload
            );
            return false;
        }

        const { messageEl, contentEl } = this.#createStructure(isUser, {
            withText: this.#needsTextContainer(type),
        });

        const renderer = this.renderers.get(type) || this.defaultRenderer;
        let success = false;

        try {
            success = renderer(payload, contentEl);
        } catch (err) {
            this.logger.error(
                `MessageRenderer: failed to render type '${type}'`,
                err,
                payload
            );
        }

        if (!success) {
            this.logger.warn(
                `MessageRenderer.render: failed to render type '${type}'`,
                payload
            );
            return false;
        }

        messageEl.appendChild(contentEl);
        this.messagesContainer.appendChild(messageEl);

        Utils.scrollToBottom(this.messagesContainer);

        return true;
    }

    /**
     * Рендерит текстовое сообщение.
     * Использует textContent по умолчанию, innerHTML — если isHtml=true.
     *
     * @private
     * @param {Object} payload - Данные.
     * @param {string} payload.text - Текст сообщения.
     * @param {boolean} [payload.isHtml=false] - Если true, вставляет как HTML (опасно!).
     * @param {HTMLElement} contentEl - Контейнер, в который нужно вставить контент.
     * @returns {boolean} Успешно ли добавлено.
     */
    #renderText(payload, contentEl) {
        const { text, isHtml = false } = payload;
        if (!text) {
            return false;
        }

        const textEl = document.createElement('div');
        textEl.className = this.classes.text;

        textEl[isHtml ? 'innerHTML' : 'textContent'] = text;
        contentEl.appendChild(textEl);
        return true;
    }

    /**
     * Рендерит кликабельную ссылку.
     * Автоматически валидирует URL и отображает только домен.
     *
     * @private
     * @param {Object} payload - Данные.
     * @param {string} payload.url - Полный URL (должен начинаться с http:// или https://).
     * @param {HTMLElement} contentEl - Контейнер для вставки.
     * @returns {boolean} Успешно ли добавлено.
     */
    #renderLink(payload, contentEl) {
        const parsedUrl = this.#validateUrl(payload.url);
        if (!parsedUrl) {
            return false;
        }

        const linkEl = Object.assign(document.createElement('a'), {
            href: parsedUrl.href,
            target: '_blank',
            rel: 'noopener noreferrer',
            className: 'chatbox__link',
            textContent: parsedUrl.hostname,
        });

        contentEl.appendChild(linkEl);
        return true;
    }

    /**
     * Рендерит изображение.
     *
     * @private
     * @param {Object} payload - Данные.
     * @param {string} payload.src - URL изображения.
     * @param {string} [payload.alt=''] - Альтернативный текст.
     * @param {HTMLElement} contentEl - Контейнер для вставки.
     * @returns {boolean} Успешно ли добавлено.
     */
    #renderImage(payload, contentEl) {
        const { src, alt = '' } = payload;
        if (!src) {
            return false;
        }

        const imgEl = Object.assign(document.createElement('img'), {
            src,
            alt,
            className: this.classes.image || 'chatbox__image',
            loading: 'lazy',
        });

        contentEl.appendChild(imgEl);
        return true;
    }

    /**
     * Рендерит системное сообщение (например, "Оператор подключён").
     *
     * @private
     * @param {Object} payload - Данные.
     * @param {string} payload.text - Текст системного сообщения.
     * @param {HTMLElement} contentEl - Контейнер для вставки.
     * @returns {boolean} Успешно ли добавлено.
     */
    #renderSystem(payload, contentEl) {
        const { text } = payload;
        if (!text) {
            return false;
        }

        const textEl = document.createElement('div');
        textEl.className = `${this.classes.text} chatbox__system`;
        textEl.textContent = text;

        contentEl.appendChild(textEl);
        return true;
    }

    /**
     * Рендерит сообщение для неизвестного типа контента.
     *
     * @private
     * @param {Object} payload - Исходные данные (не используется, но передаётся).
     * @param {HTMLElement} contentEl - Контейнер для вставки.
     * @returns {boolean} Всегда true.
     */
    #renderUnknown(payload, contentEl) {
        const textEl = document.createElement('div');
        textEl.className = this.classes.text;
        textEl.textContent = 'Контент не поддерживается';
        contentEl.appendChild(textEl);
        return true;
    }

    /**
     * Создаёт базовую DOM-структуру сообщения.
     *
     * @private
     * @param {boolean} isUser - Сообщение от пользователя?
     * @param {Object} options - Опции.
     * @param {boolean} [options.withText=true] - Добавить ли текстовый контейнер.
     * @returns {{ messageEl: HTMLElement, contentEl: HTMLElement, textEl?: HTMLElement }}
     *          Объект с DOM-элементами.
     */
    #createStructure(isUser, options = {}) {
        const { withText = true } = options;

        const messageEl = document.createElement('div');
        messageEl.classList.add(
            this.classes.message,
            isUser ? this.classes.user : this.classes.operator
        );

        const contentEl = document.createElement('div');
        contentEl.className = this.classes.content;

        const result = { messageEl, contentEl };

        if (withText) {
            const textEl = document.createElement('div');
            textEl.className = this.classes.text;
            result.textEl = textEl;
        }

        return result;
    }

    /**
     * Валидирует URL.
     *
     * @private
     * @param {string} url - URL для проверки.
     * @returns {URL|null} Проанализированный URL или null, если невалидный.
     */
    #validateUrl(url) {
        if (!url || typeof url !== 'string') {
            this.logger.warn(
                'MessageHandler.addLink: invalid URL (not a string or missing)',
                { url }
            );
            return null;
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            this.logger.warn(
                'MessageHandler.addLink: URL must start with http:// or https://',
                url
            );
            return null;
        }

        try {
            return new URL(url);
        } catch (err) {
            this.logger.warn(
                'MessageHandler.addLink: failed to parse URL',
                url,
                err
            );
            return null;
        }
    }

    /**
     * Определяет, нужен ли текстовый контейнер для типа.
     *
     * @private
     * @param {string} type - Тип контента.
     * @returns {boolean} true, если нужен.
     */
    #needsTextContainer(type) {
        return ['text', 'system'].includes(type);
    }

    /**
     * Проверяет, доступен ли контейнер для рендеринга.
     *
     * @private
     * @returns {boolean} true, если контейнер существует.
     */
    #isContainerAvailable() {
        if (!this.messagesContainer) {
            this.logger.warn(
                'MessageRenderer: messagesContainer is not available'
            );
            return false;
        }
        return true;
    }

    /**
     * Регистрирует встроенные типы контента.
     *
     * @private
     */
    #registerBuiltInRenderers() {
        this.registerContentType('text', this.#renderText.bind(this));
        this.registerContentType('link', this.#renderLink.bind(this));
        this.registerContentType('image', this.#renderImage.bind(this));
        this.registerContentType('system', this.#renderSystem.bind(this));
    }
}
