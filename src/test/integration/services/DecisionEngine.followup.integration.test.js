import { describe, it, expect, vi } from 'vitest';
import { DecisionEngine } from '@js/services/DecisionEngine';
import { WelcomeRule } from '@js/ui/tips/rules/outer/WelcomeRule';
import { FollowupRule } from '@js/ui/tips/rules/outer/FollowupRule';
import { createMessagesProviderMock } from '@test/mocks/messagesProviderMock';

// Утилита для состояния
const createState = (overrides = {}) => ({
    lastChatOpenTime: null,
    hasSentMessage: false,
    ...overrides,
});

describe('DecisionEngine + Welcome → Followup Integration', () => {
    let storage;
    let cooldown;

    beforeEach(() => {
        storage = {
            wasShown: vi.fn(() => false),
        };
        cooldown = {
            canShow: vi.fn(() => true),
        };
    });

    describe('последовательность: welcome → followup', () => {
        it('должен выбрать welcome, если пользователь новый', () => {
            const messagesProvider = createMessagesProviderMock();
            const rules = [WelcomeRule, FollowupRule];
            const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });

            const state = createState({
                lastChatOpenTime: null,
                hasSentMessage: false,
            });

            const result = engine.determine(state);

            expect(result).toBe('welcome');
        });

        it('должен выбрать followup, если welcome уже показан, но followup ещё нет', () => {
            const messagesProvider = createMessagesProviderMock();

            // Мокаем: welcome показывали, followup — нет
            storage.wasShown = vi.fn((type, category) =>
                type === 'welcome' && category === 'out'
            );

            const rules = [WelcomeRule, FollowupRule];
            const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });

            const state = createState({
                lastChatOpenTime: null,
                hasSentMessage: false,
            });

            const result = engine.determine(state);

            expect(result).toBe('followup');

            // Проверяем, что followup проверил наличие welcome
            expect(storage.wasShown).toHaveBeenCalledWith('welcome', 'out');
            expect(storage.wasShown).toHaveBeenCalledWith('followup', 'out');
        });

        it('должен вернуть null, если followup уже показывали', () => {
            const messagesProvider = createMessagesProviderMock();

            storage.wasShown = vi.fn((type, category) =>
                ['welcome', 'followup'].includes(type) && category === 'out'
            );

            const rules = [WelcomeRule, FollowupRule];
            const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });

            const state = createState({
                lastChatOpenTime: null,
                hasSentMessage: false,
            });

            const result = engine.determine(state);

            expect(result).toBeNull();
        });

        it('должен вернуть null, если followup существует, но кулдаун не прошёл', () => {
            const messagesProvider = createMessagesProviderMock();

            storage.wasShown = vi.fn((type, category) =>
                type === 'welcome' && category === 'out'
            );

            cooldown.canShow = vi.fn((type, category) =>
                !(type === 'followup' && category === 'out')
            );

            const rules = [WelcomeRule, FollowupRule];
            const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });

            const state = createState({
                lastChatOpenTime: null,
                hasSentMessage: false,
            });

            const result = engine.determine(state);

            expect(result).toBeNull();
            expect(cooldown.canShow).toHaveBeenCalledWith('followup', 'out');
        });

        it('должен игнорировать followup, если welcome ещё не показывали', () => {
            const messagesProvider = createMessagesProviderMock();

            // Никто ничего не показывал
            storage.wasShown = vi.fn(() => false);

            const rules = [WelcomeRule, FollowupRule];
            const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });

            const state = createState({
                lastChatOpenTime: null,
                hasSentMessage: false,
            });

            const result = engine.determine(state);

            expect(result).toBe('welcome'); // а не followup!
        });
    });
});