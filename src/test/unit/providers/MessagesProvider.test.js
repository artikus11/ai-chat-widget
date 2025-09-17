import { describe, it, expect } from 'vitest';
import MessagesProvider from '@js/providers/MessagesProvider';
import { MESSAGES } from '@js/providers/MessagesProvider'; // экспортировано в конце
import { sanitizeHtml } from '@js/utils/sanitize'

// Удобная утилита для создания провайдера с кастомом
const createProvider = (customMessages = {}) => new MessagesProvider(customMessages);

vi.mock('@js/utils/sanitize', () => ({
    sanitizeHtml: vi.fn((text) => {
        // Если текст пустой — возвращаем пустую строку
        if (!text || text.trim() === '') {
            return '';
        }
        return `[sanitized]${text}[/sanitized]`;
    }),
}));

describe('MessagesProvider', () => {
    describe('get', () => {
        it('должен возвращать сообщение по namespace и type', () => {
            const provider = createProvider();
            const msg = provider.get('out', 'welcome');
            expect(msg).toEqual({
                text: 'Готов помочь! Нажмите, чтобы начать чат',
                delay: 10000,
                duration: 8000,
                disable: false,
            });
        });

        it('должен возвращать пустой объект с text и delay по умолчанию, если сообщение не существует', () => {
            const provider = createProvider();
            const msg = provider.get('in', 'nonexistent');
            expect(msg).toEqual({ text: '', delay: 0 });
        });
    });

    describe('has', () => {
        it('должен возвращать true, если сообщение существует и не отключено', () => {
            const provider = createProvider();
            expect(provider.has('out', 'welcome')).toBe(true);
            expect(provider.has('in', 'greeting')).toBe(true);
        });

        it('должен возвращать false, если сообщение имеет disable: true', () => {
            const provider = createProvider({
                out: {
                    welcome: { disable: true },
                },
            });
            expect(provider.has('out', 'welcome')).toBe(false);
        });

        it('должен возвращать true, если disable: false', () => {
            const provider = createProvider({
                out: {
                    welcome: { disable: false },
                },
            });
            expect(provider.has('out', 'welcome')).toBe(true);
        });

        [
            [undefined, true],
            [false, true],
            [true, false]
        ].forEach(([disableValue, shouldHave]) => {
            it(`массив проверк: должен возвращать ${shouldHave} при disable: ${disableValue}`, () => {
                const provider = createProvider({
                    out: {
                        test: { text: 'Test', ...(disableValue !== undefined && { disable: disableValue }) }
                    }
                });

                expect(provider.has('out', 'test')).toBe(shouldHave);
            });
        });

        it('должен возвращать true, если сообщение существует и disable отсутствует', () => {
            const provider = createProvider({
                out: {
                    promo: { text: 'Специальное предложение!' },
                },
            });

            const msg = provider.get('out', 'promo');
            expect(msg.disable).toBeUndefined();
            expect(provider.has('out', 'promo')).toBe(true);
        });

        it('должен возвращать false, если сообщение не существует', () => {
            const provider = createProvider();
            expect(provider.has('out', 'nonexistent')).toBe(false);
        });
    });

    describe('mergeWithDefaults', () => {
        it('должен сохранять поля из defaults, если в custom они undefined/null/пустая строка (для text)', () => {
            const custom = {
                in: {
                    greeting: {
                        text: '', // должна взяться из дефолта
                        delay: null, // тоже из дефолта
                    },
                },
            };

            const provider = createProvider(custom);
            const msg = provider.get('in', 'greeting');

            expect(msg.text).toBe('Привет! Я помогу подобрать товар или оформить заказ. Просто напишите');
            expect(msg.delay).toBe(600);
        });

        it('должен брать значение из custom, если оно задано', () => {
            const custom = {
                out: {
                    welcome: {
                        text: 'Кастомный текст!',
                        delay: 5000,
                        extraField: 'customValue',
                    },
                },
            };

            const provider = createProvider(custom);
            const msg = provider.get('out', 'welcome');

            expect(msg.text).toBe('Кастомный текст!');
            expect(msg.delay).toBe(5000);
            expect(msg.extraField).toBe('customValue');
        });

        it('должен добавлять новые типы сообщений из custom', () => {
            const custom = {
                out: {
                    promo: {
                        text: 'Специальное предложение!',
                        delay: 2000,
                    },
                },
            };

            const provider = createProvider(custom);
            expect(provider.has('out', 'promo')).toBe(true);
            expect(provider.get('out', 'promo')).toEqual({
                text: 'Специальное предложение!',
                delay: 2000,
            });
        });

        it('должен правильно обрабатывать disable: true даже если его нет в дефолтах', () => {
            const custom = {
                out: {
                    welcome: {
                        disable: true,
                    },
                },
            };

            const provider = createProvider(custom);
            const msg = provider.get('out', 'welcome');
            expect(msg.disable).toBe(true);
            expect(provider.has('out', 'welcome')).toBe(false);
        });

        it('должен сохранять disable: false, если передан', () => {
            const custom = {
                out: {
                    welcome: {
                        disable: false,
                    },
                },
            };

            const provider = createProvider(custom);
            expect(provider.has('out', 'welcome')).toBe(true);
        });
    });

    describe('getText', () => {
        it('должен возвращать очищенный текст сообщения', () => {
            const provider = createProvider({
                out: { test: { text: '<b>Click me</b>' } }
            });

            const result = provider.getText('out', 'test');

            expect(result).toBe('[sanitized]<b>Click me</b>[/sanitized]');
            expect(sanitizeHtml).toHaveBeenCalledWith('<b>Click me</b>');
        });

        it('должен возвращать пустую строку, если сообщение не существует', () => {
            const provider = createProvider();
            expect(provider.getText('out', 'nonexistent')).toBe('');
        });
    });

    describe('getDelay', () => {
        it('должен возвращать delay из сообщения', () => {
            const provider = createProvider();
            expect(provider.getDelay('in', 'greeting')).toBe(600);
        });

        it('должен возвращать 0, если delay не задан', () => {
            const provider = createProvider({
                out: {
                    promo: { text: 'Без задержки' } // нет delay
                }
            });
            expect(provider.getDelay('out', 'promo')).toBe(0);
        });
    });

    describe('getField', () => {
        it('должен возвращать произвольное поле', () => {
            const provider = createProvider({
                out: {
                    welcome: {
                        duration: 8000,
                        cooldownHours: 24,
                    },
                },
            });

            expect(provider.getField('out', 'welcome', 'duration')).toBe(8000);
            expect(provider.getField('out', 'welcome', 'cooldownHours')).toBe(24);
        });

        it('должен возвращать defaultValue, если поле не существует', () => {
            const provider = createProvider();
            expect(provider.getField('out', 'welcome', 'missing', 'default')).toBe('default');
        });

        it('должен возвращать undefined, если поле undefined и нет defaultValue', () => {
            const provider = createProvider();
            expect(provider.getField('out', 'welcome', 'missing')).toBeUndefined();
        });
    });

    describe('getFieldIn / getFieldOut', () => {
        it('getFieldIn должен возвращать поле из in', () => {
            const provider = createProvider({
                in: {
                    greeting: { delay: 1000 }
                }
            });
            expect(provider.getFieldIn('greeting', 'delay')).toBe(1000);
        });

        it('getFieldOut должен возвращать поле из out', () => {
            const provider = createProvider({
                out: {
                    welcome: { duration: 5000 }
                }
            });
            expect(provider.getFieldOut('welcome', 'duration')).toBe(5000);
        });
    });

    describe('listTypes', () => {
        it('должен возвращать список всех типов в формате "namespace.type"', () => {
            const provider = createProvider({
                out: {
                    promo: { text: 'New!' },
                },
            });

            const types = provider.listTypes();
            expect(types).toContain('in.greeting');
            expect(types).toContain('out.welcome');
            expect(types).toContain('out.promo');
            expect(types).not.toContain('out.missing');
        });
    });
});