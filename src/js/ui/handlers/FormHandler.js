import { Utils } from '../utils';

/**
 * Класс для управления поведением формы ввода сообщения.
 * Обрабатывает отправку формы, ввод текста, авто-ресайз textarea и состояние элементов.
 *
 * @class FormHandler
 */
export class FormHandler {
    /**
     * Создаёт экземпляр FormHandler.
     *
     * @param {Object} elements - Объект с DOM-элементами формы.
     * @param {HTMLFormElement} elements.inputForm - Форма ввода сообщения.
     * @param {HTMLTextAreaElement} elements.textarea - Поле ввода текста.
     * @param {HTMLButtonElement} elements.sendButton - Кнопка отправки.
     *
     *
     * @param {AbortController} abortController - Контроллер для отписки от событий при уничтожении экземпляра.
     */
    constructor(elements, abortController) {
        const { inputForm, textarea, sendButton } = elements;

        this.inputForm = inputForm;
        this.textarea = textarea;
        this.sendButton = sendButton;

        this.abortController = abortController;
    }

    /**
     * Назначает обработчики событий для формы.
     *
     * @param {Function} onSubmit - Функция обратного вызова, вызываемая при отправке формы.
     *                             Принимает строку — текст сообщения.
     *
     * @throws {Error} Если `onSubmit` не является функцией.
     */
    bindEvents(onSubmit) {
        if (typeof onSubmit !== 'function') {
            throw new TypeError('FormHandler: onSubmit должен быть функцией');
        }

        const { signal } = this.abortController;

        // Обработка отправки формы
        this.inputForm?.addEventListener(
            'submit',
            e => {
                e.preventDefault();
                const text = this.textarea?.value.trim();

                if (text) {
                    onSubmit(text);
                    if (this.textarea) {
                        this.textarea.value = '';
                        Utils.autoResize(this.textarea);
                    }
                }
            },
            { signal }
        );

        // Отправка по Enter (без Shift)
        this.textarea?.addEventListener(
            'keydown',
            e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.inputForm?.dispatchEvent(new Event('submit'));
                }
            },
            { signal }
        );

        // Авто-ресайз при вводе текста
        this.textarea?.addEventListener(
            'input',
            () => {
                Utils.autoResize(this.textarea);
            },
            { signal }
        );
    }

    /**
     * Блокирует поля формы (делает их неактивными).
     */
    disable() {
        if (this.textarea) {
            this.textarea.disabled = true;
        }

        if (this.sendButton) {
            this.sendButton.disabled = true;
        }
    }

    /**
     * Разблокирует поля формы и фокусирует поле ввода.
     * Фокус устанавливается асинхронно, чтобы избежать проблем с фокусировкой.
     */
    enable() {
        if (this.textarea) {
            this.textarea.disabled = false;
        }

        if (this.sendButton) {
            this.sendButton.disabled = false;
        }

        setTimeout(() => {
            this.textarea?.focus();
        }, 100);
    }

    /**
     * Сбрасывает состояние поля ввода: очищает текст, сбрасывает высоту и разблокирует.
     */
    resetTextarea() {
        if (!this.textarea) {
            return;
        }

        this.textarea.value = '';
        this.textarea.style.height = 'auto';
        this.textarea.disabled = false;
        Utils.autoResize(this.textarea);
    }

    /**
     * Сбрасывает состояние кнопки отправки (делает её активной).
     */
    resetSendButton() {
        if (!this.sendButton) {
            return;
        }

        this.sendButton.disabled = false;
    }

    /**
     * Полный сброс формы: сбрасывает поле ввода и кнопку отправки.
     */
    reset() {
        this.resetTextarea();
        this.resetSendButton();
    }
}
