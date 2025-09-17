import { describe, it, expect, beforeEach } from 'vitest';
import StorageKeysProvider from '@js/providers/StorageKeyProvider';

const MOCK_KEYS = {
    CHAT: {
        OPEN: 'ui:chat:open',
        CLOSE: 'ui:chat:close',
    },
    OUTER_TIP: {
        WELCOME_SHOWN: 'ui:outer-tip:welcome-shown',
    },
    EMPTY_SECTION: {},
};

describe('StorageKeysProvider', () => {
    let provider;

    beforeEach(() => {
        provider = new StorageKeysProvider(MOCK_KEYS);
    });

    describe('get', () => {
        it('returns the correct key for valid section and name', () => {
            expect(provider.get('CHAT', 'OPEN')).toBe('ui:chat:open');
            expect(provider.get('OUTER_TIP', 'WELCOME_SHOWN')).toBe('ui:outer-tip:welcome-shown');
        });

        it('returns null for invalid section', () => {
            expect(provider.get('NOT_EXIST', 'OPEN')).toBeNull();
        });

        it('returns null for invalid key name', () => {
            expect(provider.get('CHAT', 'NOT_EXIST')).toBeNull();
        });

        it('returns null for empty section', () => {
            expect(provider.get('EMPTY_SECTION', 'ANY')).toBeNull();
        });
    });

    describe('has', () => {
        it('returns true if key exists', () => {
            expect(provider.has('CHAT', 'OPEN')).toBe(true);
        });

        it('returns false if section does not exist', () => {
            expect(provider.has('NOT_EXIST', 'OPEN')).toBe(false);
        });

        it('returns false if key does not exist in section', () => {
            expect(provider.has('CHAT', 'NOT_EXIST')).toBe(false);
        });

        it('returns false for empty section', () => {
            expect(provider.has('EMPTY_SECTION', 'ANY')).toBe(false);
        });
    });

    describe('listSections', () => {
        it('returns all section names', () => {
            const sections = provider.listSections();
            expect(sections).toContain('CHAT');
            expect(sections).toContain('OUTER_TIP');
            expect(sections).toContain('EMPTY_SECTION');
            expect(sections.length).toBe(3);
        });
    });

    describe('listKeys', () => {
        it('returns all keys in a section', () => {
            expect(provider.listKeys('CHAT')).toEqual(['OPEN', 'CLOSE']);
            expect(provider.listKeys('OUTER_TIP')).toEqual(['WELCOME_SHOWN']);
        });

        it('returns empty array for non-existent section', () => {
            expect(provider.listKeys('NOT_EXIST')).toEqual([]);
        });

        it('returns empty array for empty section', () => {
            expect(provider.listKeys('EMPTY_SECTION')).toEqual([]);
        });
    });

    describe('listAll', () => {
        it('returns the original keys object', () => {
            expect(provider.listAll()).toEqual(MOCK_KEYS);
        });
    });
});