// src/test/unit/ui/features/OuterTips.unit.test.js
import { describe, test, expect, vi } from 'vitest';
import { OuterTips } from '@js/ui/features/OuterTips';
import { Utils } from '@js/ui/utils';
import { STORAGE_KEYS, EVENTS } from '@js/config';

const NOW = 1700000000000;

describe('OuterTips > Unit', () => {
    let instance;
    let elements;
    let classes;
    let messagesProvider;
    let eventEmitter;
    let logger;
    let tipElement;
    let toggleButton;

    beforeEach(() => {
        vi.useFakeTimers().setSystemTime(NOW);
        document.body.innerHTML = '';
        localStorage.clear();

        toggleButton = document.createElement('button');
        tipElement = document.createElement('div');
        document.body.append(toggleButton, tipElement);

        elements = { toggle: toggleButton, welcomeTip: tipElement };
        classes = { welcomeTipShow: 'show' };

        messagesProvider = {
            has: vi.fn(() => true),
            getField: vi.fn((ns, type, field, def) => def),
            getText: vi.fn((ns, type) => `Текст: ${type}`)
        };

        eventEmitter = { on: vi.fn(), emit: vi.fn() };
        logger = console; // можно использовать реальный console

        let mockAnimationInstance;

        Utils.animateTyping = vi.fn().mockImplementation((text) => {
            const handlers = {};

            mockAnimationInstance = {
                on: (event, handler) => {
                    handlers[event] = handler;
                },
                emit: (event, ...args) => {
                    if (handlers[event]) {
                        handlers[event](...args);
                    }
                },
                stop: vi.fn(),
                handlers // для дебага
            };

            return mockAnimationInstance;
        });

        instance = new OuterTips(elements, classes, messagesProvider, eventEmitter, logger);
    });

    afterEach(() => {
        vi.useRealTimers();
        document.body.innerHTML = '';
        vi.clearAllMocks();
    });

    test('constructor должен установить все свойства', () => {
        expect(instance.toggleButton).toBe(toggleButton);
        expect(instance.tipElement).toBe(tipElement);
        expect(instance.tipClassShow).toBe('show');
        expect(instance.messagesProvider).toBe(messagesProvider);
        expect(instance.eventEmitter).toBe(eventEmitter);
        expect(instance.logger).toBe(logger);
    });

    test('getCurrentState: возвращает актуальные данные из localStorage', () => {
        localStorage.setItem(STORAGE_KEYS.UI.OUTER_TIP.LAST_CHAT_OPEN, (NOW - 1000).toString());
        localStorage.setItem(STORAGE_KEYS.UI.OUTER_TIP.MESSAGE_SENT, 'true');

        const state = instance.getCurrentState();

        expect(state.lastChatOpenTime).toBe(NOW - 1000);
        expect(state.hasSentMessage).toBe(true);
    });

    test('getCurrentState: должен возвращать актуальное lastChatOpenTime из localStorage', () => {
        const time = Date.now();
        localStorage.setItem(STORAGE_KEYS.UI.OUTER_TIP.LAST_CHAT_OPEN, time.toString());

        const state = instance.getCurrentState();

        expect(state.lastChatOpenTime).toBe(time);
    });

    test('getCurrentState: если ключ не установлен, lastChatOpenTime = null', () => {
        localStorage.removeItem(STORAGE_KEYS.UI.OUTER_TIP.LAST_CHAT_OPEN);

        const state = instance.getCurrentState();

        expect(state.lastChatOpenTime).toBeNull();
    });

    test('getDelayForType: использует провайдер, иначе дефолт', () => {
        messagesProvider.getField.mockReturnValue(5000);

        const delay = instance.getDelayForType('welcome');

        expect(delay).toBe(5000);
        expect(messagesProvider.getField).toHaveBeenCalledWith(
            'out',
            'welcome',
            'delay',
            OuterTips.DEFAULT_DELAY.welcome
        );
    });

    test('start() должен вызвать determine внутри setTimeout', () => {
        const delay = 3000;
        vi.spyOn(instance, 'getDelayForType').mockReturnValue(delay);
        const determineSpy = vi.spyOn(instance.decisionEngine, 'determine').mockReturnValue('welcome');

        instance.start();

        // Критически важно: продвинуть таймер
        vi.advanceTimersByTime(delay);

        expect(determineSpy).toHaveBeenCalled();
    });

    test('start() должен передать актуальное состояние в determine', () => {
        const delay = 3000;
        vi.spyOn(instance, 'getDelayForType').mockReturnValue(delay);

        const determineSpy = vi.spyOn(instance.decisionEngine, 'determine');
        const getCurrentStateSpy = vi.spyOn(instance, 'getCurrentState').mockReturnValue({
            lastChatOpenTime: null,
            hasSentMessage: false
        });

        instance.start();
        vi.advanceTimersByTime(delay);

        expect(getCurrentStateSpy).toHaveBeenCalled();
        expect(determineSpy).toHaveBeenCalledWith({
            lastChatOpenTime: null,
            hasSentMessage: false
        });
    });

    test('start() должен показать welcome после задержки', () => {
        const delay = 3000;
        vi.spyOn(instance, 'getDelayForType').mockReturnValue(delay);
        vi.spyOn(instance.decisionEngine, 'determine').mockReturnValue('welcome');
        vi.spyOn(instance, 'showMessage');

        instance.start();
        vi.advanceTimersByTime(delay);

        expect(instance.showMessage).toHaveBeenCalledWith('welcome');
    });


    test('handleChatClose должен показать returning после задержки', () => {
        vi.spyOn(instance.decisionEngine, 'determine').mockReturnValue('returning');
        vi.spyOn(instance, 'showMessageByType');

        instance.handleChatClose();
        const returningDelay = instance.getDelayForType('returning');

        vi.advanceTimersByTime(returningDelay);

        expect(instance.showMessageByType).toHaveBeenCalledWith('returning');
    });

    test('после анимации текст должен обновиться', () => {
        const delay = 3000;
        vi.spyOn(instance, 'getDelayForType').mockReturnValue(delay);
        vi.spyOn(instance.decisionEngine, 'determine').mockReturnValue('welcome');

        instance.start();
        vi.advanceTimersByTime(delay); // запускаем колбэк

        const mockAnimation = Utils.animateTyping.mock.results[0]?.value;
        expect(mockAnimation).toBeDefined();

        mockAnimation.emit(EVENTS.UI.TYPING_UPDATE, 'Текст: welcome');

        expect(instance.tipElement.textContent).toBe('Текст: welcome');

        mockAnimation.emit(EVENTS.UI.TYPING_FINISH);

        expect(instance.eventEmitter.emit).toHaveBeenCalledWith(EVENTS.UI.OUTER_TIP_SHOW, { type: 'welcome' });
    });

    test('scheduleFollowUpReminder должен показать followup после 30 сек', () => {
        const welcomeDelay = 3000;
        const followupDelay = 30000;

        vi.spyOn(instance, 'getDelayForType')
            .mockImplementation((type) => (type === 'welcome' ? welcomeDelay : followupDelay));

        vi.spyOn(instance.decisionEngine, 'determine')
            .mockReturnValueOnce('welcome')
            .mockReturnValue('followup');

        vi.spyOn(instance, 'showMessageByType');
        vi.spyOn(instance, 'getLastChatOpenTime').mockReturnValue(null);
        vi.spyOn(instance, 'canRender').mockReturnValue(true);

        instance.isShown = false;

        instance.start();

        vi.advanceTimersByTime(welcomeDelay);

        // Проверяем, что followup запланирован
        expect(instance.followUpTimeout).toBeDefined();

        // Пропускаем оставшееся время
        vi.advanceTimersByTime(followupDelay - welcomeDelay);

        expect(instance.showMessageByType).toHaveBeenCalledWith('followup');
    });

});