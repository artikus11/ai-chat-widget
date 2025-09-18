import { describe, it, expect, vi } from 'vitest';
import { ActiveReturnRule } from '@js/ui/tips/rules/outer/ActiveReturnRule.js';
import { createEngineMock } from '@test/mocks/engineMock';

// Утилита для создания состояния
const createState = (overrides = {}) => ({
    lastChatOpenTime: null,
    hasSentMessage: false,
    ...overrides,
});

describe('ActiveReturnRule', () => {
    describe('matches', () => {
        it('должен вернуть null, если сообщение active_return не существует', () => {
            const engine = createEngineMock({
                has: (type, category) => type === 'active_return' && category === 'out' ? false : true,
            });

            const state = createState({ hasSentMessage: true });
            const context = 'return';

            const result = ActiveReturnRule.matches(state, engine, context);

            expect(result).toBeNull();
            expect(engine.has).toHaveBeenCalledWith('active_return', 'out');
        });

        it('должен вернуть null, если active_return уже показывали', () => {
            const engine = createEngineMock();

            // Мокаем: сообщение уже показывали
            engine.helpers.storage.wasShown.mockImplementation((type, category) =>
                type === 'active_return' && category === 'out'
            );

            const state = createState({ hasSentMessage: true });
            const context = 'return';

            const result = ActiveReturnRule.matches(state, engine, context);

            expect(result).toBeNull();
            expect(engine.helpers.storage.wasShown).toHaveBeenCalledWith('active_return', 'out');
        });

        it('должен вернуть null, если кулдаун не позволяет показать', () => {
            const engine = createEngineMock({
                helpers: {
                    cooldown: {
                        canShow: vi.fn().mockReturnValue(false),
                    },
                },
            });

            const state = createState({ hasSentMessage: true });
            const context = 'return';

            const result = ActiveReturnRule.matches(state, engine, context);

            expect(result).toBeNull();
            expect(engine.helpers.cooldown.canShow).toHaveBeenCalledWith('active_return', 'out');
        });

        it('должен вернуть null, если пользователь не был активен ранее (hasSentMessage: false)', () => {
            const engine = createEngineMock();
            const state = createState({ hasSentMessage: false }); // не был активен
            const context = 'return';

            const result = ActiveReturnRule.matches(state, engine, context);

            expect(result).toBeNull();
        });

        it('должен вернуть null, если контекст не "return"', () => {
            const engine = createEngineMock();
            const state = createState({ hasSentMessage: true });

            const resultOuter = ActiveReturnRule.matches(state, engine, 'outer');
            const resultInner = ActiveReturnRule.matches(state, engine, 'inner');
            const resultUndefined = ActiveReturnRule.matches(state, engine, undefined);
            const resultEmpty = ActiveReturnRule.matches(state, engine, '');

            expect(resultOuter).toBeNull();
            expect(resultInner).toBeNull();
            expect(resultUndefined).toBeNull();
            expect(resultEmpty).toBeNull();
        });

        it('должен вернуть "active_return", если все условия выполнены', () => {
            const engine = createEngineMock(); // всё по умолчанию: has → true, not shown, cooldown ok
            const state = createState({ hasSentMessage: true });
            const context = 'return';

            const result = ActiveReturnRule.matches(state, engine, context);

            expect(result).toBe('active_return');

            // Проверяем, что зависимости вызваны корректно
            expect(engine.has).toHaveBeenCalledWith('active_return', 'out');
            expect(engine.helpers.storage.wasShown).toHaveBeenCalledWith('active_return', 'out');
            expect(engine.helpers.cooldown.canShow).toHaveBeenCalledWith('active_return', 'out');
        });

        it('должен учитывать context строго: только "return" подходит', () => {
            const engine = createEngineMock();
            const state = createState({ hasSentMessage: true });

            const result = ActiveReturnRule.matches(state, engine, 'return');
            const resultOther = ActiveReturnRule.matches(state, engine, 'returning'); // не точно

            expect(result).toBe('active_return');
            expect(resultOther).toBeNull();
        });

    });
});