// OuterTip.integration.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// --- МОКИ (до всех import!) ---
// --- МОКИ ---
let mockShow;
let mockHide;
let mockDestroy;
let mockScheduleReturning; // ← добавлено
let mockScheduleAutoHide;
let mockScheduleFollowUp;
let mockScheduleActiveReturnCheck;

// --- ГЛОБАЛЬНОЕ СОСТОЯНИЕ ---
let isPresenterShown = false;

beforeAll(() => {
    mockShow = vi.fn((text, callback) => {
        if (isPresenterShown) return;
        isPresenterShown = true;
        if (callback) callback();
    });

    mockHide = vi.fn(() => {
        isPresenterShown = false;
    });

    mockDestroy = vi.fn();
    mockScheduleReturning = vi.fn();
    mockScheduleAutoHide = vi.fn();
    mockScheduleFollowUp = vi.fn();
    mockScheduleActiveReturnCheck = vi.fn();
});

vi.mock('@js/services/TipPresenter', () => {
    const Mock = vi.fn().mockImplementation(() => ({
        get isShown() {
            return isPresenterShown;
        },
        show: mockShow,
        hide: mockHide,
        destroy: mockDestroy,
        canRender: vi.fn(() => true),
    }));
    return { TipPresenter: Mock };
});

vi.mock('@js/services/TipScheduler', () => {
    const Mock = vi.fn().mockImplementation((scheduler, eventEmitter) => ({
        scheduleShow: vi.fn((delay, type) => {
            setTimeout(() => {
                eventEmitter.emit(EVENTS.UI.OUTER_TIP_SCHEDULE_SHOW, { type });
            }, delay);
        }),
        scheduleReturning: vi.fn((delay) => {
            mockScheduleReturning(delay);
            setTimeout(() => {
                eventEmitter.emit(EVENTS.UI.OUTER_TIP_SCHEDULE_SHOW, { type: 'returning' });
            }, delay);
        }),
        scheduleAutoHide: vi.fn((delay) => {
            mockScheduleAutoHide(delay);
            setTimeout(() => {
                eventEmitter.emit(EVENTS.UI.OUTER_TIP_AUTO_HIDE);
            }, delay);
        }),
        scheduleFollowUp: vi.fn((delay) => {
            mockScheduleFollowUp(delay);
            setTimeout(() => {
                eventEmitter.emit(EVENTS.UI.OUTER_TIP_FOLLOW_UP_TRIGGER);
            }, delay);
        }),
        scheduleActiveReturnCheck: vi.fn((delay) => {
            mockScheduleActiveReturnCheck(delay);
            setTimeout(() => {
                eventEmitter.emit(EVENTS.UI.OUTER_TIP_RETURNING_TRIGGER);
            }, delay);
        }),
        hasScheduled: vi.fn(() => false),
    }));
    return { TipScheduler: Mock };
});

// --- РЕАЛЬНЫЕ ИМПОРТЫ (будут мокированы) ---
import { OuterTips } from '@js/services/OuterTips';
import { TipPresenter } from '@js/services/TipPresenter';
import { TipScheduler } from '@js/services/TipScheduler';
import StorageKeysProvider from '@js/providers/StorageKeysProvider'; // ✅ исправлено!
import { EVENTS } from '@js/config';

// --- МОКИ ЗАВИСИМОСТЕЙ ---
class MockEventEmitter {
    constructor() {
        this.eventListeners = new Map();
        this.emittedEvents = [];
    }

    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, new Set());
        }
        this.eventListeners.get(event).add(callback);
    }

    emit(event, payload) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach((cb) => cb(payload));
        }
        this.emittedEvents.push({ event, payload });
    }

    getEmitted(event) {
        return this.emittedEvents.filter((e) => e.event === event);
    }
}

const TEST_STORAGE_KEYS = {
    OUTER_TIP: {
        WELCOME_SHOWN: 'ui:outer-tip:welcome-shown',
    },
    USER_ACTIVITY: {
        LAST_CHAT_OPEN: 'user:activity:last-chat-open',
        LAST_MESSAGE_SENT: 'user:activity:last-message-sent',
    },
};

const createKeysProvider = (customKeys = TEST_STORAGE_KEYS) => {
    const provider = new StorageKeysProvider(customKeys);
    provider.get = vi.fn(provider.get.bind(provider)); // делаем мок
    return provider;
};

const createMockMessagesProvider = () => ({
    getField: vi.fn((section, type, field, defaultValue) => {
        const config = {
            out: {
                welcome: { delay: 100, duration: 3000 },
                followup: { delay: 200 },
                returning: { delay: 150 },
            },
        };
        return config[section]?.[type]?.[field] ?? defaultValue;
    }),
    getText: vi.fn((section, type) => `Text for ${type}`),
    has: vi.fn(() => true),
});

const createMockLogger = () => ({
    info: vi.fn(),
    warn: vi.fn(),
});

const createMockUI = () => ({
    elements: {
        welcomeTip: { classList: { add: vi.fn(), remove: vi.fn() } },
        toggle: { classList: { add: vi.fn(), remove: vi.fn() } },
    },
    classes: {
        welcomeTipShow: 'show',
    },
});

// --- ТЕСТ ---
describe('OuterTips Integration Test', () => {
    let ui, messagesProvider, keysProvider, eventEmitter, logger, outerTips;

    beforeEach(() => {
        vi.useFakeTimers();
        // vi.clearAllMocks();

        ui = createMockUI();
        messagesProvider = createMockMessagesProvider();
        keysProvider = createKeysProvider();
        eventEmitter = new MockEventEmitter();
        logger = createMockLogger();

        outerTips = new OuterTips(ui, messagesProvider, keysProvider, eventEmitter, logger);
    });

    afterEach(() => {
        vi.useRealTimers();
        if (outerTips) outerTips.destroy();
    });

    it('должен правильно получать ключи при показе welcome', () => {
        // Подготавливаем состояние
        vi.spyOn(outerTips.userActivityMonitor, 'getLastChatOpenTime').mockReturnValue(null);
        vi.spyOn(outerTips.userActivityMonitor, 'getLastMessageSentTime').mockReturnValue(null);

        const wasShownSpy = vi.spyOn(outerTips.tipStorage, 'wasShown').mockReturnValue(false);

        outerTips.start();
        vi.advanceTimersByTime(100); // delay = 100

        // Ожидаем, что правило проверило, было ли показано
        expect(wasShownSpy).toHaveBeenCalledWith('welcome', 'out');

        // Используется ли StorageKeysProvider?
        expect(keysProvider.get).toHaveBeenCalledWith('OUTER_TIP', 'WELCOME_SHOWN');
    });

    it('дожен показать сообщение welcome', () => {
        vi.spyOn(outerTips.decisionEngine, 'determine').mockReturnValue('welcome');
        vi.spyOn(outerTips.tipStorage, 'wasShown').mockReturnValue(false);

        outerTips.start();
        vi.advanceTimersByTime(100);

        expect(mockShow).toHaveBeenCalled();
        expect(mockShow.mock.calls[0][0]).toBe('Text for welcome');
    });

    it('должен запустить auto-hide', () => {
        vi.spyOn(outerTips.decisionEngine, 'determine').mockReturnValue('welcome');
        vi.spyOn(outerTips.tipStorage, 'wasShown').mockReturnValue(false);

        outerTips.start();
        vi.advanceTimersByTime(100);

        expect(mockScheduleAutoHide).toHaveBeenCalledWith(3000);
    });

    it('должен показаться followup, если не открыл чат после welcome', () => {
        vi.spyOn(outerTips.decisionEngine, 'determine').mockReturnValue('welcome');
        vi.spyOn(outerTips.tipStorage, 'wasShown').mockReturnValue(false);

        outerTips.start();
        vi.advanceTimersByTime(100); // welcome показан

        // Не эмитим CHAT_OPEN
        vi.advanceTimersByTime(200); // followup delay

        expect(mockScheduleFollowUp).toHaveBeenCalledWith(200);
    });

    it('должен не показывать follow-up, если чат был открыт', () => {
        vi.spyOn(outerTips.decisionEngine, 'determine').mockReturnValue('followup');
        vi.spyOn(outerTips.tipStorage, 'wasShown').mockReturnValue(false);

        outerTips.start();
        vi.advanceTimersByTime(50);
        eventEmitter.emit(EVENTS.UI.CHAT_OPEN); // ← чат открыт
        vi.advanceTimersByTime(200);

        expect(mockScheduleFollowUp).not.toHaveBeenCalled();
    });

    it('должен скрыть при отправке сообщения', () => {
        vi.spyOn(outerTips.decisionEngine, 'determine').mockReturnValue('welcome');
        vi.spyOn(outerTips.tipStorage, 'wasShown').mockReturnValue(false);

        outerTips.start();
        vi.advanceTimersByTime(100); // welcome показан

        expect(mockShow).toHaveBeenCalled(); // проверяем, что show вызван

        eventEmitter.emit(EVENTS.UI.MESSAGE_SENT);

        expect(mockHide).toHaveBeenCalled(); // ✅ теперь работает
    });

    it('должен показать returning после закрытия чата без сообщений', () => {
        const now = Date.now();

        vi.spyOn(outerTips.userActivityMonitor, 'getLastChatOpenTime').mockReturnValue(now - 5 * 60 * 1000);
        vi.spyOn(outerTips.userActivityMonitor, 'hasSentMessage').mockReturnValue(false);

        vi.spyOn(outerTips.tipStorage, 'wasShown')
            .mockImplementation((type, category) => ['welcome', 'followup'].includes(type) && category === 'out');

        // Убеждаемся, что подсказка не показана
        vi.spyOn(outerTips.presenter, 'isShown', 'get').mockReturnValue(false);
        vi.spyOn(outerTips.presenter, 'canRender').mockReturnValue(true);

        const determineSpy = vi.spyOn(outerTips.decisionEngine, 'determine').mockReturnValue('returning');

        outerTips.handleChatClose();

        vi.advanceTimersByTime(150); // ждём, пока scheduleReturning эмитит событие

        expect(mockScheduleReturning).toHaveBeenCalledWith(150);
        expect(determineSpy).toHaveBeenCalled();
        expect(mockShow).toHaveBeenCalledWith('Text for returning', expect.any(Function));

    });

    it('должен запустить active_return при возврате на страницу', () => {
        eventEmitter.emit(EVENTS.UI.PAGE_RETURN);

        expect(mockScheduleActiveReturnCheck).toHaveBeenCalledWith(500);
    });

    it('должен очищать состояние при вызове destroy', () => {
        outerTips.destroy();

        expect(mockHide).toHaveBeenCalled();
        expect(eventEmitter.emittedEvents).toContainEqual({
            event: EVENTS.UI.OUTER_TIP_DESTROY,
            payload: undefined,
        });
    });

    it('должен не показывать, если canRender() === false', () => {
        vi.spyOn(outerTips.presenter, 'canRender').mockReturnValue(false);
        vi.spyOn(outerTips.decisionEngine, 'determine').mockReturnValue('welcome');

        outerTips.start();
        vi.advanceTimersByTime(100);

        expect(mockShow).not.toHaveBeenCalled();
    });

    it('должен не показывать, если уже показывали (cooldown/storage)', () => {
        vi.spyOn(outerTips.tipStorage, 'wasShown').mockReturnValue(true);

        outerTips.start();
        vi.advanceTimersByTime(100);

        expect(mockShow).not.toHaveBeenCalled();
    });

    it('должен показать reconnect, если пользователь подходит под правило', () => {
        // Подготовка состояния
        const determineSpy = vi
            .spyOn(outerTips.decisionEngine, 'determine')
            .mockReturnValue('reconnect');

        // Запускаем событие так, как если бы TipScheduler сработал
        eventEmitter.emit(EVENTS.UI.OUTER_TIP_SCHEDULE_SHOW, { type: 'reconnect' });

        // Проверяем: движок спросили
        expect(determineSpy).toHaveBeenCalled();

        // Проверяем: показалось нужное сообщение
        expect(mockShow).toHaveBeenCalledWith('Text for reconnect', expect.any(Function));
    });

});