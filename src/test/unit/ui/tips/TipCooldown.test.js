import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TipCooldown } from '@js/services/TipCooldown';
import { TipStorage } from '@js/storages/TipStorage';
import { createMessagesProviderMock, mockMessagesWithCooldown } from '@test/mocks/messagesProviderMock';
import { createMockStorage } from '@test/mocks/storageMocks';
import StorageKeysProvider from '@js/providers/StorageKeyProvider';
import { createMockLogger } from '@test/mocks/loggerMock';

describe('TipCooldown', () => {
    let cooldown;
    let messagesProvider;
    let tipStorage;
    let keysProvider;
    let rawStorage;
    let logger;

    beforeEach(() => {
        logger = createMockLogger();
        rawStorage = createMockStorage();
        keysProvider = new StorageKeysProvider();
        messagesProvider = createMessagesProviderMock();

        tipStorage = new TipStorage(keysProvider, rawStorage, logger);
        cooldown = new TipCooldown(messagesProvider, tipStorage, logger);

        vi.useFakeTimers();
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('getCooldownHours', () => {
        it('возвращает значение по умолчанию, если не задано', () => {
            expect(cooldown.getCooldownHours('followup')).toBe(6);
            expect(cooldown.getCooldownHours('welcome')).toBe(24);
        });

        it('возвращает кастомный кулдаун, если задан', () => {
            const provider = mockMessagesWithCooldown('welcome', 12);
            const cd = new TipCooldown(provider, tipStorage, logger);

            expect(cd.getCooldownHours('welcome')).toBe(12);
        });

        it('возвращает 0, если кулдаун установлен в 0', () => {
            const provider = mockMessagesWithCooldown('welcome', 0);
            const cd = new TipCooldown(provider, tipStorage, logger);

            expect(cd.getCooldownHours('welcome')).toBe(0);
        });

        it('возвращает значение по умолчанию, если кулдаун явно не задан', () => {
            const custom = {
                out: {
                    welcome: { text: 'Custom welcome' },
                    // нет cooldownHours → должен взять из DEFAULT_COOLDOWN_HOURS
                },
            };
            const provider = createMessagesProviderMock(custom);
            const cd = new TipCooldown(provider, tipStorage, logger);

            expect(cd.getCooldownHours('welcome')).toBe(24);
        });

        it('работает с категорией "in"', () => {
            const custom = {
                in: {
                    greeting: { cooldownHours: 1 },
                },
            };
            const provider = createMessagesProviderMock(custom);
            const cd = new TipCooldown(provider, tipStorage, logger);

            expect(cd.getCooldownHours('greeting', 'in')).toBe(1);
        });

        it('использует значение по умолчанию для категории "in", если не задано', () => {
            // Нет дефолтов для 'in' в DEFAULT_COOLDOWN_HOURS, но провайдер может вернуть defaultValue
            const provider = createMessagesProviderMock({
                in: { greeting: {} },
            });
            const cd = new TipCooldown(provider, tipStorage, logger);

            // Поскольку DEFAULT_COOLDOWN_HOURS[greeting] === undefined,
            // getField вернёт undefined → и использует defaultValue (undefined), но это редкий случай.
            // Лучше проверить логику с явным типом, который есть в DEFAULT_COOLDOWN_HOURS
            expect(cd.getCooldownHours('followup', 'in')).toBe(6); // followup есть в DEFAULT_COOLDOWN_HOURS
        });
    });

    describe('canShow', () => {
        it('возвращает true, если кулдаун равен 0', () => {
            const custom = { out: { welcome: { cooldownHours: 0 } } };
            const provider = createMessagesProviderMock(custom);
            const cd = new TipCooldown(provider, tipStorage, logger);

            tipStorage.markAsShown('welcome', 'out');
            const result = cd.canShow('welcome');

            expect(result).toBe(true);
        });

        it('возвращает true, если сообщение ещё не показывалось', () => {
            const result = cooldown.canShow('followup');
            expect(result).toBe(true);
        });

        it('возвращает true, если прошло больше времени, чем кулдаун', () => {
            const custom = { out: { followup: { cooldownHours: 6 } } };
            const provider = createMessagesProviderMock(custom);
            const cd = new TipCooldown(provider, tipStorage, logger);

            tipStorage.markAsShown('followup', 'out');
            vi.advanceTimersByTime(7 * 60 * 60 * 1000); // +7 часов

            const result = cd.canShow('followup');
            expect(result).toBe(true);
        });

        it('возвращает false, если прошло меньше времени, чем кулдаун', () => {
            const custom = { out: { followup: { cooldownHours: 6 } } };
            const provider = createMessagesProviderMock(custom);
            const cd = new TipCooldown(provider, tipStorage, logger);

            tipStorage.markAsShown('followup', 'out');
            vi.advanceTimersByTime(3 * 60 * 60 * 1000); // +3 часа

            const result = cd.canShow('followup');
            expect(result).toBe(false);
        });

        it('корректно работает с категорией "in" и временем', () => {
            const custom = { in: { greeting: { cooldownHours: 2 } } };
            const provider = createMessagesProviderMock(custom);
            const cd = new TipCooldown(provider, tipStorage, logger);

            tipStorage.markAsShown('greeting', 'in'); // t=0

            vi.advanceTimersByTime(1 * 60 * 60 * 1000); // +1h → 1h прошло
            expect(cd.canShow('greeting', 'in')).toBe(false); // 1 < 2

            vi.advanceTimersByTime(2 * 60 * 60 * 1000); // ещё +2h → всего 3h
            expect(cd.canShow('greeting', 'in')).toBe(true); // 3 >= 2
        });
    });

    describe('hasSeenRecently', () => {
        it('возвращает false, если сообщение ещё не показывалось', () => {
            const result = cooldown.hasSeenRecently('welcome');
            expect(result).toBe(false);
        });

        it('возвращает true, если сообщение показывали недавно', () => {
            tipStorage.markAsShown('welcome', 'out');
            vi.advanceTimersByTime(12 * 60 * 60 * 1000); // +12 часов

            const result = cooldown.hasSeenRecently('welcome', 'out', 24);
            expect(result).toBe(true);
        });

        it('возвращает false, если сообщение показывали давно', () => {
            tipStorage.markAsShown('welcome', 'out');
            vi.advanceTimersByTime(30 * 60 * 60 * 1000); // +30 часов

            const result = cooldown.hasSeenRecently('welcome', 'out', 24);
            expect(result).toBe(false);
        });

        it('использует значение по умолчанию 24 часа, если hours не передан', () => {
            tipStorage.markAsShown('welcome', 'out');
            vi.advanceTimersByTime(23 * 60 * 60 * 1000); // +23 часа

            const result = cooldown.hasSeenRecently('welcome');
            expect(result).toBe(true); // 23 < 24 → true
        });

        it('работает с категорией "in"', () => {
            tipStorage.markAsShown('greeting', 'in');
            vi.advanceTimersByTime(5 * 60 * 60 * 1000); // +5 часов

            const result = cooldown.hasSeenRecently('greeting', 'in', 10);
            expect(result).toBe(true); // 5 < 10
        });
    });
});