import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DecisionEngine } from '@js/services/DecisionEngine';
import {
    createMessagesProviderMock,
    mockMessagesWithCooldown,
    mockMessagesDisabled,
} from '@test/mocks/messagesProviderMock';

// --- МОКИ ПРАВИЛ ---
// Простые моки правил для тестирования поведения DecisionEngine

const mockRule = (result, condition = () => true) => ({
    matches: (state, engine, context) => {
        return condition(state, context) ? result : false;
    },
});


const alwaysMatchRule = (result) => mockRule(result, () => true);
const neverMatchRule = () => mockRule(false, () => false);

const matchIfHasSentMessage = (result) =>
    mockRule(result, (state) => state.hasSentMessage);


const matchIfContextIsOuter = (result) =>
    mockRule(result, (state, context) => context === 'outer');

// --- НАЧАЛО ТЕСТОВ ---

describe('DecisionEngine', () => {
    let messagesProvider;
    let storage;
    let cooldown;

    beforeEach(() => {
        messagesProvider = createMessagesProviderMock();
        storage = { get: vi.fn(), set: vi.fn() };
        cooldown = { check: vi.fn(() => true), set: vi.fn() };
    });

    describe('constructor', () => {
        it('должен корректно инициализировать зависимости', () => {
            const rules = [alwaysMatchRule('welcome')];
            const helpers = { storage, cooldown };

            const engine = new DecisionEngine(messagesProvider, rules, helpers);

            expect(engine.messagesProvider).toBe(messagesProvider);
            expect(engine.rules).toBe(rules);
            expect(engine.helpers).toBe(helpers);
        });
    });

    describe('determine', () => {
        it('должен вернуть тип сообщения первого сработавшего правила', () => {
            const rules = [
                neverMatchRule(),
                alwaysMatchRule('welcome'),
                alwaysMatchRule('followup'), // не должен сработать — первый уже вернул
            ];
            const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });

            const state = { lastChatOpenTime: null, hasSentMessage: false };
            const result = engine.determine(state);

            expect(result).toBe('welcome');
        });

        it('должен вернуть null, если ни одно правило не подошло', () => {
            const rules = [neverMatchRule(), neverMatchRule()];
            const engine = new DecisionEngine(messagesProvider, rules, { storage, cooldown });

            const state = { lastChatOpenTime: null, hasSentMessage: false };
            const result = engine.determine(state);

            expect(result).toBeNull();
        });

        it('должен передавать контекст в правило', () => {
            const rule = matchIfContextIsOuter('welcome');
            const engine = new DecisionEngine(messagesProvider, [rule], { storage, cooldown });

            const state = { lastChatOpenTime: null, hasSentMessage: false };

            expect(engine.determine(state, { context: 'outer' })).toBe('welcome');
            expect(engine.determine(state, { context: 'inner' })).toBeNull();
        });

        it('должен учитывать состояние пользователя при принятии решений', () => {
            const rule = matchIfHasSentMessage('returning');
            const engine = new DecisionEngine(messagesProvider, [rule], { storage, cooldown });

            const stateWithoutMessage = { lastChatOpenTime: 123, hasSentMessage: false };
            const stateWithMessage = { ...stateWithoutMessage, hasSentMessage: true };

            expect(engine.determine(stateWithoutMessage)).toBeNull();
            expect(engine.determine(stateWithMessage)).toBe('returning');
        });
    });

    describe('интеграция: determine + has', () => {
        it('правило может использовать engine.has внутри себя', () => {
            const rule = {
                matches: (state, engine) => {
                    return engine.has('reconnect') ? 'reconnect' : false;
                },
            };

            const engine = new DecisionEngine(messagesProvider, [rule], { storage, cooldown });
            const state = { lastChatOpenTime: null, hasSentMessage: false };

            expect(engine.determine(state)).toBe('reconnect');
        });

        it('правило может проверять наличие сообщения в конкретной категории', () => {
            const rule = {
                matches: (state, engine) => {
                    return engine.has('greeting', 'in') ? 'greeting' : false;
                },
            };

            const engine = new DecisionEngine(messagesProvider, [rule], { storage, cooldown });
            expect(engine.determine({ hasSentMessage: false, lastChatOpenTime: null })).toBe(
                'greeting'
            );
        });

        it('если сообщение отключено, has вернёт false, и правило не должно выбирать его', () => {
            const rule = {
                matches: (state, engine) => {
                    return engine.has('welcome') ? 'welcome' : false;
                },
            };

            const disabledProvider = mockMessagesDisabled('welcome');
            const engine = new DecisionEngine(disabledProvider, [rule], { storage, cooldown });

            expect(engine.determine({ hasSentMessage: false, lastChatOpenTime: null })).toBeNull();
        });
    });
});