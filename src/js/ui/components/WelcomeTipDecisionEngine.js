import { STORAGE_KEYS } from '../../config';

export class WelcomeTipDecisionEngine {
    static DEFAULT_COOLDOWN_HOURS = {
        welcome: 24,
        followup: 6,
        returning: 0,
        reconnect: 24,
        active_return: 24,
    };

    constructor(messagesProvider, storage = localStorage) {
        this.messagesProvider = messagesProvider;
        this.storage = storage;
    }

    /**
     * Определяет тип сообщения на основе состояния пользователя.
     *
     * @param {Object} state - Входные данные
     * @param {number|null} state.lastChatOpenTime - Время последнего открытия чата
     * @param {boolean} state.hasSentMessage - Пользователь отправлял сообщение
     * @returns {string|null}
     */
    determine(state) {
        const { lastChatOpenTime, hasSentMessage } = state;
        console.log(state);
        const timeSinceOpen = lastChatOpenTime !== null
            ? Date.now() - lastChatOpenTime
            : Infinity;

        const recentlyActive = timeSinceOpen <= 1000 * 60 * 10; // ≤10 минут
        const tooLongAgo = timeSinceOpen >= 1000 * 60 * 60 * 24 * 7; // >7 дней

        // 1. welcome — первый визит
        if (
            lastChatOpenTime === null &&
            !hasSentMessage &&
            this.has('welcome') &&
            this.canShow('welcome')
        ) {
            return 'welcome';
        }

        // 2. followup — новый, игнорирует >30 сек (показывается через scheduleFollowUpReminder)
        if (
            lastChatOpenTime === null &&
            !hasSentMessage &&
            this.has('followup') &&
            this.canShow('followup')
        ) {
            return 'followup';
        }

        // 3. returning — открывал, но не писал, и был ≤10 мин назад
        if (
            lastChatOpenTime !== null &&
            !hasSentMessage &&
            recentlyActive &&
            this.has('returning') &&
            this.canShow('returning')
        ) {
            return 'returning';
        }

        // 4. reconnect — писал, но давно (>10 мин), но не более недели
        if (
            !recentlyActive &&
            hasSentMessage &&
            !tooLongAgo &&
            this.has('reconnect') &&
            this.canShow('reconnect')
        ) {
            return 'reconnect';
        }


        // 5. active_return — писал ранее, перешёл на страницу
        if (
            hasSentMessage &&
            !this.hasSeenRecently('active_return') &&
            this.has('active_return') &&
            this.canShow('active_return')
        ) {
            return 'active_return';
        }



        return null;
    }

    /**
     * Проверяет, существует ли сообщение
     */
    has(type) {
        return this.messagesProvider.has(type);
    }

    /**
     * Проверяет, можно ли показать сообщение (учитывая кулдаун)
     */
    canShow(type) {
        const cooldownHours = this.getCooldownHours(type);

        // Если 0 — разрешаем всегда
        if (cooldownHours === 0) {
            return true;
        }

        const key = this.getStorageKey(type);
        if (!key) {
            return true;
        }

        const raw = this.storage.getItem(key);
        if (!raw) {
            return true;
        }

        try {
            const data = JSON.parse(raw);
            const last = new Date(data.timestamp).getTime();
            const hoursSince = (Date.now() - last) / (1000 * 60 * 60);
            return hoursSince >= cooldownHours;
        } catch {
            return true;
        }
    }

    /**
     * Проверяет, видел ли пользователь тип "недавно" (например, active_return за 24ч)
     */
    hasSeenRecently(type, hours = 24) {
        const key = this.getStorageKey(type);
        const raw = this.storage.getItem(key);
        if (!raw) { return false; }

        try {
            const data = JSON.parse(raw);
            const last = new Date(data.timestamp).getTime();
            const hoursSince = (Date.now() - last) / (1000 * 60 * 60);
            return hoursSince < hours;
        } catch {
            return true;
        }
    }

    /**
     * Возвращает ключ хранилища для типа
     */
    getStorageKey(type) {
        const map = {
            welcome: STORAGE_KEYS.UI.WELCOME_TIP.WELCOME_SHOWN,
            followup: STORAGE_KEYS.UI.WELCOME_TIP.FOLLOWUP_SHOWN,
            returning: STORAGE_KEYS.UI.WELCOME_TIP.RETURNING_SHOWN,
            reconnect: STORAGE_KEYS.UI.WELCOME_TIP.RECONNECT_SHOWN,
            active_return: STORAGE_KEYS.UI.WELCOME_TIP.ACTIVE_RETURN_SHOWN,
        };
        return map[type] || null;
    }

    /**
     * Возвращает длительность кулдауна для типа
     */
    getCooldownHours(type) {
        return this.messagesProvider.getField(
            type,
            'cooldownHours',
            WelcomeTipDecisionEngine.DEFAULT_COOLDOWN_HOURS[type]
        );
    }
}