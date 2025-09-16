// src/test/integration/ui/features/OuterTips.integration.test.js
import { describe, test, expect, vi } from 'vitest';
import { OuterTips } from '@js/ui/features/OuterTips';
import { OuterTipsDecisionEngine } from '@js/ui/components/OuterTipsDecisionEngine';
import { STORAGE_KEYS, EVENTS } from '@js/config';


vi.mock('@js/ui/utils', () => {
    const mockAnimation = {
        on: vi.fn(),
        emit: vi.fn(),
        stop: vi.fn()
    };

    return {
        Utils: {
            animateTyping: vi.fn().mockReturnValue(mockAnimation),
            scrollToBottom: () => { },
            autoResize: () => { },
            updateChatHeight: () => { },
            getRandomSpeed: speed => speed
        }
    };
});

const NOW = 1700000000000;

//Сценарий start() → determine() → welcome → markAsShown() → scheduleFollowUpReminder() → determine() → followup

describe('OuterTips > Интеграция с OuterTipsDecisionEngine', () => {
    let outerTips;
    let messagesProvider;
    let eventEmitter;
    let tipElement;
    let toggleButton;

    beforeEach(() => {
        vi.useFakeTimers().setSystemTime(NOW);
        document.body.innerHTML = '';

        toggleButton = document.createElement('button');
        tipElement = document.createElement('div');
        document.body.append(toggleButton, tipElement);

        messagesProvider = {
            has: vi.fn((ns, type) => ['welcome', 'followup'].includes(type)),
            getField: vi.fn((ns, type, field, def) => def),
            getText: vi.fn((ns, type) => `Текст: ${type}`)
        };

        eventEmitter = { on: vi.fn(), emit: vi.fn() };

        outerTips = new OuterTips(
            { toggle: toggleButton, welcomeTip: tipElement },
            { welcomeTipShow: 'show' },
            messagesProvider,
            eventEmitter,
            console
        );
    });

    afterEach(() => {
        vi.useRealTimers();
        localStorage.clear();
        vi.clearAllMocks();
    });


    test('должен показать welcome, а затем followup через 30 сек', () => {
        const determineSpy = vi.spyOn(outerTips.decisionEngine, 'determine')
            .mockReturnValueOnce('welcome')
            .mockReturnValue('followup');

        const showMessageByTypeSpy = vi.spyOn(outerTips, 'showMessageByType');

        outerTips.start();
        vi.advanceTimersByTime(3000);

        expect(determineSpy).toHaveBeenCalled();
        expect(showMessageByTypeSpy).toHaveBeenCalledWith('welcome');

        // Получаем мокнутую анимацию
        const mockAnimation = outerTips.Utils.animateTyping.mock.results[0]?.value;
        mockAnimation.emit(EVENTS.UI.TYPING_FINISH); // эмулируем завершение

        // Проверяем, что welcome отмечен
        expect(localStorage.getItem(STORAGE_KEYS.UI.OUTER_TIP.WELCOME_SHOWN)).toBeTruthy();

        vi.advanceTimersByTime(27000);
        expect(showMessageByTypeSpy).toHaveBeenCalledWith('followup');
    });

    test('не должен повторно показывать welcome, если он уже был показан', () => {
        // Симулируем: welcome уже был показан час назад
        const oneHourAgo = NOW - 3600000;
        localStorage.setItem(
            STORAGE_KEYS.UI.OUTER_TIP.WELCOME_SHOWN,
            JSON.stringify({ type: 'welcome', timestamp: new Date(oneHourAgo).toISOString() })
        );

        outerTips.start();
        vi.advanceTimersByTime(3000);

        const result = outerTips.decisionEngine.determine({
            lastChatOpenTime: null,
            hasSentMessage: false
        });

        expect(result).not.toBe('welcome');
    });
});