/**
 * EventEmitter для реализации паттерна Pub/Sub.
 */
export default class EventEmitter {
    constructor() {
        this.events = new Map();
    }

    /**
     * Подписаться на событие.
     * @param {string} event
     * @param {Function} handler
     * @returns {EventEmitter}
     */
    on(event, handler) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(handler);
        return this;
    }

    /**
     * Подписаться один раз.
     * @param {string} event
     * @param {Function} handler
     * @returns {EventEmitter}
     */
    once(event, handler) {
        const onceWrapper = (...args) => {
            handler(...args);
            this.off(event, onceWrapper);
        };
        this.on(event, onceWrapper);
        return this;
    }

    /**
     * Отписаться от события.
     * @param {string} event
     * @param {Function} [handler] - если не передан, удаляются все
     * @returns {EventEmitter}
     */
    off(event, handler) {
        if (!this.events.has(event)) {
            return this;
        }

        if (!handler) {
            this.events.delete(event);
        } else {
            const handlers = this.events.get(event).filter(h => h !== handler);
            this.events.set(event, handlers);
        }
        return this;
    }

    /**
     * Вызвать все обработчики события.
     * @param {string} event
     * @param  {...any} args
     * @returns {EventEmitter}
     */
    emit(event, ...args) {
        const handlers = this.events.get(event) || [];
        handlers.forEach(handler => {
            try {
                handler(...args);
            } catch (e) {
                console.error(`Ошибка в обработчике события '${event}':`, e);
            }
        });
        return this;
    }

    /**
     * Проверить, есть ли обработчики.
     * @param {string} event
     * @returns {boolean}
     */
    hasListeners(event) {
        return this.events.has(event) && this.events.get(event).length > 0;
    }
}
