import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TipStorage } from '@js/storages/TipStorage';
import StorageKeysProvider from '@js/providers/StorageKeysProvider';
import { createMockStorage } from '@test/mocks/storageMocks';

describe('TipStorage', () => {
    let storage, keysProvider, logger, tipStorage;

    beforeEach(() => {
        storage = createMockStorage();
        keysProvider = new StorageKeysProvider();
        logger = { warn: vi.fn(), log: vi.fn(), error: vi.fn() };
        tipStorage = new TipStorage(keysProvider, storage, logger);
        // Reset all logger mocks before each test to avoid cross-test pollution
        logger.warn.mockClear();
        logger.log.mockClear();
        logger.error.mockClear();
    });

    it('markAsShown и wasShown работают для известного типа подсказки', () => {
        expect(tipStorage.wasShown('welcome', 'out')).toBe(false);
        const result = tipStorage.markAsShown('welcome', 'out');
        expect(result).toBe(true);
        expect(tipStorage.wasShown('welcome', 'out')).toBe(true);
    });

    it('getLastShownTime возвращает timestamp в ms после markAsShown', () => {
        tipStorage.markAsShown('welcome', 'out');
        const ts = tipStorage.getLastShownTime('welcome', 'out');
        expect(typeof ts).toBe('number');
        expect(ts).toBeGreaterThan(0);
    });

    it('getRecord возвращает корректные данные после markAsShown', () => {
        tipStorage.markAsShown('welcome', 'out');
        const record = tipStorage.getRecord('welcome', 'out');
        expect(record).toMatchObject({
            type: 'welcome',
            category: 'out',
            version: 1,
        });
        expect(typeof record.timestamp).toBe('string');
    });

    it('clear удаляет запись о подсказке', () => {
        tipStorage.markAsShown('welcome', 'out');
        expect(tipStorage.wasShown('welcome', 'out')).toBe(true);
        tipStorage.clear('welcome', 'out');
        expect(tipStorage.wasShown('welcome', 'out')).toBe(false);
        expect(tipStorage.getRecord('welcome', 'out')).toBeNull();
    });

    it('getAll возвращает все показанные подсказки в категории', () => {
        tipStorage.markAsShown('welcome', 'out');
        tipStorage.markAsShown('followup', 'out');
        const all = tipStorage.getAll('out');
        expect(Object.keys(all)).toEqual(expect.arrayContaining(['welcome', 'followup']));
        expect(all['welcome']).toBeDefined();
        expect(all['followup']).toBeDefined();
    });

    it('hasAnyBeenShown возвращает true, если хотя бы одна подсказка была показана', () => {
        expect(tipStorage.hasAnyBeenShown('out')).toBe(false);
        tipStorage.markAsShown('welcome', 'out');
        expect(tipStorage.hasAnyBeenShown('out')).toBe(true);
    });

    it('clearAll удаляет все подсказки в категории', () => {
        tipStorage.markAsShown('welcome', 'out');
        tipStorage.markAsShown('followup', 'out');
        tipStorage.clearAll('out');
        expect(tipStorage.wasShown('welcome', 'out')).toBe(false);
        expect(tipStorage.wasShown('followup', 'out')).toBe(false);
        expect(tipStorage.getAll('out')).toEqual({});
    });

    it('возвращает false/null для неизвестного типа подсказки', () => {
        expect(tipStorage.markAsShown('unknown', 'out')).toBe(false);
        expect(tipStorage.wasShown('unknown', 'out')).toBe(false);
        expect(tipStorage.getLastShownTime('unknown', 'out')).toBeNull();
        expect(tipStorage.getRecord('unknown', 'out')).toBeNull();
        tipStorage.clear('unknown', 'out'); // не должно выбрасывать исключение
        expect(logger.warn).toHaveBeenCalled();
    });

    it('возвращает пустой объект для неизвестной категории в getAll', () => {
        expect(tipStorage.getAll('nonexistent')).toEqual({});
    });

    it('возвращает false для hasAnyBeenShown с неизвестной категорией', () => {
        expect(tipStorage.hasAnyBeenShown('nonexistent')).toBe(false);
    });

    it('clearAll не выбрасывает исключение для неизвестной категории', () => {
        expect(() => tipStorage.clearAll('nonexistent')).not.toThrow();
    });

    it('работает для подсказок категории "in"', () => {
        expect(tipStorage.wasShown('greeting', 'in')).toBe(false);
        tipStorage.markAsShown('greeting', 'in');
        expect(tipStorage.wasShown('greeting', 'in')).toBe(true);
        tipStorage.clear('greeting', 'in');
        expect(tipStorage.wasShown('greeting', 'in')).toBe(false);
    });

    it('корректно обрабатывает ошибки чтения/записи storage', () => {
        // Симулируем ошибки при getItem/setItem
        const badStorage = {
            getItem: () => { throw new Error('fail'); },
            setItem: () => { throw new Error('fail'); },
            removeItem: () => { throw new Error('fail'); },
        };
        const ts = new TipStorage(keysProvider, badStorage, logger);
        expect(ts.markAsShown('welcome', 'out')).toBe(false);
        expect(ts.wasShown('welcome', 'out')).toBe(false);
        expect(logger.warn).toHaveBeenCalled();
    });
});