import { EVENTS } from '../../config';

/**
 * Управляет состоянием (открыто/закрыто) для UI-элемента, например, модального окна или меню.
 * Добавляет/удаляет CSS-классы, обрабатывает события открытия/закрытия.
 *
 * @class StateManager
 * @example
 * const stateHandler = new StateManager(
 *   { wrapper, toggle, closeButton },
 *   { wrapperOpen: 'menu-open', toggleHidden: 'hidden' },
 *   abortController,
 *   console
 * );
 *
 * stateHandler.bindEvents(() => {
 *   if (stateHandler.isOpen()) {
 *     stateHandler.close();
 *   } else {
 *     stateHandler.open();
 *   }
 * });
 */
export class StateManager {
    /**
     * Создаёт экземпляр StateManager.
     *
     * @param {Object} elements - Объект с DOM-элементами интерфейса.
     * @param {HTMLElement|null} elements.wrapper - Основной контейнер, которому добавляется класс при открытии.
     * @param {HTMLElement|null} elements.toggle - Элемент-переключатель (например, кнопка меню).
     * @param {HTMLElement|null} [elements.closeButton] - Кнопка закрытия (опционально).
     *
     * @param {Object} classes - Объект с именами CSS-классов для управления состоянием.
     * @param {string} classes.wrapperOpen - Класс, добавляемый к `wrapper` при открытии (например, 'open').
     * @param {string} classes.toggleHidden - Класс, скрывающий `toggle` при открытом состоянии (например, 'hidden').
     *
     * @param {AbortController} abortController - Контроллер для отписки от всех событий (например, при размонтировании).
     * @param {Object} [logger] - Опциональный логгер (например, `console`) для отладочных сообщений.
     *
     * @throws {TypeError} Если `abortController` не передан или не является AbortController.
     *
     * @example
     * const handler = new StateHandler(
     *   { wrapper, toggle, closeButton },
     *   { wrapperOpen: 'modal-open', toggleHidden: 'visually-hidden' },
     *   new AbortController(),
     *   console
     * );
     */
    constructor(elements, classes, abortController, eventEmitter, logger) {
        const { wrapper, toggle, closeButton } = elements;
        const { wrapperOpen, toggleHidden } = classes;

        this.logger = logger;

        this.eventEmitter = eventEmitter;

        this.wrapper = wrapper;
        this.toggle = toggle;
        this.closeButton = closeButton;
        this.wrapperOpenClass = wrapperOpen;
        this.toggleHiddenClass = toggleHidden;

        this.abortController = abortController;
    }

    /**
     * Устанавливает значение для всех атрибутов элемента, начинающихся с `data-`.
     *
     * Полезно для синхронизации состояния через data-атрибуты (например, `data-state="open"`).
     *
     * @param {HTMLElement} element - Элемент, чьи data-атрибуты нужно обновить.
     * @param {string} value - Новое значение для всех data-атрибутов.
     * @returns {void}
     * @private
     *
     * @example
     * this.setAllDataAttributesToValue(this.wrapper, 'open'); // data-x="open", data-y="open"
     */
    setAllDataAttributesToValue(element, value) {
        Array.from(element.attributes)
            .filter(attr => attr.name.startsWith('data-'))
            .forEach(attr => {
                element.setAttribute(attr.name, value);
            });
    }

    /**
     * Открывает компонент: добавляет класс открытия к wrapper и скрывает toggle.
     *
     * Также обновляет все data-атрибуты wrapper на значение `'open'`.
     *
     * @returns {void}
     *
     * @example
     * stateHandler.open();
     */
    open() {
        this.wrapper?.classList.add(this.wrapperOpenClass);
        this.setAllDataAttributesToValue(this.wrapper, 'open');
        this.toggle?.classList.add(this.toggleHiddenClass);

        this.eventEmitter.emit(EVENTS.UI.CHAT_OPEN);
    }

    /**
     * Закрывает компонент: удаляет класс открытия у wrapper и показывает toggle.
     *
     * Также обновляет все data-атрибуты wrapper на значение `'hide'`.
     *
     * @returns {void}
     *
     * @example
     * stateHandler.close();
     */
    close() {
        this.wrapper?.classList.remove(this.wrapperOpenClass);
        this.setAllDataAttributesToValue(this.wrapper, 'hide');
        this.toggle?.classList.remove(this.toggleHiddenClass);

        this.eventEmitter.emit(EVENTS.UI.CHAT_CLOSE);
    }

    /**
     * Проверяет, находится ли компонент в открытом состоянии.
     *
     * @returns {boolean} `true`, если `wrapper` существует и содержит класс `wrapperOpenClass`, иначе `false`.
     *
     * @example
     * if (stateHandler.isOpen()) {
     *   console.log('Меню открыто');
     * }
     */
    isOpen() {
        return this.wrapper?.classList.contains(this.wrapperOpenClass);
    }

    /**
     * Привязывает обработчики кликов к элементам `toggle` и `closeButton`.
     * Использует `AbortController.signal` для возможности централизованного удаления слушателей.
     *
     * @param {Function} onToggle - Функция-обработчик, вызываемая при клике на toggle или closeButton.
     *                              Должна управлять логикой переключения состояния (открыть/закрыть).
     *
     * @throws {TypeError} Если `onToggle` не является функцией.
     *
     * @example
     * stateHandler.bindEvents(() => {
     *   stateHandler.isOpen() ? stateHandler.close() : stateHandler.open();
     * });
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
