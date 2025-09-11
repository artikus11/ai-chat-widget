/**
 * Утилиты для работы с DOM, прокруткой, размерами элементов и адаптацией под мобильные устройства.
 *
 * @class Utils
 */
export class Utils {
    /**
     * Хранит элементы, для которых уже запрошена прокрутка до конца,
     * чтобы избежать дублирования анимаций при частых вызовах.
     *
     * @type {WeakMap<HTMLElement, boolean>}
     * @static
     * @private
     */
    static pendingScrolls = new WeakMap();

    /**
     * Логгер для отладочных сообщений. Ожидается объект с методом `.debug(...)`.
     * Может быть установлен через {@link Utils.setLogger}.
     *
     * @type {Object|console|null}
     * @static
     */
    static logger = null;

    /**
     * Устанавливает логгер для вывода отладочной информации.
     *
     * @param {Object} logger - Объект с методом `debug(...)` (например, console или кастомный логгер)
     * @example
     * Utils.setLogger(console);
     * @static
     */
    static setLogger(logger) {
        this.logger = logger;
    }

    /**
     * Плавно прокручивает указанный элемент вниз до конца его содержимого.
     * Предотвращает множественные вызовы для одного и того же элемента.
     *
     * @param {HTMLElement} element - Элемент, который нужно прокрутить (например, контейнер сообщений)
     * @returns {void}
     * @example
     * Utils.scrollToBottom(chatContainer);
     * @static
     */
    static scrollToBottom(element) {
        if (!element) {
            return;
        }

        if (this.pendingScrolls.has(element)) {
            return;
        }

        this.pendingScrolls.set(element, true);

        requestAnimationFrame(() => {
            element.scrollTop = element.scrollHeight;
            this.pendingScrolls.delete(element);
        });
    }

    /**
     * Автоматически изменяет высоту текстового поля (textarea), чтобы вместить весь текст,
     * с ограничениями по минимальной и максимальной высоте.
     *
     * @param {HTMLTextAreaElement} textarea - Текстовое поле, которое нужно изменить
     * @returns {void}
     * @example
     * Utils.autoResize(textarea);
     * @static
     */
    static autoResize(textarea) {
        if (!textarea) {
            return;
        }

        const MIN_HEIGHT = 40;
        const MAX_HEIGHT = 120;

        const style = window.getComputedStyle(textarea);
        const paddingTop = parseFloat(style.paddingTop);
        const paddingBottom = parseFloat(style.paddingBottom);
        const borderTop = parseFloat(style.borderTopWidth);
        const borderBottom = parseFloat(style.borderBottomWidth);

        const verticalPaddings = paddingTop + paddingBottom;
        const verticalBorders = borderTop + borderBottom;
        const totalVertical = verticalPaddings + verticalBorders;

        textarea.style.height = 'auto';

        const contentHeight = textarea.scrollHeight - totalVertical;
        const targetHeight = Math.max(
            MIN_HEIGHT,
            Math.min(contentHeight, MAX_HEIGHT)
        );

        textarea.style.height = `${targetHeight + totalVertical}px`;
    }

    /**
     * Обновляет высоту чата в зависимости от доступного экранного пространства.
     * Особое внимание уделяется ситуации с открытой клавиатурой на мобильных устройствах
     * с использованием `visualViewport`.
     *
     * @param {Object} elements - Объект с необходимыми DOM-элементами
     * @param {HTMLElement} elements.wrapper - Контейнер чата (должен иметь position: fixed)
     * @param {HTMLElement} elements.inputForm - Форма ввода (для измерения её высоты)
     * @param {HTMLTextAreaElement} elements.textarea - Поле ввода внутри формы
     * @param {number} [originalHeight=580] - Исходная (по умолчанию) высота чата в пикселях
     * @returns {void}
     * @example
     * Utils.updateChatHeight({
     *   wrapper: document.getElementById('chat-wrapper'),
     *   inputForm: document.getElementById('input-form'),
     *   textarea: document.querySelector('#input-form textarea')
     * }, 580);
     * @static
     */
    static updateChatHeight(elements, originalHeight = 580) {
        const { inputForm, textarea, wrapper } = elements;

        if (!wrapper) {
            return;
        }

        let height;

        const isInputFocused = document.activeElement === textarea;

        if ('visualViewport' in window && isInputFocused) {
            const viewportHeight = window.visualViewport.height;
            const screenHeight = screen.height;

            if (viewportHeight < screenHeight - 100) {
                const inputAreaHeight = this.getInputAreaHeight(inputForm);

                const safeMargin = 40;

                height = viewportHeight - inputAreaHeight - safeMargin;
            } else {
                height = originalHeight;
            }
        } else {
            height = originalHeight;
        }

        const minHeight = 200;
        const finalHeight = Math.max(height, minHeight);

        wrapper.style.maxHeight = `${finalHeight}px`;

        this.logger?.debug('[Utils.updateChatHeight]', {
            finalHeight,
            visualViewportHeight: window.visualViewport?.height ?? 'n/a',
            innerHeight: window.innerHeight,
            isInputFocused,
            screenHeight: screen.height,
            inputAreaHeight: this.getInputAreaHeight(inputForm),
            keyboardLikelyOpen: isInputFocused && height < originalHeight,
        });
    }

    /**
     * Возвращает высоту области ввода (формы) в пикселях.
     * Используется для корректного расчёта свободного места под чат.
     *
     * @param {HTMLElement|null} inputForm - DOM-элемент формы ввода
     * @returns {number} Высота формы в пикселях или 60, если элемент не найден
     * @static
     * @private
     */
    static getInputAreaHeight(inputForm) {
        if (!inputForm) {
            return 60;
        }

        const rect = inputForm.getBoundingClientRect();
        return rect.height;
    }
}
