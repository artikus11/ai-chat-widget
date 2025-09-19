import { vi, describe, it, expect, beforeEach } from 'vitest';
import { EVENTS, SCHEDULER_TYPES } from '@js/config';

// 🟢 Моки зависимостей
const mocks = {
    ui: {},
    messagesProvider: {
        getText: vi.fn(() => 'Привет!'),
        getField: vi.fn(() => 3000),
        has: vi.fn(() => true),
    },
    keysProvider: { get: vi.fn(), set: vi.fn() },
    eventEmitter: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
    logger: { info: vi.fn(), warn: vi.fn() },
    presenter: { show: vi.fn(), hide: vi.fn(), destroy: vi.fn(), isShown: false, canRender: vi.fn(() => true) },
    scheduler: {
        scheduleShow: vi.fn(),
        scheduleAutoHide: vi.fn(),
        scheduleFollowUp: vi.fn(),
        hasScheduled: vi.fn(() => false),
        scheduleActiveReturnCheck: vi.fn(),
        scheduleReturning: vi.fn(),
    },
    tipStorage: { markAsShown: vi.fn(), wasShown: vi.fn(() => false) },
    userActivityMonitor: {
        start: vi.fn(),
        markChatOpen: vi.fn(),
        markMessageSent: vi.fn(),
        getLastChatOpenTime: vi.fn(() => null),
        getLastMessageSentTime: vi.fn(() => null),
        hasSentMessage: vi.fn(() => false),
    },
};

// 🟢 Моки модулей
vi.mock('@js/services/TipPresenter', () => ({ TipPresenter: vi.fn(() => mocks.presenter) }));
vi.mock('@js/services/TipScheduler', () => ({ TipScheduler: vi.fn(() => mocks.scheduler) }));
vi.mock('@js/storages/TipStorage', () => ({ TipStorage: vi.fn(() => mocks.tipStorage) }));
vi.mock('@js/services/UserActivityMonitor', () => ({ UserActivityMonitor: vi.fn(() => mocks.userActivityMonitor) }));
vi.mock('@js/services/DecisionEngine', () => ({ DecisionEngine: vi.fn(() => ({ determine: vi.fn(() => 'welcome') })) }));
vi.mock('@js/services/TipCooldown', () => ({ TipCooldown: vi.fn(() => ({})) }));

// 🟢 Импортируем класс после моков
import { OuterTips as OuterTipsClass } from '@js/services/OuterTips';

describe('OuterTips', () => {
    let tips;

    beforeEach(() => {
        vi.clearAllMocks();
        tips = new OuterTipsClass(
            mocks.ui,
            mocks.messagesProvider,
            mocks.keysProvider,
            mocks.eventEmitter,
            mocks.logger
        );
    });

    // ============================================================
    describe('start()', () => {
        it('должен запланировать показ welcome через delay', () => {
            tips.start();
            expect(mocks.messagesProvider.getField).toHaveBeenCalledWith('out', 'welcome', 'delay');
            expect(mocks.scheduler.scheduleShow).toHaveBeenCalledWith(3000, 'welcome');
        });

        it('не должен запускаться повторно', () => {
            tips.started = true;
            tips.start();
            expect(mocks.scheduler.scheduleShow).not.toHaveBeenCalled();
        });
    });

    // ============================================================
    describe('showMessage()', () => {
        it('должен показать текст и эмитить событие', () => {
            tips.showMessage('welcome');
            expect(mocks.presenter.show).toHaveBeenCalledWith('Привет!', expect.any(Function));
        });

        it('не должен показывать если текста нет', () => {
            mocks.messagesProvider.getText.mockReturnValueOnce(null);
            tips.showMessage('welcome');
            expect(mocks.presenter.show).not.toHaveBeenCalled();
        });
    });

    // ============================================================
    describe('showMessageByType()', () => {
        it('должен показать если есть текст и не показан ранее', () => {
            tips.showMessageByType('welcome');
            expect(mocks.presenter.show).toHaveBeenCalled();
            expect(mocks.scheduler.scheduleAutoHide).toHaveBeenCalled();
        });

        it('не должен показывать если сообщения нет', () => {
            mocks.messagesProvider.has.mockReturnValueOnce(false);
            tips.showMessageByType('welcome');
            expect(mocks.presenter.show).not.toHaveBeenCalled();
        });

        it('не должен показывать если уже был показан', () => {
            mocks.tipStorage.wasShown.mockReturnValueOnce(true);
            tips.showMessageByType('welcome');
            expect(mocks.presenter.show).not.toHaveBeenCalled();
        });
    });

    // ============================================================
    describe('hideMessage()', () => {
        it('должен скрывать и эмитить событие', () => {
            tips.hideMessage();
            expect(mocks.presenter.hide).toHaveBeenCalled();
            expect(mocks.eventEmitter.emit).toHaveBeenCalledWith(EVENTS.UI.OUTER_TIP_HIDE);
        });
    });

    // ============================================================
    describe('markChatAsOpened()', () => {
        it('должен пометить чат как открытый', () => {
            tips.markChatAsOpened();
            expect(mocks.userActivityMonitor.markChatOpen).toHaveBeenCalled();
        });
    });

    // ============================================================
    describe('markUserAsActive()', () => {
        it('должен пометить сообщение как отправленное', () => {
            tips.markUserAsActive();
            expect(mocks.userActivityMonitor.markMessageSent).toHaveBeenCalled();
        });
    });

    // ============================================================
    describe('markAsShown()', () => {
        it('должен вызвать tipStorage.markAsShown', () => {
            tips.markAsShown('welcome');
            expect(mocks.tipStorage.markAsShown).toHaveBeenCalledWith('welcome', 'out');
        });

        it('должен ловить исключения и логировать предупреждение', () => {
            mocks.tipStorage.markAsShown.mockImplementationOnce(() => { throw new Error('fail'); });
            tips.markAsShown('welcome');
            expect(mocks.logger.warn).toHaveBeenCalled();
        });
    });

    // ============================================================
    describe('scheduleAutoHide()', () => {
        it('должен планировать авто-скрытие', () => {
            tips.scheduleAutoHide('welcome');
            expect(mocks.messagesProvider.getField).toHaveBeenCalledWith('out', 'welcome', 'duration');
            expect(mocks.scheduler.scheduleAutoHide).toHaveBeenCalled();
        });
    });

    // ============================================================
    describe('scheduleFollowUpReminder()', () => {
        it('должен запланировать follow-up если нет чата', () => {
            mocks.scheduler.hasScheduled.mockReturnValueOnce(false);
            mocks.userActivityMonitor.getLastChatOpenTime.mockReturnValueOnce(null);
            tips.scheduleFollowUpReminder();
            expect(mocks.scheduler.scheduleFollowUp).toHaveBeenCalled();
        });

        it('не должен если уже есть follow-up', () => {
            mocks.scheduler.hasScheduled.mockReturnValueOnce(true);
            tips.scheduleFollowUpReminder();
            expect(mocks.scheduler.scheduleFollowUp).not.toHaveBeenCalled();
        });

        it('не должен если чат открыт', () => {
            mocks.userActivityMonitor.getLastChatOpenTime.mockReturnValueOnce(Date.now());
            tips.scheduleFollowUpReminder();
            expect(mocks.scheduler.scheduleFollowUp).not.toHaveBeenCalled();
        });
    });

    // ============================================================
    describe('scheduleActiveReturn()', () => {
        it('должен запланировать проверку возврата', () => {
            tips.scheduleActiveReturn();
            expect(mocks.messagesProvider.getField).toHaveBeenCalledWith('out', 'active_return', 'delay', 500);
            expect(mocks.scheduler.scheduleActiveReturnCheck).toHaveBeenCalled();
        });
    });

    // ============================================================
    describe('handleChatClose()', () => {
        it('должен запланировать returning если пользователь не писал', () => {
            mocks.userActivityMonitor.hasSentMessage.mockReturnValueOnce(false);
            tips.presenter.isShown = false;
            tips.handleChatClose();
            expect(mocks.scheduler.scheduleReturning).toHaveBeenCalled();
        });

        it('не должен если пользователь писал', () => {
            mocks.userActivityMonitor.hasSentMessage.mockReturnValueOnce(true);
            tips.handleChatClose();
            expect(mocks.scheduler.scheduleReturning).not.toHaveBeenCalled();
        });

        it('не должен если подсказка показана', () => {
            tips.presenter.isShown = true;
            tips.handleChatClose();
            expect(mocks.scheduler.scheduleReturning).not.toHaveBeenCalled();
        });
    });

    // ============================================================
    describe('destroy()', () => {
        it('должен уничтожить presenter и эмитить событие', () => {
            tips.destroy();
            expect(mocks.presenter.destroy).toHaveBeenCalled();
            expect(mocks.eventEmitter.emit).toHaveBeenCalledWith(EVENTS.UI.OUTER_TIP_DESTROY);
        });
    });

    // ============================================================
    describe('getCurrentState()', () => {
        it('должен вернуть базовое состояние без активности', () => {
            const state = tips.getCurrentState();
            expect(state.hasSentMessage).toBe(false);
            expect(state.lastChatOpenTime).toBeNull();
            expect(state.lastMessageSentTime).toBeNull();
        });
    });

    describe('getCurrentState() - различные временные сценарии', () => {
        const now = Date.now();

        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(now);
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('должен определить isRecentlyReturned (от 2 до 10 минут)', () => {
            mocks.userActivityMonitor.getLastChatOpenTime.mockReturnValueOnce(now - 5 * 60 * 1000); // 5 минут назад
            const state = tips.getCurrentState();
            expect(state.isRecentlyReturned).toBe(true);
            expect(state.wasInactiveLongEnough).toBe(false);
        });

        it('должен определить wasInactiveLongEnough (>10 минут)', () => {
            mocks.userActivityMonitor.getLastChatOpenTime.mockReturnValueOnce(now - 15 * 60 * 1000); // 15 минут назад
            const state = tips.getCurrentState();
            expect(state.wasInactiveLongEnough).toBe(true);
            expect(state.isRecentlyReturned).toBe(false);
        });

        it('должен определить isEligibleForReconnect (писал, прошло >10 минут, <1 недели)', () => {
            mocks.userActivityMonitor.getLastMessageSentTime.mockReturnValueOnce(now - 15 * 60 * 1000); // 15 минут назад
            const state = tips.getCurrentState();
            expect(state.isEligibleForReconnect).toBe(true);
        });

        it('не должен быть eligible если сообщение было недавно (<10 минут)', () => {
            mocks.userActivityMonitor.getLastMessageSentTime.mockReturnValueOnce(now - 5 * 60 * 1000); // 5 минут назад
            const state = tips.getCurrentState();
            expect(state.isEligibleForReconnect).toBe(false);
        });

        it('не должен быть eligible если прошло больше недели', () => {
            mocks.userActivityMonitor.getLastMessageSentTime.mockReturnValueOnce(now - 8 * 24 * 60 * 60 * 1000); // 8 дней назад
            const state = tips.getCurrentState();
            expect(state.isEligibleForReconnect).toBe(false);
        });

        it('должен корректно считать время с последнего открытия чата и сообщения', () => {
            mocks.userActivityMonitor.getLastChatOpenTime.mockReturnValueOnce(now - 3 * 60 * 1000);
            mocks.userActivityMonitor.getLastMessageSentTime.mockReturnValueOnce(now - 20 * 60 * 1000);
            const state = tips.getCurrentState();
            expect(state.timeSinceLastOpen).toBe(3 * 60 * 1000);
            expect(state.timeSinceLastMessage).toBe(20 * 60 * 1000);
        });
    });

});
