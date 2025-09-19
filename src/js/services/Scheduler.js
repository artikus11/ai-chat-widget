// services/Scheduler.js
export class Scheduler {
    constructor(logger) {
        this.logger = logger;
        this.timeouts = new Map();
    }

    schedule(type, delay, callback) {
        this.cancel(type);

        const id = setTimeout(() => {
            this.timeouts.delete(type);
            callback();
        }, delay);

        this.timeouts.set(type, id);
        this.logger?.info?.(
            `[Scheduler] Запланировано: ${type} через ${delay}мс`
        );
    }

    cancel(type) {
        const id = this.timeouts.get(type);
        if (id) {
            clearTimeout(id);
            this.timeouts.delete(type);
            this.logger?.info?.(`[Scheduler] Отменён таймер: ${type}`);
        }
    }

    clearAll() {
        for (const [type, id] of this.timeouts) {
            clearTimeout(id);
            this.logger?.info?.(`[Scheduler] Отменён таймер: ${type}`);
        }
        this.timeouts.clear();
    }

    hasScheduled(type) {
        return this.timeouts.has(type);
    }
}
