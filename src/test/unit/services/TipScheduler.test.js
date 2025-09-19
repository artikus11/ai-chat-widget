// src/test/unit/services/TipScheduler.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
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

const createMockScheduler = () => ({
    schedule: vi.fn(),
    cancel: vi.fn(),
    clearAll: vi.fn(),
    hasScheduled: vi.fn(),
});

describe('TipScheduler', () => {
    let scheduler;
    let mockScheduler;
    let eventEmitter;
    let logger;

    beforeEach(() => {
        eventEmitter = createEventEmitter();
        logger = createLogger();
        mockScheduler = createMockScheduler();
        scheduler = new TipScheduler(mockScheduler, eventEmitter, logger);
    });

    describe('scheduleShow()', () => {
        it('делегирует в scheduler.schedule и вызывает emit при срабатывании', () => {
            const delay = 1000;
            const messageType = 'welcome';

            scheduler.scheduleShow(delay, messageType);

            expect(mockScheduler.schedule).toHaveBeenCalledWith(
                SCHEDULER_TYPES.OUTER.SHOW,
                delay,
                expect.any(Function)
            );

            const cb = mockScheduler.schedule.mock.calls[0][2];
            cb();

            expect(logger.info).toHaveBeenCalledWith(
                `[TipScheduler] Триггер: ${EVENTS.UI.OUTER_TIP_SCHEDULE_SHOW}`
            );
            expect(eventEmitter.emit).toHaveBeenCalledWith(
                EVENTS.UI.OUTER_TIP_SCHEDULE_SHOW,
                { type: messageType }
            );
        });
    });

    describe('scheduleAutoHide()', () => {
        it('делегирует в scheduler.schedule и вызывает emit при срабатывании', () => {
            const duration = 5000;

            scheduler.scheduleAutoHide(duration);

            expect(mockScheduler.schedule).toHaveBeenCalledWith(
                SCHEDULER_TYPES.OUTER.AUTO_HIDE,
                duration,
                expect.any(Function)
            );

            const cb = mockScheduler.schedule.mock.calls[0][2];
            cb();

            expect(logger.info).toHaveBeenCalledWith(
                `[TipScheduler] Триггер: ${EVENTS.UI.OUTER_TIP_AUTO_HIDE}`
            );
            expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.UI.OUTER_TIP_AUTO_HIDE);
        });
    });

    describe('scheduleFollowUp()', () => {
        it('делегирует в scheduler.schedule и вызывает emit при срабатывании', () => {
            const delay = 30000;

            scheduler.scheduleFollowUp(delay);

            expect(mockScheduler.schedule).toHaveBeenCalledWith(
                SCHEDULER_TYPES.OUTER.FOLLOW_UP,
                delay,
                expect.any(Function)
            );

            const cb = mockScheduler.schedule.mock.calls[0][2];
            cb();

            expect(logger.info).toHaveBeenCalledWith(
                `[TipScheduler] Триггер: ${EVENTS.UI.OUTER_TIP_FOLLOW_UP_TRIGGER}`
            );
            expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.UI.OUTER_TIP_FOLLOW_UP_TRIGGER);
        });
    });

    describe('scheduleActiveReturnCheck()', () => {
        it('делегирует в scheduler.schedule и вызывает emit при срабатывании', () => {
            const delay = 500;

            scheduler.scheduleActiveReturnCheck(delay);

            expect(mockScheduler.schedule).toHaveBeenCalledWith(
                SCHEDULER_TYPES.OUTER.ACTIVE_RETURN,
                delay,
                expect.any(Function)
            );

            const cb = mockScheduler.schedule.mock.calls[0][2];
            cb();

            expect(logger.info).toHaveBeenCalledWith(
                `[TipScheduler] Триггер: ${EVENTS.UI.OUTER_TIP_ACTIVE_RETURN_TRIGGER}`
            );
            expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.UI.OUTER_TIP_ACTIVE_RETURN_TRIGGER);
        });
    });

    describe('scheduleReturning()', () => {
        it('делегирует в scheduler.schedule и вызывает emit при срабатывании', () => {
            const delay = 10000;

            scheduler.scheduleReturning(delay);

            expect(mockScheduler.schedule).toHaveBeenCalledWith(
                SCHEDULER_TYPES.OUTER.RETURNING,
                delay,
                expect.any(Function)
            );

            const cb = mockScheduler.schedule.mock.calls[0][2];
            cb();

            expect(logger.info).toHaveBeenCalledWith(
                `[TipScheduler] Триггер: ${EVENTS.UI.OUTER_TIP_RETURNING_TRIGGER}`
            );
            expect(eventEmitter.emit).toHaveBeenCalledWith(EVENTS.UI.OUTER_TIP_RETURNING_TRIGGER);
        });
    });

    describe('cancel()', () => {
        it('делегирует вызов в scheduler.cancel', () => {
            scheduler.cancel(SCHEDULER_TYPES.OUTER.SHOW);
            expect(mockScheduler.cancel).toHaveBeenCalledWith(SCHEDULER_TYPES.OUTER.SHOW);
        });
    });

    describe('clearAll()', () => {
        it('делегирует вызов в scheduler.clearAll', () => {
            scheduler.clearAll();
            expect(mockScheduler.clearAll).toHaveBeenCalled();
        });
    });

    describe('hasScheduled()', () => {
        it('делегирует вызов в scheduler.hasScheduled', () => {
            mockScheduler.hasScheduled.mockReturnValue(true);
            const result = scheduler.hasScheduled(SCHEDULER_TYPES.OUTER.SHOW);
            expect(result).toBe(true);
            expect(mockScheduler.hasScheduled).toHaveBeenCalledWith(SCHEDULER_TYPES.OUTER.SHOW);
        });
    });
});
