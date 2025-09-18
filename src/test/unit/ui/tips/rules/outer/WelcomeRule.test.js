import { describe, it, expect, vi } from 'vitest';
import { WelcomeRule } from '@js/ui/tips/rules/outer/WelcomeRule.js';
import { createEngineMock } from '@test/mocks/engineMock.js';

const createState = (overrides = {}) => ({
    lastChatOpenTime: null,
    hasSentMessage: false,
    ...overrides,
});

describe('WelcomeRule', () => {
    describe('matches', () => {
        it('должен вернуть null, если сообщение welcome не существует', () => {
            // Переопределяем has: теперь welcome отсутствует
            const engine = createEngineMock({
                has: (type, category) => type === 'welcome' && category === 'out' ? false : true,
            });

            const state = createState();

            const result = WelcomeRule.matches(state, engine);

            expect(result).toBeNull();
            expect(engine.has).toHaveBeenCalledWith('welcome', 'out');
        });

        it('должен вернуть null, если сообщение уже показывали', () => {
            const engine = createEngineMock({
                helpers: {
                    storage: {
                        wasShown: vi.fn().mockReturnValue(true),
                    },
                },
            });

            const state = createState();

            const result = WelcomeRule.matches(state, engine);

            expect(result).toBeNull();
            expect(engine.helpers.storage.wasShown).toHaveBeenCalledWith('welcome', 'out');
        });

        it('должен вернуть null, если кулдаун не позволяет показать', () => {
            const engine = createEngineMock({
                helpers: {
                    cooldown: {
                        canShow: vi.fn().mockReturnValue(false),
                    },
                },
            });

            const state = createState();

            const result = WelcomeRule.matches(state, engine);

            expect(result).toBeNull();
            expect(engine.helpers.cooldown.canShow).toHaveBeenCalledWith('welcome', 'out');
        });

        it('должен вернуть null, если пользователь уже открывал чат', () => {
            const engine = createEngineMock();
            const state = createState({ lastChatOpenTime: Date.now() - 1000 });

            const result = WelcomeRule.matches(state, engine);

            expect(result).toBeNull();
        });

        it('должен вернуть null, если пользователь уже отправлял сообщение', () => {
            const engine = createEngineMock();
            const state = createState({ hasSentMessage: true });

            const result = WelcomeRule.matches(state, engine);

            expect(result).toBeNull();
        });

        it('должен вернуть "welcome", если все условия выполнены', () => {
            const engine = createEngineMock(); // всё по умолчанию: has → true, not shown, cooldown ok
            const state = createState(); // lastChatOpenTime: null, hasSentMessage: false

            const result = WelcomeRule.matches(state, engine);

            expect(result).toBe('welcome');

            // Проверяем, что зависимости были вызваны корректно
            expect(engine.has).toHaveBeenCalledWith('welcome', 'out');
            expect(engine.helpers.storage.wasShown).toHaveBeenCalledWith('welcome', 'out');
            expect(engine.helpers.cooldown.canShow).toHaveBeenCalledWith('welcome', 'out');
        });

        it('должен игнорировать context (если правило его не использует)', () => {
            const engine = createEngineMock();
            const state = createState();

            const resultOuter = WelcomeRule.matches(state, engine, 'outer');
            const resultInner = WelcomeRule.matches(state, engine, 'inner');

            expect(resultOuter).toBe('welcome');
            expect(resultInner).toBe('welcome');
        });
    });
});