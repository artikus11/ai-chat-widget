import { sanitizeHtml } from '../utils/sanitize';

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
     * Стандартные значения сообщений по умолчанию.
     *
     * @type {Object}
     * @property {Object} in - Сообщения внутри чата
     * @property {Object} out - Сообщения вне чата
     * @readonly
     */
    static DEFAULTS = {
        in: {
            greeting: {
                text: 'Привет! Я помогу подобрать товар или оформить заказ. Просто напишите',
                delay: 600,
            },
            followup: {
                text: 'Вы всё ещё здесь? Могу предложить что-то интересное или помочь с выбором.',
                delay: 15000,
            },
            fallback: {
                text: 'Кажется, у нас временные сложности. Позвоните нам — мы обязательно поможем с заказом.',
                delay: 0,
            },
            error: {
                text: 'Что-то пошло не так. Позвоните нам — решим вопрос с доставкой или выбором товара.',
                delay: 0,
            },
        },
        out: {
            welcome: {
                // 1. Впервые видит → через 3 сек
                text: 'Готов помочь! Нажмите, чтобы начать чат',
                delay: 10000,
                duration: 8000,
                disable: false,
            },
            followup: {
                // 2. Не открыл за 30 сек → напоминание
                text: 'Остались вопросы по товарам? Спрашивайте — подскажу, покажу, помогу выбрать.',
                delay: 30000,
            },
            returning: {
                // 3. Открыл, но не написал (≤30 мин) → returning
                text: 'Вы в чате — могу помочь с выбором товара, размером или доставкой. Просто спросите!',
                delay: 10000,
            },
            active_return: {
                // 7. Перешёл на другую страницу → active_return
                text: 'Хотите продолжить подбор? У меня есть пара интересных вариантов для вас.',
                delay: 0,
            },
            reconnect: {
                // 5–6. Вернулся после >30 мин или в течение недели → reconnect
                text: 'Рад снова вас видеть! Давайте найдём то, что нужно — я помню ваш вкус.',
                delay: 0,
            },
        },
    };

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
        this.messages = this.mergeWithDefaults(
            MessagesProvider.DEFAULTS,
            customMessages
        );
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
     *
     * @example
     * provider.has('in', 'error'); // → true
     * provider.has('out', 'nonexistent'); // → false
     */
    has(namespace, type) {
        return !!this.messages[namespace]?.[type];
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
