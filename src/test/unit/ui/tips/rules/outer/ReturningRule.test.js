import { describe, it, expect, vi } from 'vitest';
import { ReturningRule } from '@js/ui/tips/rules/outer/ReturningRule.js';
import { createEngineMock } from '@test/mocks/engineMock';

// Утилита для создания состояния
const createState = (overrides = {}) => ({
    lastChatOpenTime: null,
    hasSentMessage: false,
    isRecentlyReturned: false,
    ...overrides,
});

describe('ReturningRule', () => {
    describe('matches', () => {
        it('должен вернуть null, если сообщение returning не существует', () => {
            const engine = createEngineMock({
                has: (type, category) => type === 'returning' && category === 'out' ? false : true,
            });

            const state = createState({ lastChatOpenTime: 123, isRecentlyReturned: true });

            const result = ReturningRule.matches(state, engine);

            expect(result).toBeNull();
            expect(engine.has).toHaveBeenCalledWith('returning', 'out');
        });

        it('должен вернуть null, если returning уже показывали', () => {
            const engine = createEngineMock({
                helpers: {
                    storage: {
                        wasShown: vi.fn().mockImplementation((type, category) =>
                            type === 'returning' && category === 'out'
                        ),
                    },
                },
            });

            const state = createState({ lastChatOpenTime: 123, isRecentlyReturned: true });

            const result = ReturningRule.matches(state, engine);

            expect(result).toBeNull();
            expect(engine.helpers.storage.wasShown).toHaveBeenCalledWith('returning', 'out');
        });

        it('должен вернуть null, если кулдаун не позволяет показать', () => {
            const engine = createEngineMock({
                helpers: {
                    cooldown: {
                        canShow: vi.fn().mockReturnValue(false),
                    },
                },
            });

            const state = createState({ lastChatOpenTime: 123, isRecentlyReturned: true });

            const result = ReturningRule.matches(state, engine);

            expect(result).toBeNull();
            expect(engine.helpers.cooldown.canShow).toHaveBeenCalledWith('returning', 'out');
        });

        it('должен вернуть null, если пользователь никогда не открывал чат', () => {
            const engine = createEngineMock();
            const state = createState({ lastChatOpenTime: null, isRecentlyReturned: true });

            const result = ReturningRule.matches(state, engine);

            expect(result).toBeNull();
        });

        it('должен вернуть null, если пользователь уже отправлял сообщение', () => {
            const engine = createEngineMock();
            const state = createState({
                lastChatOpenTime: 123,
                hasSentMessage: true,
                isRecentlyReturned: true,
            });

            const result = ReturningRule.matches(state, engine);

            expect(result).toBeNull();
        });

        it('должен вернуть null, если пользователь не вернулся недавно (isRecentlyReturned: false)', () => {
            const engine = createEngineMock();
            const state = createState({
                lastChatOpenTime: 123,
                hasSentMessage: false,
                isRecentlyReturned: false,
            });

            const result = ReturningRule.matches(state, engine);

            expect(result).toBeNull();
        });

        it('должен вернуть null, если welcome ещё не показывали', () => {
            const engine = createEngineMock();

            // Явно создаём spy
            const wasShownSpy = vi.fn().mockReturnValue(false);
            engine.helpers.storage.wasShown = wasShownSpy;

            const state = createState({
                lastChatOpenTime: 123,
                hasSentMessage: false,
                isRecentlyReturned: true,
            });

            const result = ReturningRule.matches(state, engine);

            expect(result).toBeNull();
            expect(wasShownSpy).toHaveBeenCalledWith('welcome', 'out'); // теперь spy запомнит вызов
        });

        it('должен вернуть null, если followup существует, но ещё не показан', () => {
            const engine = createEngineMock();

            const wasShownSpy = vi.fn().mockImplementation((type, category) => {
                if (type === 'welcome' && category === 'out') return true;
                if (type === 'followup' && category === 'out') return false;
                return false;
            });
            engine.helpers.storage.wasShown = wasShownSpy;

            const state = createState({
                lastChatOpenTime: 123,
                hasSentMessage: false,
                isRecentlyReturned: true,
            });

            const result = ReturningRule.matches(state, engine);

            expect(result).toBeNull();
            expect(wasShownSpy).toHaveBeenCalledWith('followup', 'out');
        });

        it('должен вернуть "returning", если все условия выполнены', () => {
            const engine = createEngineMock();

            const wasShownSpy = vi.fn().mockImplementation((type, category) => {
                if (type === 'welcome' && category === 'out') return true;
                return false;
            });
            engine.helpers.storage.wasShown = wasShownSpy;

            // followup НЕ существует
            engine.has = vi.fn().mockImplementation((type, category) => {
                if (type === 'returning' && category === 'out') return true;
                if (type === 'followup' && category === 'out') return false;
                return false;
            });

            const state = createState({
                lastChatOpenTime: Date.now() - 60_000,
                hasSentMessage: false,
                isRecentlyReturned: true,
            });

            const result = ReturningRule.matches(state, engine);

            expect(result).toBe('returning');

            // Проверяем, что has был вызван для followup (чтобы проверить наличие)
            expect(engine.has).toHaveBeenCalledWith('followup', 'out');

            // Проверяем, что welcome был показан
            expect(wasShownSpy).toHaveBeenCalledWith('welcome', 'out');

            // Кулдаун только для returning
            expect(engine.helpers.cooldown.canShow).toHaveBeenCalledWith('returning', 'out');

            // Дополнительно: убедимся, что wasShown НЕ вызывался для followup
            expect(wasShownSpy).not.toHaveBeenCalledWith('followup', 'out');
        });

        it('должен вернуть "returning", если followup существует, но уже был показан', () => {
            const engine = createEngineMock();

            const wasShownSpy = vi.fn().mockImplementation((type, category) => {
                if (type === 'welcome' && category === 'out') return true;
                if (type === 'followup' && category === 'out') return true; // уже показан
                return false;
            });
            engine.helpers.storage.wasShown = wasShownSpy;

            // followup СУЩЕСТВУЕТ
            engine.has = vi.fn().mockImplementation((type, category) => {
                if (['returning', 'followup'].includes(type) && category === 'out') return true;
                return false;
            });

            const state = createState({
                lastChatOpenTime: Date.now() - 60_000,
                hasSentMessage: false,
                isRecentlyReturned: true,
            });

            const result = ReturningRule.matches(state, engine);

            expect(result).toBe('returning');
            expect(engine.has).toHaveBeenCalledWith('followup', 'out');
            expect(wasShownSpy).toHaveBeenCalledWith('followup', 'out'); // теперь будет вызван
            expect(engine.helpers.cooldown.canShow).toHaveBeenCalledWith('returning', 'out');
        });

        it('должен игнорировать context (если правило его не использует)', () => {
            const engine = createEngineMock();

            const wasShownSpy = vi.fn().mockImplementation((type) => type === 'welcome');
            engine.helpers.storage.wasShown = wasShownSpy;

            engine.has = vi.fn((t) => t === 'returning' || t === 'welcome');

            const state = createState({
                lastChatOpenTime: 123,
                hasSentMessage: false,
                isRecentlyReturned: true,
            });

            const resultOuter = ReturningRule.matches(state, engine, 'outer');
            const resultInner = ReturningRule.matches(state, engine, 'inner');

            expect(resultOuter).toBe('returning');
            expect(resultInner).toBe('returning');
        });
    });
});