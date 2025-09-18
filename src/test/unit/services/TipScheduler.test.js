// src/test/unit/services/TipScheduler.test.js
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TipScheduler } from '@js/services/TipScheduler';
import { EVENTS, SCHEDULER_TYPES } from '@js/config';

// Моки
const createEventEmitter = () => ({
    emit: vi.fn(),
});

const createLogger = () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
});

describe('TipScheduler', () => {
    let scheduler;
    let eventEmitter;
    let logger;

    beforeEach(() => {
        eventEmitter = createEventEmitter();
        logger = createLogger();
        scheduler = new TipScheduler(eventEmitter, logger);

        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.runOnlyPendingTimers();
        vi.useRealTimers();
        vi.clearAllMocks();
    });

    describe('scheduleShow()', () => {
        it('должен запланировать показ и эмитить OUTER_TIP_SCHEDULE_SHOW', () => {
            const delay = 1000;
            const messageType = 'welcome';

            scheduler.scheduleShow(delay, messageType);

            expect(logger.info).toHaveBeenCalledWith(
                `[TipScheduler] Запланировано: ${EVENTS.UI.OUTER_TIP_SCHEDULE_SHOW} через ${delay}мс`
            );
            expect(scheduler.hasScheduled(SCHEDULER_TYPES.OUTER.SHOW)).toBe(true);

            vi.advanceTimersByTime(1000);

            expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.UI.OUTER_TIP_SCHEDULE_SHOW, {
                type: messageType,
            });
            expect(logger.info).toHaveBeenCalledWith(`[TipScheduler] Триггер: ${EVENTS.UI.OUTER_TIP_SCHEDULE_SHOW}`);
            expect(scheduler.hasScheduled(SCHEDULER_TYPES.OUTER.SHOW)).toBe(false);
        });
    });

    describe('scheduleAutoHide()', () => {
        it('должен эмитить OUTER_TIP_AUTO_HIDE после duration', () => {
            const duration = 5000;

            scheduler.scheduleAutoHide(duration);

            expect(logger.info).toHaveBeenCalledWith(
                `[TipScheduler] Запланировано: ${EVENTS.UI.OUTER_TIP_AUTO_HIDE} через ${duration}мс`
            );

            vi.advanceTimersByTime(4999);
            expect(eventEmitter.emit).not.toHaveBeenCalledWith(EVENTS.UI.OUTER_TIP_AUTO_HIDE);

            vi.advanceTimersByTime(1);
            expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.UI.OUTER_TIP_AUTO_HIDE, {});
            expect(logger.info).toHaveBeenCalledWith(`[TipScheduler] Триггер: ${EVENTS.UI.OUTER_TIP_AUTO_HIDE}`);
        });
    });

    describe('scheduleFollowUp()', () => {
        it('должен запланировать follow-up напоминание', () => {
            const delay = 30000;

            scheduler.scheduleFollowUp(delay);

            expect(logger.info).toHaveBeenCalledWith(
                `[TipScheduler] Запланировано: ${EVENTS.UI.OUTER_TIP_FOLLOW_UP_TRIGGER} через ${delay}мс`
            );

            vi.advanceTimersByTime(30000);

            expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.UI.OUTER_TIP_FOLLOW_UP_TRIGGER, {});
        });
    });

    describe('scheduleActiveReturnCheck()', () => {
        it('должен запланировать проверку active_return', () => {
            const delay = 500;

            scheduler.scheduleActiveReturnCheck(delay);

            expect(logger.info).toHaveBeenCalledWith(
                `[TipScheduler] Запланировано: ${EVENTS.UI.OUTER_TIP_ACTIVE_RETURN_TRIGGER} через ${delay}мс`
            );

            vi.advanceTimersByTime(500);

            expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.UI.OUTER_TIP_ACTIVE_RETURN_TRIGGER, {});
        });
    });

    describe('scheduleReturning()', () => {
        it('должен запланировать returning-подсказку', () => {
            const delay = 10000;

            scheduler.scheduleReturning(delay);

            expect(logger.info).toHaveBeenCalledWith(
                `[TipScheduler] Запланировано: ${EVENTS.UI.OUTER_TIP_RETURNING_TRIGGER} через ${delay}мс`
            );

            vi.advanceTimersByTime(10000);

            expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.UI.OUTER_TIP_RETURNING_TRIGGER, {});
        });
    });

    describe('cancel()', () => {
        it('должен отменять конкретный таймер', () => {
            const delay = 2000;

            scheduler.scheduleShow(delay, 'welcome');
            expect(scheduler.hasScheduled(SCHEDULER_TYPES.OUTER.SHOW)).toBe(true);

            scheduler.cancel(SCHEDULER_TYPES.OUTER.SHOW);

            expect(logger.info).toHaveBeenCalledWith(
                `[TipScheduler] Отменён таймер: ${SCHEDULER_TYPES.OUTER.SHOW}`
            );
            expect(scheduler.hasScheduled(SCHEDULER_TYPES.OUTER.SHOW)).toBe(false);

            // Проверим, что таймер не сработал
            vi.advanceTimersByTime(2000);
            expect(eventEmitter.emit).not.toHaveBeenCalledWith(EVENTS.UI.OUTER_TIP_SCHEDULE_SHOW);
        });
    });

    describe('clearAll()', () => {
        it('должен отменять все активные таймеры', () => {
            scheduler.scheduleShow(1000, 'welcome');
            scheduler.scheduleFollowUp(30000);
            scheduler.scheduleAutoHide(8000);

            expect(scheduler.hasScheduled(SCHEDULER_TYPES.OUTER.SHOW)).toBe(true);
            expect(scheduler.hasScheduled(SCHEDULER_TYPES.OUTER.FOLLOW_UP)).toBe(true);
            expect(scheduler.hasScheduled(SCHEDULER_TYPES.OUTER.AUTO_HIDE)).toBe(true);

            scheduler.clearAll();

            expect(logger.info).toHaveBeenCalledWith(
                `[TipScheduler] Отменён таймер: ${SCHEDULER_TYPES.OUTER.SHOW}`
            );
            expect(logger.info).toHaveBeenCalledWith(
                `[TipScheduler] Отменён таймер: ${SCHEDULER_TYPES.OUTER.FOLLOW_UP}`
            );
            expect(logger.info).toHaveBeenCalledWith(
                `[TipScheduler] Отменён таймер: ${SCHEDULER_TYPES.OUTER.AUTO_HIDE}`
            );

            expect(scheduler.hasScheduled(SCHEDULER_TYPES.OUTER.SHOW)).toBe(false);
            expect(scheduler.hasScheduled(SCHEDULER_TYPES.OUTER.FOLLOW_UP)).toBe(false);
            expect(scheduler.hasScheduled(SCHEDULER_TYPES.OUTER.AUTO_HIDE)).toBe(false);

            vi.runAllTimers();
            expect(eventEmitter.emit).not.toHaveBeenCalled();
        });
    });

    describe('hasScheduled()', () => {
        it('должен возвращать true, если таймер запланирован', () => {
            scheduler.scheduleShow(1000, 'welcome');
            expect(scheduler.hasScheduled(SCHEDULER_TYPES.OUTER.SHOW)).toBe(true);

            scheduler.cancel(SCHEDULER_TYPES.OUTER.SHOW);
            expect(scheduler.hasScheduled(SCHEDULER_TYPES.OUTER.SHOW)).toBe(false);
        });
    });

    describe('защита от дублирования', () => {
        it('должен отменять предыдущий таймер при повторном schedule', () => {
            const firstDelay = 1000;
            const secondDelay = 500;

            scheduler.scheduleShow(firstDelay, 'welcome');
            expect(scheduler.hasScheduled(SCHEDULER_TYPES.OUTER.SHOW)).toBe(true);

            scheduler.scheduleShow(secondDelay, 'welcome');

            expect(logger.info).toHaveBeenCalledWith(
                `[TipScheduler] Отменён таймер: ${SCHEDULER_TYPES.OUTER.SHOW}`
            );
            expect(scheduler.hasScheduled(SCHEDULER_TYPES.OUTER.SHOW)).toBe(true);

            vi.advanceTimersByTime(499);
            expect(eventEmitter.emit).not.toHaveBeenCalled();

            vi.advanceTimersByTime(1);
            expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.UI.OUTER_TIP_SCHEDULE_SHOW, {
                type: 'welcome',
            });
        });
    });
});