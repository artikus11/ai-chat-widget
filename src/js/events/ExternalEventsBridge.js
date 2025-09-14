import { EXTERNAL_EVENTS_MAP } from '@js/config';
/**
 * Мост между внутренней системой событий и внешним миром.
 * Транслирует внутренние события (через Evented) в DOM-события (CustomEvent) на указанном контейнере.
 *
 * Это позволяет внешним системам (например, интеграциям, аналитике или родительским приложениям)
 * реагировать на события внутри компонента без прямой зависимости от его внутренней реализации.
 *
 * @class ExternalEventsBridge
 *
 * @example
 * const bridge = new ExternalEventsBridge(
 *   myComponent,           // экземпляр Evented
 *   document.getElementById('chat-container'),
 *   {
 *     'message:send': 'chat.message.send',
 *     'user:join':    'chat.user.join'
 *   },
 *   logger
 * );
 *
 * // Теперь внешний код может слушать:
 * container.addEventListener('chat.message.send', (e) => {
 *   console.log('Сообщение отправлено:', e.detail);
 * });
 */
export class ExternalEventsBridge {
    /**
     * Создаёт новый экземпляр ExternalEventsBridge.
     *
     * @param {Evented} eventEmitter - Внутренняя шина событий (объект, унаследованный от Evented).
     * @param {HTMLElement} container - DOM-элемент, на котором будут генерироваться CustomEvent.
     * @param {Object} [logger] - Опциональный логгер с методом `.debug(...)` для отладки.
     *
     * @throws {TypeError} Если eventEmitter или container не переданы.
     */
    constructor(eventEmitter, container, logger) {
        if (!eventEmitter) {
            throw new TypeError('Параметр eventEmitter обязателен');
        }
        if (!container) {
            throw new TypeError('Параметр container обязателен');
        }

        /**
         * Внутренняя система событий (например, UI-компонент, расширяющий Evented).
         * @type {Evented}
         * @private
         */
        this.eventEmitter = eventEmitter;

        /**
         * DOM-элемент, на котором будут диспетчеризоваться CustomEvent.
         * @type {HTMLElement}
         * @private
         */
        this.container = container;

        /**
         * Карта соответствия: внутреннее событие → имя внешнего DOM-события.
         * @type {Object<string, string>}
         * @private
         */
        this.map = EXTERNAL_EVENTS_MAP;

        /**
         * Опциональный логгер для отладочных сообщений.
         * Ожидается объект с методом `.debug(...)`.
         * @type {Object|undefined}
         * @private
         */
        this.logger = logger;

        /**
         * Хранилище обработчиков для возможности последующего удаления.
         * Ключ — внутреннее имя события, значение — функция-обработчик.
         * @type {Map<string, Function>}
         * @private
         */
        this.handlers = new Map();

        this.bind();
    }

    /**
     * Подписывается на внутренние события, определённые в `this.map`,
     * и транслирует их в DOM-события (CustomEvent), которые всплывают по дереву.
     *
     * Для каждого события создаётся `CustomEvent` с:
     * - именем из маппинга (`external`)
     * - данными в `detail`
     * - возможностью всплытия (`bubbles: true`) и отмены (`cancelable: true`)
     *
     * @returns {void}
     *
     * @example
     * // При вызове this.eventEmitter.emit('message:send', { text: "Привет" })
     * // будет сгенерировано DOM-событие 'chat.message.send'
     */
    bind() {
        for (const [internal, external] of Object.entries(this.map)) {
            const handler = detail => {
                const event = new CustomEvent(external, {
                    bubbles: true,
                    cancelable: true,
                    detail: detail || {},
                });

                this.container.dispatchEvent(event);

                this.logger?.debug?.(
                    `[ExternalEventsBridge] Dispatched: ${external}`,
                    { internal, detail }
                );
            };

            this.eventEmitter.on(internal, handler);
            this.handlers.set(internal, handler);

            this.logger?.debug?.(
                `[ExternalEventsBridge] Bound: ${internal} → ${external}`
            );
        }
    }

    /**
     * Отвязывает все зарегистрированные обработчики от внутренней шины событий.
     * Вызывается, например, при уничтожении компонента, чтобы избежать утечек памяти.
     *
     * @returns {void}
     *
     * @example
     * bridge.unbind(); // Очищает все подписки
     */
    unbind() {
        for (const [internal, handler] of this.handlers) {
            this.eventEmitter.off(internal, handler);
        }
        this.handlers.clear();

        this.logger?.debug?.('[ExternalEventsBridge] Все обработчики отвязаны');
    }

    /**
     * Полностью перезапускает мост: отвязывает старые события и устанавливает новые.
     * Может использоваться при изменении конфигурации маппинга событий.
     *
     * @param {Object<string, string>} map - Новая карта соответствия событий.
     * @returns {void}
     *
     * @example
     * bridge.reset({
     *   'message:new': 'chat.new-message'
     * });
     */
    reset(map) {
        this.unbind();
        this.map = map;
        this.bind();
    }
}
