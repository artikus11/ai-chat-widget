import EventEmitter from './EventEmitter';

/**
 * Базовый класс для объектов, которые могут генерировать и обрабатывать события.
 * Наследники этого класса получают возможность подписываться на события,
 * реагировать на них однократно или многократно, а также удалять обработчики.
 *
 * @example
 * class MyComponent extends Evented {
 *   doSomething() {
 *     this.emit('ready', { data: 'loaded' });
 *   }
 * }
 *
 * const component = new MyComponent();
 * component.on('ready', (payload) => {
 *   console.log('Component is ready:', payload);
 * });
 * component.doSomething(); // Выведет: Component is ready: { data: 'loaded' }
 */
export class Evented {
    /**
     * Создаёт экземпляр класса Evented с внутренним экземпляром EventEmitter.
     */
    constructor() {
        /**
         * Экземпляр EventEmitter для управления событиями.
         * @private
         * @type {EventEmitter}
         */
        this._emitter = new EventEmitter();
    }

    /**
     * Регистрирует обработчик события.
     *
     * @param {string} event - Имя события.
     * @param {Function} handler - Функция-обработчик, которая будет вызвана при наступлении события.
     * @returns {Evented} Возвращает текущий экземпляр для поддержки цепочки вызовов.
     *
     * @example
     * obj.on('click', () => { console.log('Clicked!'); });
     */
    on(event, handler) {
        this._emitter.on(event, handler);
        return this;
    }

    /**
     * Регистрирует обработчик события, который будет вызван только один раз.
     *
     * @param {string} event - Имя события.
     * @param {Function} handler - Функция-обработчик, которая будет вызвана один раз.
     * @returns {Evented} Возвращает текущий экземпляр для поддержки цепочки вызовов.
     *
     * @example
     * obj.once('init', () => { console.log('Initialized once.'); });
     */
    once(event, handler) {
        this._emitter.once(event, handler);
        return this;
    }

    /**
     * Удаляет обработчик события. Если обработчик не указан, удаляются все обработчики для данного события.
     *
     * @param {string} event - Имя события.
     * @param {Function} [handler] - Функция-обработчик, которую нужно удалить.
     *                              Если не указана, удаляются все обработчики для события.
     * @returns {Evented} Возвращает текущий экземпляр для поддержки цепочки вызовов.
     *
     * @example
     * const handleClick = () => { console.log('Clicked'); };
     * obj.on('click', handleClick);
     * obj.off('click', handleClick); // Удаляет конкретный обработчик
     *
     * obj.off('click'); // Удаляет все обработчики события 'click'
     */
    off(event, handler) {
        this._emitter.off(event, handler);
        return this;
    }

    /**
     * Генерирует событие с переданными аргументами.
     *
     * @param {string} event - Имя события.
     * @param {...*} args - Аргументы, которые будут переданы обработчикам.
     * @returns {Evented} Возвращает текущий экземпляр для поддержки цепочки вызовов.
     *
     * @example
     * obj.emit('data', { value: 42 });
     */
    emit(event, ...args) {
        this._emitter.emit(event, ...args);
        return this;
    }
}
