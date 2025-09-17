import { describe, it, expect, vi, beforeEach } from 'vitest';
import { beforeAll, afterAll } from 'vitest';
import { UserActivityStorage } from '@js/ui/tips/UserActivityStorage';
import { createMockStorage, createMockKeysProvider } from '@test/mocks/storageMocks';

describe('UserActivityStorage > Unit', () => {
    let storage, keysProvider, logger, uas;
    const CHAT_OPEN_KEY = 'CHAT:CHAT_OPEN';
    const MESSAGE_SENT_KEY = 'CHAT:MESSAGE_SENT';

    beforeEach(() => {
        storage = createMockStorage();
        keysProvider = createMockKeysProvider({
            [CHAT_OPEN_KEY]: CHAT_OPEN_KEY,
            [MESSAGE_SENT_KEY]: MESSAGE_SENT_KEY
        });
        logger = { warn: vi.fn(), error: vi.fn() };
        uas = new UserActivityStorage(keysProvider, storage, logger);
    });

    describe('markChatOpen', () => {
        it('должен сохранять текущий timestamp как строку, если ключ существует', () => {
            const now = 1234567890;
            vi.spyOn(Date, 'now').mockReturnValue(now);
            uas.markChatOpen();
            expect(storage.setItem).toHaveBeenCalledWith(CHAT_OPEN_KEY, now.toString());
            Date.now.mockRestore();
        });

        it('не должен ничего сохранять, если ключ отсутствует', () => {
            keysProvider.get.mockReturnValueOnce(null);
            uas.markChatOpen();
            expect(storage.setItem).not.toHaveBeenCalled();
        });
    });

    describe('getLastChatOpenTime', () => {
        it('должен возвращать timestamp как число, если значение присутствует', () => {
            storage.getItem.mockReturnValueOnce('1680000000000');
            const result = uas.getLastChatOpenTime();
            expect(keysProvider.get).toHaveBeenCalledWith('CHAT', 'CHAT_OPEN');
            expect(result).toBe(1680000000000);
        });

        it('должен возвращать null, если ключ отсутствует', () => {
            keysProvider.get.mockReturnValueOnce(null);
            const result = uas.getLastChatOpenTime();
            expect(result).toBeNull();
        });

        it('should return null if value is not present', () => {
            storage.getItem.mockReturnValueOnce(null);
            const result = uas.getLastChatOpenTime();
            expect(result).toBeNull();
        });
    });

    describe('markMessageSent', () => {
        it('должен установить ключ MESSAGE_SENT в "true", если ключ существует', () => {
            uas.markMessageSent();
            expect(storage.setItem).toHaveBeenCalledWith(MESSAGE_SENT_KEY, 'true');
        });

        it('не должен ничего сохранять, если ключ отсутствует', () => {
            keysProvider.get.mockReturnValueOnce(null);
            uas.markMessageSent();
            expect(storage.setItem).not.toHaveBeenCalled();
        });
    });

    describe('hasSentMessage', () => {
        it('должен вернуть true, если значение MESSAGE_SENT равно "true"', () => {
            storage.getItem.mockReturnValueOnce('true');
            expect(uas.hasSentMessage()).toBe(true);
        });

        it('должен вернуть false, если значение MESSAGE_SENT не равно "true"', () => {
            storage.getItem.mockReturnValueOnce('false');
            expect(uas.hasSentMessage()).toBe(false);
        });

        it('должен вернуть false, если ключ отсутствует', () => {
            keysProvider.get.mockReturnValueOnce(null);
            expect(uas.hasSentMessage()).toBe(false);
        });

        it('должен вернуть false, если значение равно null', () => {
            storage.getItem.mockReturnValueOnce(null);
            expect(uas.hasSentMessage()).toBe(false);
        });
    });
});