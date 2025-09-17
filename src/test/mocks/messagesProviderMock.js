import MessagesProvider from '@js/providers/MessagesProvider';

// Базовые стандартные сообщения (можно расширять)
const DEFAULT_TEST_MESSAGES = {
    in: {
        greeting: { text: 'Привет! Готов помочь?', delay: 600 },
        followup: { text: 'Вы всё ещё здесь?', delay: 15000 },
    },
    out: {
        welcome: { text: '💬 Поговорим?' },
        followup: { text: 'Напоминаем о чате' },
        returning: { text: 'Рады видеть вас снова!' },
        reconnect: { text: 'Соединение восстановлено' },
        active_return: { text: 'Вы вернулись — чат открыт' },
    },
};

/**
 * Создаёт экземпляр MessagesProvider с опциональными кастомными сообщениями.
 *
 * @param {Object} [customMessages] - Кастомные переопределения (как в конструкторе)
 * @param {Object} [baseMessages=DEFAULT_TEST_MESSAGES] - Базовые сообщения (опционально заменить)
 * @returns {MessagesProvider}
 *
 * @example
 * const provider = createMessagesProviderMock({
 *   out: {
 *     welcome: { text: 'Здравствуйте!', cooldownHours: 12 }
 *   }
 * });
 */
export function createMessagesProviderMock(customMessages = {}, baseMessages = DEFAULT_TEST_MESSAGES) {
    return new MessagesProvider(customMessages, baseMessages);
}

/**
 * Удобная утилита: создаёт провайдер с указанным кулдауном для типа.
 *
 * @param {string} type - Тип сообщения, например 'welcome'
 * @param {number|null} cooldownHours - Значение кулдауна. Если null — не задаём.
 * @param {'in'|'out'} [namespace='out'] - Пространство имён
 * @returns {MessagesProvider}
 *
 * @example
 * const provider = mockMessagesWithCooldown('welcome', 48); // 48 часов
 */
export function mockMessagesWithCooldown(type, cooldownHours, namespace = 'out') {
    const custom = { [namespace]: { [type]: {} } };
    if (cooldownHours !== null) {
        custom[namespace][type].cooldownHours = cooldownHours;
    }
    return createMessagesProviderMock(custom);
}

/**
 * Удобная утилита: создаёт провайдер с отключённым сообщением (disable: true).
 *
 * @param {string} type - Тип сообщения
 * @param {'in'|'out'} [namespace='out'] - Пространство имён
 * @returns {MessagesProvider}
 */
export function mockMessagesDisabled(type, namespace = 'out') {
    const custom = {
        [namespace]: {
            [type]: { disable: true },
        },
    };
    return createMessagesProviderMock(custom);
}