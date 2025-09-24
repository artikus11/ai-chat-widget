import { Utils } from '../utils';
import { EVENTS } from '../../config';
import { KeyboardScrollBlocker } from '../utils/KeyboardScrollBlocker';

/**
 * Класс для управления поведением формы ввода сообщения.
 * Обрабатывает отправку формы, ввод текста, авто-ресайз textarea, фокусировку,
 * состояние активности элементов и адаптацию под размер экрана (включая клавиатуру на мобильных).
 *
 * @class FormHandler
 * @example
 * const formHandler = new FormHandler(
 *   { inputForm, textarea, sendButton, wrapper },
 *   uiState,
 *   abortController
 * );
 *
 * formHandler.bindEvents((text) => {
 *   sendMessage(text);
 * });
 */
export class FormHandler {
    /**
     * Создаёт экземпляр FormHandler.
     *
     * @param {Object} elements - Объект с DOM-элементами формы.
     * @param {HTMLFormElement} elements.inputForm - Форма ввода сообщения.
     * @param {HTMLTextAreaElement} elements.textarea - Поле ввода текста.
     * @param {HTMLButtonElement} elements.sendButton - Кнопка отправки сообщения.
     * @param {HTMLElement} elements.wrapper - Контейнер чата (для обновления высоты).
     *
     * @param {Object} ui - Экземпляр UI.
     *
     * @param {AbortController} abortController - Контроллер для отписки от всех событий при уничтожении компонента.
     *
     * @throws {TypeError} Если `abortController` не является AbortController.
     *
     * @example
     * const handler = new FormHandler(elements, uiState, new AbortController());
     */
    constructor(ui, elements, abortController, eventEmitter, logger) {
        const { inputForm, textarea, sendButton, wrapper } = elements;

        this.elements = elements;

        this.inputForm = inputForm;
        this.textarea = textarea;
        this.sendButton = sendButton;
        this.wrapper = wrapper;

        this.abortController = abortController;
        this.eventEmitter = eventEmitter;
        this.logger = logger;

        this.ui = ui;

        this.bindResizeHandlers();
    }

    /**
     * Назначает обработчики событий для формы: отправка, ввод текста, отправка по Enter.
     *
     * @param {Function} onSubmit - Функция обратного вызова, вызываемая при отправке сообщения.
     *                              Принимает один аргумент — строку с текстом сообщения.
     *
     * @throws {TypeError} Если `onSubmit` не является функцией.
     *
     * @example
     * formHandler.bindEvents((messageText) => {
     *   console.log('Отправляю:', messageText);
     *   api.sendMessage(messageText);
     * });
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

                    this.eventEmitter.emit(EVENTS.UI.MESSAGE_SENT);

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
     * Подписывается на события изменения размера окна и visualViewport.
     * Обновляет высоту чата через {@link Utils.updateChatHeight}, если UI открыт.
     *
     * Особое внимание уделяется мобильным устройствам: при открытии клавиатуры
     * используется `visualViewport`, чтобы избежать "подрезания" интерфейса.
     *
     * Также обновляет высоту при фокусе/потере фокуса на поле ввода.
     *
     * @private
     */
    bindResizeHandlers() {
        const { signal } = this.abortController;

        const updateHeightIfOpen = () => {
            if (this.ui.isOpen()) {
                Utils.updateChatHeight(this.elements);
            }
        };

        if ('visualViewport' in window) {
            window.visualViewport.addEventListener(
                'resize',
                updateHeightIfOpen,
                { signal }
            );
            window.visualViewport.addEventListener(
                'scroll',
                updateHeightIfOpen,
                { signal }
            );
        } else {
            window.addEventListener('resize', updateHeightIfOpen, { signal });
        }

        new KeyboardScrollBlocker(
            this.textarea,
            () => {
                if (this.ui.isOpen()) {
                    Utils.updateChatHeight(this.elements);
                }
            },
            { signal, mobileBreakpoint: 768 }
        );
    }

    /**
     * Фокусирует поле ввода, если разрешено.
     * На мобильных устройствах фокус не устанавливается автоматически, чтобы не мешать пользователю.
     *
     * @param {boolean} [shouldFocus=true] - Установить ли фокус.
     * @returns {void}
     *
     * @example
     * formHandler.focusInput(); // попробует сфокусировать (кроме мобильных)
     */
    focusInput(shouldFocus = true) {
        if (!shouldFocus) {
            return;
        }

        const isMobile = window.innerWidth <= 768;

        if (isMobile) {
            return;
        }

        setTimeout(() => {
            this.textarea?.focus();
        }, 100);
    }

    /**
     * Блокирует поля формы: делает textarea и кнопку отправки неактивными.
     *
     * @returns {void}
     *
     * @example
     * formHandler.disable(); // форма заблокирована
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
     * Разблокирует поля формы и фокусирует поле ввода (асинхронно).
     *
     * @returns {void}
     *
     * @example
     * formHandler.enable(); // форма активна и готова к вводу
     */
    enable() {
        if (this.textarea) {
            this.textarea.disabled = false;
        }

        if (this.sendButton) {
            this.sendButton.disabled = false;
        }

        this.focusInput();
    }

    /**
     * Сбрасывает состояние поля ввода: очищает текст, сбрасывает высоту и разблокирует.
     *
     * @returns {void}
     *
     * @example
     * formHandler.resetTextarea();
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
     * Сбрасывает состояние кнопки отправки: делает её активной.
     *
     * @returns {void}
     *
     * @example
     * formHandler.resetSendButton();
     */
    resetSendButton() {
        if (!this.sendButton) {
            return;
        }

        this.sendButton.disabled = false;
    }

    /**
     * Полный сброс формы: очищает и разблокирует поле ввода и кнопку отправки.
     *
     * Вызывается, например, после успешной отправки сообщения.
     *
     * @returns {void}
     *
     * @example
     * formHandler.reset(); // форма чиста и активна
     */
    reset() {
        this.resetTextarea();
        this.resetSendButton();
    }
}
