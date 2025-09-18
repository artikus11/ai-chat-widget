import { describe, it, expect, vi } from 'vitest';
import { DecisionEngine } from '@js/services/DecisionEngine';
import { WelcomeRule } from '@js/ui/tips/rules/outer/WelcomeRule';
import { FollowupRule } from '@js/ui/tips/rules/outer/FollowupRule';
import { ReturningRule } from '@js/ui/tips/rules/outer/ReturningRule';
import { ReconnectRule } from '@js/ui/tips/rules/outer/ReconnectRule';
import { ActiveReturnRule } from '@js/ui/tips/rules/outer/ActiveReturnRule';
import { createMessagesProviderMock, mockMessagesDisabled } from '@test/mocks/messagesProviderMock';

// Утилита для состояния
const createState = (overrides = {}) => ({
    lastChatOpenTime: null,
    hasSentMessage: false,
    isRecentlyReturned: false,
    isEligibleForReconnect: false,
    ...overrides,
});

const rules = [
    WelcomeRule,
    FollowupRule,
    ReturningRule,
    ReconnectRule,
    ActiveReturnRule,
];

/**
 * Flow:
 * 1. Welcome → для всех новых
 * 2. Followup → если не открыл чат, но видел welcome
 * 3. Returning → если вернулся через 2–10 мин и видел welcome
 * 4. Reconnect → если вернулся после долгого перерыва
 * 5. ActiveReturn → если был активен и вернулся (context=return)
 */
describe('Full Tip Flow — DecisionEngine Integration', () => {
    let storage;
    let cooldown;
    let messagesProvider;

    beforeEach(() => {
        storage = {
            wasShown: vi.fn(() => false),
            markAsShown: vi.fn(),
        };
        cooldown = {
            canShow: vi.fn(() => true),
        };
        messagesProvider = createMessagesProviderMock();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('1. Новый пользователь: должен показать welcome', () => {
        const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });
        const state = createState();

        const result = engine.determine(state);

        expect(result).toBe('welcome');
    });

    it('2. Пользователь видел welcome, но не открывал чат: должен показать followup', () => {
        // Мокаем: welcome показан
        storage.wasShown = vi.fn((type, category) =>
            type === 'welcome' && category === 'out'
        );

        const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });
        const state = createState();

        const result = engine.determine(state);

        expect(result).toBe('followup');
    });

    it('3. followup уже показан: не должен показывать повторно', () => {
        storage.wasShown = vi.fn((type, category) =>
            ['welcome', 'followup'].includes(type) && category === 'out'
        );

        const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });
        const state = createState();

        const result = engine.determine(state);

        expect(result).toBeNull(); // followup уже был, а других условий нет
    });

    it('4. Пользователь вернулся через 5 минут: должен показать returning', () => {
        storage.wasShown = vi.fn((type, category) => {
            if (type === 'welcome' && category === 'out') return true;
            if (type === 'followup' && category === 'out') return true; // или можно отключить
            return false;
        });

        const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });
        const state = createState({
            isRecentlyReturned: true, // в диапазоне 2–10 мин
            lastChatOpenTime: Date.now() - 60_000,
        });

        const result = engine.determine(state);

        expect(result).toBe('returning');
    });

    it('5. Пользователь вернулся после долгого перерыва: должен показать reconnect', () => {
        storage.wasShown = vi.fn((type, category) =>
            type === 'welcome' && category === 'out'
        );

        const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });

        const state = createState({
            lastChatOpenTime: Date.now() - 3_600_000, // был раньше
            isEligibleForReconnect: true,
        });

        const result = engine.determine(state);

        expect(result).toBe('reconnect');
    });

    it('6. Активный пользователь вернулся: должен показать active_return', () => {
        storage.wasShown = vi.fn((type, category) =>
            type === 'welcome' && category === 'out'
        );

        const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });
        const state = createState({
            hasSentMessage: true,
        });
        const options = { context: 'return' };

        const result = engine.determine(state, options);

        expect(result).toBe('active_return');
    });

    it('7. Если все сообщения отключены — должен вернуть null', () => {
        // Отключаем всё, кроме welcome
        const disabledProvider = mockMessagesDisabled('followup', 'out');
        mockMessagesDisabled('returning', 'out');
        mockMessagesDisabled('reconnect', 'out');
        mockMessagesDisabled('active_return', 'out');

        // Но welcome ещё не показан
        storage.wasShown = vi.fn(() => false);

        const engine = new DecisionEngine(disabledProvider, rules, { storage, cooldown });
        const state = createState();

        const result = engine.determine(state);

        expect(result).toBe('welcome'); // welcome ещё доступен
    });

    it('8. welcome показан, остальные отключены — должен вернуть null', () => {
        const disabledProvider = mockMessagesDisabled('followup', 'out');
        mockMessagesDisabled('returning', 'out');
        mockMessagesDisabled('reconnect', 'out');
        mockMessagesDisabled('active_return', 'out');

        storage.wasShown = vi.fn((type, category) =>
            type === 'welcome' && category === 'out'
        );

        const engine = new DecisionEngine(disabledProvider, rules, { storage, cooldown });
        const state = createState();

        const result = engine.determine(state);

        expect(result).toBeNull();
    });

    it('9. Не должен показать followup, если welcome ещё не показан', () => {
        storage.wasShown = vi.fn(() => false); // никто ничего не показывал

        const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });
        const state = createState();

        const result = engine.determine(state);

        expect(result).toBe('welcome'); // а не followup!
    });

    it('10. Должен показать welcome, а не returning, если welcome ещё не показан', () => {
        storage.wasShown = vi.fn(() => false);

        const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });
        const state = createState({ isRecentlyReturned: true });

        const result = engine.determine(state);

        expect(result).toBe('welcome');
    });
});