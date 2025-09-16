import { describe, test, expect, vi } from 'vitest';
import { OuterTips } from '@js/ui/features/OuterTips';
import { OuterTipsDecisionEngine } from '@js/ui/components/OuterTipsDecisionEngine';
import { STORAGE_KEYS } from '@js/config';

const NOW = 1700000000000;

describe('E2E: Welcome Flow — первый визит → welcome → followup', () => {
    let outerTips;
    let messagesProvider;
    let eventEmitter;
    let tipElement;
    let toggleButton;

    beforeEach(() => {
        // Устанавливаем фейковое время
        vi.useFakeTimers().setSystemTime(NOW);

        // Очищаем DOM
        document.body.innerHTML = '';

        // Создаём элементы интерфейса
        toggleButton = document.createElement('button');
        toggleButton.classList.add('chat-toggle');
        tipElement = document.createElement('div');
        tipElement.classList.add('outer-tip');

        document.body.append(toggleButton, tipElement);

        // Мокаем зависимости
        messagesProvider = {
            has: vi.fn((namespace, type) => {
                return namespace === 'out' && ['welcome', 'followup'].includes(type);
            }),
            getField: vi.fn((namespace, type, field, defaultValue) => {
                if (type === 'welcome' && field === 'delay') return 3000;
                if (type === 'followup' && field === 'delay') return 30000;
                return defaultValue;
            }),
            getText: vi.fn((namespace, type) => {
                return {
                    welcome: 'Готов помочь! Нажмите, чтобы начать чат',
                    followup: 'Остались вопросы? Спрашивайте — подскажу!',
                }[type] || '';
            })
        };

        eventEmitter = {
            on: vi.fn(),
            emit: vi.fn()
        };

        // Создаём экземпляр
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
        sessionStorage.clear();
    });

    test('должен показать welcome через 3 сек, затем followup через 30 сек', () => {
        // Запускаем логику
        outerTips.start();

        // Проверяем: прошло 0 мс — ничего не показано
        expect(tipElement.textContent).toBe('');
        expect(tipElement.classList.contains('show')).toBe(false);

        // Пропускаем 3 секунды — должен появиться welcome
        vi.advanceTimersByTime(3000);

        expect(tipElement.classList.contains('show')).toBe(true);
        expect(tipElement.textContent).toContain('Готов помочь!');
        expect(messagesProvider.getText).toHaveBeenCalledWith('out', 'welcome');

        // Пропускаем ещё 27 секунд (всего 30)
        vi.advanceTimersByTime(27000);

        // welcome исчезает, followup появляется
        expect(tipElement.textContent).toContain('Остались вопросы?');
        expect(messagesProvider.getText).toHaveBeenCalledWith('out', 'followup');
    });

    test('не должен показывать welcome, если чат уже открывали', () => {
        // Имитируем: чат уже открывали
        localStorage.setItem(
            STORAGE_KEYS.UI.OUTER_TIP.LAST_CHAT_OPEN,
            (NOW - 5000).toString()
        );

        outerTips.start();
        vi.advanceTimersByTime(3000);

        // welcome не должен показаться
        expect(tipElement.textContent).toBe('');
        expect(tipElement.classList.contains('show')).toBe(false);
    });
});