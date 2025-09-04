/**
 * Управляет состоянием (открыто/закрыто) для UI-элемента, например, модального окна или меню.
 * Добавляет/удаляет CSS-классы, обрабатывает события открытия/закрытия.
 *
 * @class StateHandler
 */
export class StateHandler {
    /**
     * Создаёт экземпляр StateHandler.
     * @param {Object} elements - Объект с DOM-элементами.
     * @param {HTMLElement|null} elements.wrapper - Основной контейнер, которому добавляется класс открытия.
     * @param {HTMLElement|null} elements.toggle - Элемент-переключатель (например, кнопка меню).
     * @param {HTMLElement|null} elements.closeButton - Кнопка закрытия (опционально).
     *
     * @param {Object} classes - Объект с именами CSS-классов.
     * @param {string} classes.wrapperOpen - Класс, добавляемый к wrapper при открытии.
     * @param {string} classes.toggleHidden - Класс, скрывающий toggle (например, при открытии меню).
     *
     * @param {AbortController} abortController - Контроллер для отписки от событий.
     */
    constructor(elements, classes, abortController) {
        const { wrapper, toggle, closeButton } = elements;
        const { wrapperOpen, toggleHidden } = classes;

        this.wrapper = wrapper;
        this.toggle = toggle;
        this.closeButton = closeButton;
        this.wrapperOpenClass = wrapperOpen;
        this.toggleHiddenClass = toggleHidden;

        this.abortController = abortController;
    }

    /**
     * Открывает компонент: добавляет класс открытия к wrapper и скрывает toggle.
     */
    open() {
        this.wrapper?.classList.add(this.wrapperOpenClass);
        this.toggle?.classList.add(this.toggleHiddenClass);
    }

    /**
     * Закрывает компонент: удаляет класс открытия у wrapper и показывает toggle.
     */
    close() {
        this.wrapper?.classList.remove(this.wrapperOpenClass);
        this.toggle?.classList.remove(this.toggleHiddenClass);
    }

    /**
     * Проверяет, находится ли компонент в открытом состоянии.
     * @returns {boolean} true, если wrapper имеет класс wrapperOpen, иначе false.
     */
    isOpen() {
        return this.wrapper?.classList.contains(this.wrapperOpenClass);
    }

    /**
     * Привязывает обработчики событий к элементам toggle и closeButton.
     * Использует AbortController.signal для возможности отписки.
     *
     * @param {Function} onToggle - Функция-обработчик события переключения состояния.
     *
     * @throws {Error} Если `onToggle` не является функцией.
     */
    bindEvents(onToggle) {
        if (typeof onToggle !== 'function') {
            throw new TypeError('StateHandler: onToggle должен быть функцией');
        }

        const { signal } = this.abortController;

        this.toggle?.addEventListener('click', onToggle, { signal });
        this.closeButton?.addEventListener('click', onToggle, { signal });
    }
}
