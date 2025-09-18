import { describe, it, expect, vi } from 'vitest';
import { ReconnectRule } from '@js/ui/tips/rules/outer/ReconnectRule.js';
import { createEngineMock } from '@test/mocks/engineMock';

// Утилита для создания состояния
const createState = (overrides = {}) => ({
    lastChatOpenTime: null,
    hasSentMessage: false,
    isEligibleForReconnect: false,
    ...overrides,
});

describe('ReconnectRule', () => {
    describe('matches', () => {
        it('должен вернуть null, если сообщение reconnect не существует', () => {
            const engine = createEngineMock({
                has: (type, category) => type === 'reconnect' && category === 'out' ? false : true,
            });

            const state = createState({ isEligibleForReconnect: true });

            const result = ReconnectRule.matches(state, engine);

            expect(result).toBeNull();
            expect(engine.has).toHaveBeenCalledWith('reconnect', 'out');
        });

        it('должен вернуть null, если reconnect уже показывали', () => {
            const engine = createEngineMock();

            // Мокаем: reconnect — уже показывали
            engine.helpers.storage.wasShown.mockImplementation((type, category) =>
                type === 'reconnect' && category === 'out'
            );

            const state = createState({ isEligibleForReconnect: true });

            const result = ReconnectRule.matches(state, engine);

            expect(result).toBeNull();
            expect(engine.helpers.storage.wasShown).toHaveBeenCalledWith('reconnect', 'out');
        });

        it('должен вернуть null, если кулдаун не позволяет показать', () => {
            const engine = createEngineMock({
                helpers: {
                    cooldown: {
                        canShow: vi.fn().mockReturnValue(false),
                    },
                },
            });

            const state = createState({ isEligibleForReconnect: true });

            const result = ReconnectRule.matches(state, engine);

            expect(result).toBeNull();
            expect(engine.helpers.cooldown.canShow).toHaveBeenCalledWith('reconnect', 'out');
        });

        it('должен вернуть null, если пользователь не подходит по условиям (isEligibleForReconnect: false)', () => {
            const engine = createEngineMock();
            const state = createState({ isEligibleForReconnect: false });

            const result = ReconnectRule.matches(state, engine);

            expect(result).toBeNull();
        });

        it('должен вернуть "reconnect", если все условия выполнены', () => {
            const engine = createEngineMock(); // всё по умолчанию: has → true, not shown, cooldown ok

            const state = createState({ isEligibleForReconnect: true });

            const result = ReconnectRule.matches(state, engine);

            expect(result).toBe('reconnect');

            // Проверяем, что зависимости вызваны корректно
            expect(engine.has).toHaveBeenCalledWith('reconnect', 'out');
            expect(engine.helpers.storage.wasShown).toHaveBeenCalledWith('reconnect', 'out');
            expect(engine.helpers.cooldown.canShow).toHaveBeenCalledWith('reconnect', 'out');
        });

        it('должен игнорировать context (если правило его не использует)', () => {
            const engine = createEngineMock();
            const state = createState({ isEligibleForReconnect: true });

            const resultOuter = ReconnectRule.matches(state, engine, 'outer');
            const resultInner = ReconnectRule.matches(state, engine, 'inner');

            expect(resultOuter).toBe('reconnect');
            expect(resultInner).toBe('reconnect');
        });
    });
});