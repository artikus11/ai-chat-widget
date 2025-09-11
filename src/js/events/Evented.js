import EventEmitter from './EventEmitter';

/**
 * Базовый класс для объектов, которые могут генерировать события.
 */
export class Evented {
    constructor() {
        this._emitter = new EventEmitter();
    }

    on(event, handler) {
        this._emitter.on(event, handler);
        return this;
    }

    once(event, handler) {
        this._emitter.once(event, handler);
        return this;
    }

    off(event, handler) {
        this._emitter.off(event, handler);
        return this;
    }

    emit(event, ...args) {
        this._emitter.emit(event, ...args);
        return this;
    }
}
