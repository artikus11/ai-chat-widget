import { sanitizeHtml } from '../utils/sanitize';
import { MESSAGES } from '@js/config';

/**
 * Провайдер сообщений с поддержкой контекстов:
 * - in: сообщения внутри чата (приветствие, напоминания и т.д.)
 * - out: сообщения вне чата (всплывающие подсказки, напоминания на странице)
 *
 * Класс позволяет управлять набором сообщений, их задержками, текстом и дополнительными полями,
 * а также поддерживает кастомизацию через пользовательские настройки.
 *
 * @class MessagesProvider
 */
export default class MessagesProvider {
    /**
     * Создаёт новый экземпляр провайдера сообщений.
     *
     * @param {Object} [customMessages] - Объект с кастомными сообщениями для переопределения дефолтов.
     *   Формат: `{ in?: Object, out?: Object }`, где каждый тип может содержать `text`, `delay` и другие поля.
     *
     *   Пример:
     *   ```js
     *   {
     *     in: { greeting: { text: 'Здравствуйте!', delay: 800 } },
     *     out: { welcome: { text: '💬 Поговорим?', duration: 5000 } }
     *   }
     *   ```
     *
     * @example
     * const provider = new MessagesProvider({
     *   in: { greeting: { text: 'Приветствую!' } },
     *   out: { welcome: { delay: 5000 } }
     * });
     */
    constructor(customMessages = {}) {
        this.messages = this.mergeWithDefaults(MESSAGES, customMessages);
    }

    /**
     * Глубокое слияние объектов сообщений по умолчанию с пользовательскими.
     * Сохраняет структуру defaults, заменяя только те поля, которые указаны в custom.
     *
     * @private
     * @param {Object} defaults - Объект со стандартными значениями.
     * @param {Object} custom - Объект с кастомными значениями.
     * @returns {Object} Новый объект с объединёнными сообщениями.
     *
     * @description
     * Метод рекурсивно объединяет два уровня вложенности (namespace → type).
     * Пустые строки заменяются значениями по умолчанию только для поля `text`.
     */
    mergeWithDefaults(defaults, custom) {
        const result = { ...defaults };

        for (const namespace in custom) {
            if (!custom.hasOwnProperty(namespace)) continue;

            const customGroup = custom[namespace];
            if (!result[namespace]) {
                result[namespace] = { ...customGroup };
                continue;
            }

            const defaultGroup = result[namespace];
            result[namespace] = { ...defaultGroup }; // копируем дефолты

            for (const type in customGroup) {
                if (!customGroup.hasOwnProperty(type)) continue;

                const defaultConfig = defaultGroup[type] || {
                    text: '',
                    delay: 0,
                };
                const customConfig = customGroup[type];

                // Создаём итоговое сообщение
                const merged = {};
                const allFields = new Set([
                    ...Object.keys(defaultConfig),
                    ...Object.keys(customConfig),
                ]);

                for (const field of allFields) {
                    const value = customConfig[field];

                    // Если значение не задано или пустая строка (для текста), берём из дефолта
                    if (
                        value === undefined ||
                        value === null ||
                        (value === '' && field === 'text')
                    ) {
                        merged[field] = defaultConfig[field];
                    } else {
                        merged[field] = value;
                    }
                }

                result[namespace][type] = merged;
            }
        }

        return result;
    }

    /**
     * Получает конфигурацию сообщения по пространству имён и типу.
     *
     * @param {'in'|'out'} namespace - Пространство имён: `'in'` (внутри чата), `'out'` (вне чата).
     * @param {string} type - Тип сообщения, например `'greeting'`, `'welcome'`.
     * @returns {{ text: string, delay: number, [key: string]: any }} Объект с параметрами сообщения.
     *   Возвращает пустой объект с `text: ''` и `delay: 0`, если сообщение не найдено.
     *
     * @example
     * provider.get('in', 'greeting'); // → { text: 'Привет!', delay: 600 }
     */
    get(namespace, type) {
        return this.messages[namespace]?.[type] || { text: '', delay: 0 };
    }

    /**
     * Получает очищенный HTML-текст сообщения с помощью sanitizer.
     *
     * @param {'in'|'out'} namespace - Пространство имён.
     * @param {string} type - Тип сообщения.
     * @returns {string} Очищенный текст сообщения. Если сообщение не существует — пустая строка.
     *
     * @example
     * provider.getText('out', 'welcome'); // → "Готов помочь! Нажмите, чтобы начать чат"
     */
    getText(namespace, type) {
        const message = this.get(namespace, type);
        return sanitizeHtml(message.text || '');
    }

    /**
     * Получает задержку показа сообщения в миллисекундах.
     *
     * @param {'in'|'out'} namespace - Пространство имён.
     * @param {string} type - Тип сообщения.
     * @returns {number} Задержка в миллисекундах. По умолчанию — 0.
     *
     * @example
     * provider.getDelay('in', 'followup'); // → 15000
     */
    getDelay(namespace, type) {
        const message = this.get(namespace, type);
        return message.delay ?? 0;
    }

    /**
     * Получает произвольное поле из конфигурации сообщения.
     *
     * @param {'in'|'out'} namespace - Пространство имён.
     * @param {string} type - Тип сообщения.
     * @param {string} field - Имя поля (например, `'duration'`, `'disable'`).
     * @param {*} [defaultValue=undefined] - Значение по умолчанию, если поле не определено.
     * @returns {*} Значение поля или значение по умолчанию.
     *
     * @example
     * provider.getField('out', 'welcome', 'duration', 5000); // → 8000
     * provider.getField('out', 'welcome', 'disable', false); // → false
     */
    getField(namespace, type, field, defaultValue = undefined) {
        const message = this.get(namespace, type);
        return message[field] !== undefined ? message[field] : defaultValue;
    }

    /**
     * Удобный метод для получения поля из сообщения в пространстве `'in'`.
     *
     * @param {string} type - Тип сообщения.
     * @param {string} field - Имя поля.
     * @param {*} [defaultValue=undefined] - Значение по умолчанию.
     * @returns {*} Значение поля или значение по умолчанию.
     *
     * @example
     * provider.getFieldIn('greeting', 'delay'); // → 600
     */
    getFieldIn(type, field, defaultValue = undefined) {
        const message = this.get('in', type);
        return message[field] !== undefined ? message[field] : defaultValue;
    }

    /**
     * Удобный метод для получения поля из сообщения в пространстве `'out'`.
     *
     * @param {string} type - Тип сообщения.
     * @param {string} field - Имя поля.
     * @param {*} [defaultValue=undefined] - Значение по умолчанию.
     * @returns {*} Значение поля или значение по умолчанию.
     *
     * @example
     * provider.getFieldOut('welcome', 'duration'); // → 8000
     */
    getFieldOut(type, field, defaultValue = undefined) {
        const message = this.get('out', type);
        return message[field] !== undefined ? message[field] : defaultValue;
    }

    /**
     * Проверяет, существует ли сообщение с указанным типом в заданном пространстве имён.
     *
     * @param {'in'|'out'} namespace - Пространство имён.
     * @param {string} type - Тип сообщения.
     * @returns {boolean} `true`, если сообщение существует, иначе `false`.
     * Если сообщение отключено (имеет `disable: true`), возвращает `false`.
     *
     * @example
     * provider.has('in', 'error'); // → true
     * provider.has('out', 'nonexistent'); // → false
     */
    has(category, type) {
        const message = this.messages[category]?.[type];
        return !!message && !message.disable;
    }

    /**
     * Возвращает список всех доступных типов сообщений в формате `'namespace.type'`.
     *
     * @returns {string[]} Массив строк вида `['in.greeting', 'out.welcome', ...]`.
     *
     * @example
     * provider.listTypes(); // → ['in.greeting', 'in.followup', 'out.welcome', ...]
     */
    listTypes() {
        const types = [];
        for (const namespace in this.messages) {
            if (!this.messages.hasOwnProperty(namespace)) continue;
            const group = this.messages[namespace];
            for (const type in group) {
                if (group.hasOwnProperty(type)) {
                    types.push(`${namespace}.${type}`);
                }
            }
        }
        return types;
    }
}
