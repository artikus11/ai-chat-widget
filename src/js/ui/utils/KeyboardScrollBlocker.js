import { Utils } from "../utils";
/**
 * Управляет блокировкой скролла страницы при открытии виртуальной клавиатуры на мобильных.
 * Применяется только на мобильных устройствах, чтобы избежать "пляски" ширины на десктопе.
 *
 * @class KeyboardScrollBlocker
 */
export class KeyboardScrollBlocker {
    /**
     * Создаёт экземпляр блокировщика.
     *
     * @param {HTMLTextAreaElement} textarea - Поле ввода, при фокусе на котором блокируется скролл.
     * @param {Function} onHeightUpdate - Функция, вызываемая для обновления высоты чата.
     * @param {Object} options - Дополнительные параметры.
     * @param {number} options.mobileBreakpoint - Ширина экрана, ниже которой считаем устройство мобильным.
     * @param {AbortSignal} options.signal - Сигнал от AbortController для отписки.
     */
    constructor(textarea, onHeightUpdate, { mobileBreakpoint = 768, signal } = {}) {
        this.textarea = textarea;
        this.onHeightUpdate = onHeightUpdate;
        this.mobileBreakpoint = mobileBreakpoint;
        this.signal = signal;

        this._unblock = null;
        this._blockScroll = this.#blockScroll.bind(this);

        this.#initialize();
    }



    /**
     * Обработчик, блокирующий события прокрутки.
     * @private
     */
    #blockScroll(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * Блокирует скролл страницы и фиксирует позицию.
     * @private
     */
    #blockPageScroll() {
        const scrollY = window.scrollY;

        // Фиксируем body
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.overflow = 'hidden';

        // Блокируем touchmove и scroll
        document.addEventListener('touchmove', this.#blockScroll, { passive: false });
        document.addEventListener('scroll', this.#blockScroll, { passive: false });

        // Сохраняем функцию для снятия блокировки
        this._unblock = () => {
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
            document.body.style.overflow = '';

            window.scrollTo(0, scrollY);

            document.removeEventListener('touchmove', this.#blockScroll);
            document.removeEventListener('scroll', this.#blockScroll);
            this._unblock = null;
        };

        // Вызываем обновление высоты
        setTimeout(() => {
            this.onHeightUpdate();
        }, 100);
    }

    /**
     * Снимает блокировку скролла.
     * @private
     */
    #unblockPageScroll() {
        if (this._unblock) {
            this._unblock();
        }
    }

    /**
     * Назначает обработчики событий.
     * @private
     */
    #initialize() {
        if (!this.textarea || !this.onHeightUpdate) {
            return;
        }

        const onFocus = () => {
            if (Utils.isMobile()) {
                this.#blockPageScroll();
            } else {
                // На десктопе просто обновляем высоту (на случай адаптивности)
                this.onHeightUpdate();
            }
        };

        const onBlur = () => {
            this.#unblockPageScroll();
        };

        this.textarea.addEventListener('focus', onFocus, { signal: this.signal });
        this.textarea.addEventListener('blur', onBlur, { signal: this.signal });
    }
}