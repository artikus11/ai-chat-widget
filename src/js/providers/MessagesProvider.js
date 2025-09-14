import { sanitizeHtml } from '../utils/sanitize';

export default class MessagesProvider {
    static DEFAULTS = {
        greeting: {
            text: 'Привет! Чем могу помочь?',
            delay: 600,
        },
        followup: {
            text: 'Вы всё ещё думаете? Готова помочь!',
            delay: 15000,
        },
        fallback: {
            text: 'Что-то пошло не так, позвоните нам',
            delay: 0,
        },
        error: {
            text: 'Что-то пошло не так, позвоните нам',
            delay: 0,
        },
        welcome: {
            text: 'Готов помочь! Нажмите, чтобы начать чат',
            delay: 3000,
            duration: 4000,
            disable: false,
        },
        invite: { text: '', delay: 0 },
        reminder: { text: '', delay: 0 },
        encouragement: { text: '', delay: 0 },
        motivation: { text: '', delay: 0 },
    };

    /**
     * @param {Object} [messagesOptions={}] - Кастомные настройки
     *   Структура: { [type]: { text: string, delay: number, ...any } }
     */
    constructor(messagesOptions = {}) {
        this.messages = this.mergeWithDefaults(messagesOptions);
    }

    /**
     * Глубокое слияние с дефолтами
     * Теперь поддерживает любые ключи
     */
    mergeWithDefaults(options) {
        const defaults = MessagesProvider.DEFAULTS; // или как у вас хранится
        const result = {};

        const allKeys = new Set([
            ...Object.keys(defaults),
            ...Object.keys(options),
        ]);

        for (const key of allKeys) {
            const defaultConfig = defaults[key] || { text: '', delay: 0 };
            const userConfig = options[key];

            // Если пользователь ничего не передал — используем дефолт
            if (!userConfig) {
                result[key] = defaultConfig;
                continue;
            }

            // Глубокое слияние с защитой от пустых значений
            result[key] = {};
            for (const field of Object.keys(defaultConfig)) {
                const value = userConfig[field];
                // Если значение НЕ передано или оно пустое (но не 0!) — берём из дефолта
                if (
                    value === undefined ||
                    value === null ||
                    (value === '' && field === 'text')
                ) {
                    result[key][field] = defaultConfig[field];
                } else {
                    result[key][field] = value;
                }
            }

            // Если в userConfig есть поля, которых нет в дефолтах (например, duration) — добавим их
            for (const field of Object.keys(userConfig)) {
                if (!(field in defaultConfig)) {
                    result[key][field] = userConfig[field];
                }
            }
        }

        return result;
    }

    /**
     * Получить весь объект сообщения
     */
    get(type) {
        return this.messages[type] || { text: '', delay: 0 };
    }

    /**
     * Получить только текст (очищенный)
     */
    getText(type) {
        const message = this.get(type);
        return sanitizeHtml(message.text || '');
    }

    /**
     * Получить задержку
     */
    getDelay(type) {
        const message = this.get(type);
        return message.delay ?? 0;
    }

    /**
     * Получить произвольное поле (например, duration)
     * @param {string} type - тип сообщения
     * @param {string} field - имя поля
     * @param {*} defaultValue - значение по умолчанию
     */
    getField(type, field, defaultValue = undefined) {
        const message = this.get(type);
        return message[field] !== undefined ? message[field] : defaultValue;
    }

    /**
     * Проверить, существует ли тип сообщения
     */
    has(type) {
        return !!this.messages[type];
    }

    /**
     * Получить список всех доступных типов
     */
    listTypes() {
        return Object.keys(this.messages);
    }
}
