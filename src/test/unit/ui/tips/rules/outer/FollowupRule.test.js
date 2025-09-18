import { describe, it, expect, vi } from 'vitest';
import { FollowupRule } from '@js/ui/tips/rules/outer/FollowupRule.js';
import { createEngineMock } from '@test/mocks/engineMock';

// Утилита для создания состояния пользователя
const createState = (overrides = {}) => ({
    lastChatOpenTime: null,
    hasSentMessage: false,
    ...overrides,
});

describe('FollowupRule', () => {
    describe('matches', () => {
        it('должен вернуть null, если сообщение followup не существует', () => {
            const engine = createEngineMock({
                has: (type, category) => type === 'followup' && category === 'out' ? false : true,
            });

            const state = createState();

            const result = FollowupRule.matches(state, engine);

            expect(result).toBeNull();
            expect(engine.has).toHaveBeenCalledWith('followup', 'out');
        });

        it('должен вернуть null, если followup уже показывали', () => {
            const engine = createEngineMock({
                helpers: {
                    storage: {
                        wasShown: vi.fn().mockImplementation((type, category) =>
                            type === 'followup' && category === 'out'
                        ),
                    },
                },
            });

            const state = createState();

            const result = FollowupRule.matches(state, engine);

            expect(result).toBeNull();
            expect(engine.helpers.storage.wasShown).toHaveBeenCalledWith('followup', 'out');
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

            const result = FollowupRule.matches(state, engine);

            expect(result).toBeNull();
            expect(engine.helpers.cooldown.canShow).toHaveBeenCalledWith('followup', 'out');
        });

        it('должен вернуть null, если welcome ещё не показывали', () => {
            const engine = createEngineMock({
                // По умолчанию wasShown → false везде
                // значит, welcome не показывали
            });

            const state = createState();

            const result = FollowupRule.matches(state, engine);

            expect(result).toBeNull();
            expect(engine.helpers.storage.wasShown).toHaveBeenCalledWith('welcome', 'out');
        });

        it('должен вернуть "followup", если welcome был показан, а followup — нет', () => {
            const engine = createEngineMock({
                helpers: {
                    storage: {
                        wasShown: vi.fn().mockImplementation((type, category) => {
                            return type === 'welcome' && category === 'out'; // только welcome показывали
                        }),
                    },
                },
            });

            const state = createState();

            const result = FollowupRule.matches(state, engine);

            expect(result).toBe('followup');

            // Проверяем все вызовы
            expect(engine.has).toHaveBeenCalledWith('followup', 'out');
            expect(engine.helpers.storage.wasShown).toHaveBeenCalledWith('followup', 'out'); // проверка followup
            expect(engine.helpers.storage.wasShown).toHaveBeenCalledWith('welcome', 'out'); // обязательное условие
            expect(engine.helpers.cooldown.canShow).toHaveBeenCalledWith('followup', 'out');
        });

        it('должен вернуть null, если пользователь уже открывал чат', () => {
            const engine = createEngineMock({
                helpers: {
                    storage: {
                        wasShown: vi.fn().mockImplementation((type) => type === 'welcome'),
                    },
                },
            });

            const state = createState({ lastChatOpenTime: Date.now() - 5000 });

            const result = FollowupRule.matches(state, engine);

            expect(result).toBeNull();
        });

        it('должен вернуть null, если пользователь уже отправил сообщение', () => {
            const engine = createEngineMock({
                helpers: {
                    storage: {
                        wasShown: vi.fn().mockImplementation((type) => type === 'welcome'),
                    },
                },
            });

            const state = createState({ hasSentMessage: true });

            const result = FollowupRule.matches(state, engine);

            expect(result).toBeNull();
        });

        it('должен игнорировать context (если правило его не использует)', () => {
            const engine = createEngineMock({
                helpers: {
                    storage: {
                        wasShown: vi.fn().mockImplementation((type) => type === 'welcome'),
                    },
                },
            });

            const state = createState();

            const resultOuter = FollowupRule.matches(state, engine, 'outer');
            const resultInner = FollowupRule.matches(state, engine, 'inner');

            expect(resultOuter).toBe('followup');
            expect(resultInner).toBe('followup');
        });
    });
});