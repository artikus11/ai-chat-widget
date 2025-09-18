import { describe, it, expect, vi } from 'vitest';
import { DecisionEngine } from '@js/services/DecisionEngine';
import { WelcomeRule } from '@js/ui/tips/rules/outer/WelcomeRule';
import { ActiveReturnRule } from '@js/ui/tips/rules/outer/ActiveReturnRule';
import { createEngineMock } from '@test/mocks/engineMock';
import { createMessagesProviderMock, mockMessagesDisabled } from '@test/mocks/messagesProviderMock';

// Утилита для создания состояния
const createState = (overrides = {}) => ({
    lastChatOpenTime: null,
    hasSentMessage: false,
    ...overrides,
});


describe('DecisionEngine + Rules Integration', () => {
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

    describe('приоритет: welcome > active_return', () => {
        it('должен выбрать welcome, если пользователь новый (не писал, не открывал)', () => {
            const messagesProvider = createMessagesProviderMock();
            const rules = [WelcomeRule, ActiveReturnRule];
            const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });

            const state = createState({
                hasSentMessage: false,
                lastChatOpenTime: null,
            });
            const options = { context: 'return' }; // хоть и return, но он новый

            const result = engine.determine(state, options);

            expect(result).toBe('welcome');
        });

        it('должен выбрать active_return, если пользователь был активен и вернулся', () => {
            const messagesProvider = createMessagesProviderMock();
            const rules = [WelcomeRule, ActiveReturnRule];
            const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });

            const state = createState({ hasSentMessage: true });
            const options = { context: 'return' };

            const result = engine.determine(state, options);

            expect(result).toBe('active_return');
        });

        it('должен вернуть null, если welcome уже показан, но active_return отключён', () => {
            const messagesProvider = mockMessagesDisabled('active_return', 'out');
            storage.wasShown = vi.fn((type, category) =>
                type === 'welcome' && category === 'out'
            );

            const rules = [WelcomeRule, ActiveReturnRule];
            const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });

            const state = createState({ hasSentMessage: true });
            const options = { context: 'return' };

            const result = engine.determine(state, options);

            expect(result).toBeNull();
        });
    });

    describe('context влияет на выбор', () => {
        it('должен игнорировать active_return, если context не "return"', () => {
            const messagesProvider = createMessagesProviderMock();
            storage.wasShown = vi.fn((type, category) =>
                type === 'welcome' && category === 'out'
            );

            const rules = [WelcomeRule, ActiveReturnRule];
            const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });

            const state = createState({ hasSentMessage: true });

            expect(engine.determine(state, { context: 'outer' })).toBeNull();
            expect(engine.determine(state, { context: 'inner' })).toBeNull();
        });
    });
});