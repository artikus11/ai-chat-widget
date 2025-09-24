/**
 * Класс для управления кулдаунами (временными интервалами между показами)
 * для различных типов сообщений (tips).
 *
 * Используется для предотвращения слишком частого показа одних и тех же сообщений.
 *
 * @class TipCooldown
 */
export class TipCooldown {
    /**
     * Создаёт новый экземпляр кулдауна.
     * @param {MessagesProvider} messagesProvider - Провайдер сообщений, содержащий тексты и настройки.
     * @param {TipStorage} storage - Хранилище для сохранения меток показа.
     * @param {Object} logger - Логгер для вывода предупреждений и ошибок.
     * @example
     * const cooldown = new TipCooldown(messagesProvider, tipStorage);
     */
    constructor(messagesProvider, storage, logger = console) {
        this.messagesProvider = messagesProvider;
        this.storage = storage;
        this.logger = logger;
    }

    /**
     * Получает значение кулдауна (в часах) для указанного типа сообщения.
     * Если в провайдере сообщений не задано, возвращает значение по умолчанию.
     * По умолчанию: 24 часа
     * @param {string} type - Тип сообщения (например, 'welcome', 'followup').
     * @param {string} [category='out'] - Категория сообщения ('in' или 'out').
     * @returns {number} Кулдаун в часах.
     * @example
     * cooldown.getCooldownHours('welcome') // → 24
     * cooldown.getCooldownHours('followup') // → 6
     */
    getCooldownHours(type, category = 'out') {
        return this.messagesProvider.getField(
            category,
            type,
            'cooldownHours',
            24
        );
    }

    /**
     * Проверяет, можно ли показать сообщение указанного типа,
     * учитывая кулдаун и время последнего показа.
     * Если кулдаун равен 0 и сообщение не показывали, тогда показываем.
     * Если сообщение не показывалось ранее, его можно показать.
     * @param {string} type - Тип сообщения (например, 'welcome', 'followup').
     * @param {string} [category='out'] - Категория сообщения ('in' или 'out').
     * @returns {boolean} True, если сообщение можно показать, иначе false.
     * @example
     * cooldown.canShow('welcome') // → true или false
     * cooldown.canShow('followup') // → true или false
     */
    canShow(type, category = 'out') {
        const cooldownHours = this.getCooldownHours(type, category);

        if (cooldownHours === 0) {
            return !this.storage.wasShown(type, category);
        }

        const last = this.storage.getLastShownTime(type, category);

        if (!last) {
            return true;
        }

        const hoursSince = this.getHoursSince(last);

        return hoursSince >= cooldownHours;
    }

    /**
     * Проверяет, было ли сообщение показано в течение последних N часов.
     * Полезно для определения, показывать ли напоминания или дополнительные подсказки.
     * @param {string} type - Тип сообщения (например, 'welcome', 'followup').
     * @param {string} [category='out'] - Категория сообщения ('in' или 'out').
     * @param {number} [hours=24] - Интервал в часах для проверки.
     * @returns {boolean} True, если сообщение было показано в указанный период, иначе false.
     * @example
     * cooldown.hasSeenRecently('welcome', 'out', 12) // → true или false
     */
    hasSeenRecently(type, category = 'out', hours = 24) {
        const last = this.storage.getLastShownTime(type, category);

        if (!last) {
            return false;
        }

        const hoursSince = this.getHoursSince(last);
        return hoursSince < hours;
    }

    /**
     * Вычисляет количество часов, прошедших с указанного времени.
     * @param {number} last - Временная метка в миллисекундах.
     * @returns {number} Количество часов, прошедших с указанного времени.
     * @example
     * cooldown.getHoursSince(Date.now() - 3 * 60 * 60 * 1000) // → примерно 3
     */
    getHoursSince(last) {
        return (Date.now() - last) / (1000 * 60 * 60);
    }
}
