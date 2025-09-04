/**
 * Провайдер сообщений с дефолтными значениями
 * @class MessagesProvider
 */
export default class MessagesProvider {
    /**
     * Создает экземпляр MessagesProvider
     * @param {Object} [messagesOptions={}] - Объект с кастомными настройками сообщений
     * @param {Object} [messagesOptions.greeting] - Настройки приветственного сообщения
     * @param {string} [messagesOptions.greeting.text='Привет! Чем могу помочь?'] - Текст приветствия
     * @param {number} [messagesOptions.greeting.delay=600] - Задержка перед показом приветствия (мс)
     * @param {Object} [messagesOptions.followup] - Настройки сообщения-напоминания
     * @param {string} [messagesOptions.followup.text='Вы всё ещё думаете? Готова помочь!'] - Текст напоминания
     * @param {number} [messagesOptions.followup.delay=15000] - Задержка перед показом напоминания (мс)
     * @param {Object} [messagesOptions.fallback] - Настройки резервного сообщения
     * @param {string} [messagesOptions.fallback.text='Что-то пошло не так, позвоните нам'] - Текст резервного сообщения
     * @param {number} [messagesOptions.fallback.delay=0] - Задержка резервного сообщения (мс)
     * @param {Object} [messagesOptions.error] - Настройки сообщения об ошибке
     * @param {string} [messagesOptions.error.text='Что-то пошло не так, позвоните нам'] - Текст ошибки
     * @param {number} [messagesOptions.error.delay=0] - Задержка сообщения об ошибке (мс)
     * @param {Object} [messagesOptions.invite] - Настройки пригласительного сообщения
     * @param {string} [messagesOptions.invite.text=''] - Текст приглашения
     * @param {number} [messagesOptions.invite.delay=0] - Задержка приглашения (мс)
     * @param {Object} [messagesOptions.reminder] - Настройки напоминания
     * @param {string} [messagesOptions.reminder.text=''] - Текст напоминания
     * @param {number} [messagesOptions.reminder.delay=0] - Задержка напоминания (мс)
     * @param {Object} [messagesOptions.encouragement] - Настройки поощрительного сообщения
     * @param {string} [messagesOptions.encouragement.text=''] - Текст поощрения
     * @param {number} [messagesOptions.encouragement.delay=0] - Задержка поощрения (мс)
     * @param {Object} [messagesOptions.motivation] - Настройки мотивационного сообщения
     * @param {string} [messagesOptions.motivation.text=''] - Текст мотивации
     * @param {number} [messagesOptions.motivation.delay=0] - Задержка мотивации (мс)
     */
    constructor(messagesOptions = {}) {
        this.messages = this.mergeWithDefaults(messagesOptions);
    }

    /**
     * Объединяет пользовательские настройки с значениями по умолчанию
     * @private
     * @param {Object} options - Пользовательские настройки сообщений
     * @returns {Object} Объединенный объект настроек
     */
    mergeWithDefaults(options) {
        const defaults = {
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
            invite: {
                text: '',
                delay: 0,
            },
            reminder: {
                text: '',
                delay: 0,
            },
            encouragement: {
                text: '',
                delay: 0,
            },
            motivation: {
                text: '',
                delay: 0,
            },
        };

        return {
            ...defaults,
            ...options,
            greeting: { ...defaults.greeting, ...options.greeting },
            followup: { ...defaults.followup, ...options.followup },
            fallback: { ...defaults.fallback, ...options.fallback },
            error: { ...defaults.error, ...options.error },
            invite: { ...defaults.invite, ...options.invite },
            reminder: { ...defaults.reminder, ...options.reminder },
            encouragement: { ...defaults.encouragement, ...options.encouragement },
            motivation: { ...defaults.motivation, ...options.motivation },
        };
    }

    /**
     * Получает полный объект сообщения по типу
     * @param {string} type - Тип сообщения (greeting, followup, error и т.д.)
     * @returns {Object} Объект сообщения с text и delay, или {text: '', delay: 0} если тип не найден
     * @example
     * const message = messagesProvider.get('greeting');
     * // { text: 'Привет! Чем могу помочь?', delay: 600 }
     */
    get(type) {
        return this.messages[type] || { text: '', delay: 0 };
    }

    /**
     * Получает только текст сообщения по типу
     * @param {string} type - Тип сообщения
     * @returns {string} Текст сообщения или пустая строка если тип не найден
     * @example
     * const text = messagesProvider.getText('error');
     * // 'Что-то пошло не так, позвоните нам'
     */
    getText(type) {
        return this.get(type).text || '';
    }

    /**
     * Получает задержку сообщения по типу
     * @param {string} type - Тип сообщения
     * @returns {number} Задержка в миллисекундах или 0 если тип не найден
     * @example
     * const delay = messagesProvider.getDelay('followup');
     * // 15000
     */
    getDelay(type) {
        return this.get(type).delay || 0;
    }
}
