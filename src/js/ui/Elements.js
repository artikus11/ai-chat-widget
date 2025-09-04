import { defaultSelectors } from './config';

/**
 * Класс для поиска и хранения DOM-элементов внутри указанного контейнера.
 * @class Elements
 */
export class Elements {
    /**
     * Создаёт экземпляр класса Elements.
     *
     * @param {HTMLElement} container - DOM-элемент, внутри которого будет производиться поиск.
     * @param {Object.<string, string>} [selectors={}] - Объект с парами имя-селектор.
     *        Ключ становится именем свойства, значение — CSS-селектором для `querySelector`.
     *
     * @example
     * const container = document.getElementById('my-container');
     * const elements = new Elements(container, {
     *     title: '.card-title',
     *     button: 'button.submit'
     * });
     * console.log(elements.title); // HTMLElement или null
     * console.log(elements.button); // HTMLElement или null
     */
    constructor(container, selectors = {}) {
        this.selectors = { ...defaultSelectors, ...selectors };
        this.container = container;
        this.#findElements();
    }

    /**
     * Находит все элементы внутри контейнера, используя селекторы,
     * и сохраняет их как свойства экземпляра.
     *
     * Если элемент не найден, свойство будет установлено в `null`.
     * @private
     * @returns {void}
     */
    #findElements() {
        Object.keys(this.selectors).forEach(key => {
            this[key] = this.container.querySelector(this.selectors[key]);
        });
    }
}
