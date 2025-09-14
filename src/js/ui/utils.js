import { EVENTS } from '../config/events';
import EventEmitter from '../events/EventEmitter';
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

    /**
     * Запускает анимацию "печати" текста по буквам и возвращает экземпляр {@link EventEmitter}.
     *
     * Поддерживает события:
     * - `typing:update` — при добавлении каждого символа
     * - `typing:finish` — когда весь текст напечатан
     * - `typing:stop` — если анимация была принудительно остановлена
     *
     * Также предоставляет метод `.stop()` на эмиттере для ручной остановки.
     *
     * @param {string} text - Текст для анимации печати
     * @param {Object} options - Настройки анимации
     * @param {number} [options.speed=40] - Базовая задержка между символами в миллисекундах
     * @param {boolean} [options.scrollToBottom=false] - Автоматически прокручивать контейнер вниз
     * @param {HTMLElement} [options.scrollContainer] - Элемент, который будет прокручиваться
     * @returns {EventEmitter} Экземпляр эмиттера с событиями и методом `.stop()`
     *
     * @emits EventEmitter#typing:update {string, string, number} - Текущий текст, текущий символ, индекс
     * @emits EventEmitter#typing:finish {} - Анимация завершена
     * @emits EventEmitter#typing:stop {} - Анимация остановлена вручную
     *
     * @example
     * const anim = Utils.animateTyping("Привет!", {
     *   speed: 50,
     *   scrollToBottom: true,
     *   scrollContainer: messagesContainer
     * });
     *
     * anim.on(TYPING_EVENTS.UPDATE, (currentText, char, index) => {
     *   messageElement.textContent = currentText;
     * });
     *
     * anim.on(TYPING_EVENTS.FINISH, () => {
     *   console.log("Анимация завершена");
     * });
     *
     * // Принудительная остановка
     * // anim.stop();
     *
     * @static
     */
    static animateTyping(text, options = {}) {
        const {
            speed = 40,
            scrollToBottom = false,
            scrollContainer = null,
        } = options;

        const emitter = new EventEmitter();
        let i = 0;
        let isStopped = false;

        // Защита: если текст пустой — сразу финишируем
        if (!text || text.length === 0) {
            setTimeout(() => {
                if (!isStopped) {
                    emitter.emit(EVENTS.UI.TYPING_FINISH);
                }
            }, 0);
            return emitter;
        }

        const interval = setInterval(() => {
            if (isStopped) {
                clearInterval(interval);
                return;
            }

            if (i < text.length) {
                const currentText = text.slice(0, i + 1);
                const char = text[i];

                emitter.emit(EVENTS.UI.TYPING_UPDATE, currentText, char, i);
                i++;
            } else {
                clearInterval(interval);
                isStopped = true;
                emitter.emit(EVENTS.UI.TYPING_FINISH);
            }
        }, this.getRandomSpeed(speed));

        /**
         * Принудительно останавливает анимацию.
         * Гарантированно вызывает STOP и FINISH (если ещё не вызваны).
         */
        emitter.stop = () => {
            if (isStopped) {
                return;
            }
            isStopped = true;

            clearInterval(interval);

            // Опционально: выдать финальный текст
            emitter.emit(EVENTS.UI.TYPING_UPDATE, text);

            emitter.emit(EVENTS.UI.TYPING_STOP);
            emitter.emit(EVENTS.UI.TYPING_FINISH);
        };

        // Автопрокрутка при каждом обновлении (если включено)
        if (scrollToBottom && scrollContainer) {
            const handleScroll = () => {
                Utils.scrollToBottom(scrollContainer);
            };

            emitter.on(EVENTS.UI.TYPING_UPDATE, handleScroll);

            // Отписываемся после завершения, чтобы не мешать
            emitter.once(EVENTS.UI.TYPING_FINISH, () => {
                emitter.off(EVENTS.UI.TYPING_UPDATE, handleScroll);
            });
            emitter.once(EVENTS.UI.TYPING_STOP, () => {
                emitter.off(EVENTS.UI.TYPING_UPDATE, handleScroll);
            });
        }

        return emitter;
    }

    /**
     * Возвращает случайную задержку вокруг базовой скорости, имитируя естественное, "человеческое" поведение при печати.
     * Добавляет вариацию (джиттер) в диапазоне ±`variation` мс относительно `speed`.
     *
     * @param {number} speed - Базовая задержка между символами в миллисекундах
     * @param {number} [variation=10] - Максимальное отклонение от базовой скорости (в мс). По умолчанию 10.
     *                                 Диапазон будет от `-variation` до `+variation`.
     * @returns {number} Итоговая задержка в миллисекундах: `speed + случайное значение из диапазона [-variation; +variation]`
     *
     * @example
     * Utils.getRandomSpeed(40);        // вернёт значение от 30 до 50
     * Utils.getRandomSpeed(50, 5);     // вернёт значение от 45 до 55
     * Utils.getRandomSpeed(30, 15);    // вернёт значение от 15 до 45
     *
     * @private
     * @static
     */
    static getRandomSpeed(speed, variation = 10) {
        const jitter = Math.random() * (2 * variation) - variation;
        return speed + jitter;
    }
}
