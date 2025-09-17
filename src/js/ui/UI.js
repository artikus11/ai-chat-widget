import { defaultClasses } from '../config';
import { Elements } from './Elements';
import { Messages } from './components/Messages';
import { FormHandler } from './components/FormHandler';
import { StateManager } from './components/StateManager';
import { TypingIndicator } from './features/TypingIndicator';
import { InnerTips } from './features/InnerTips';
import { OuterTips } from './features/OuterTips';

/**
 * Основной класс пользовательского интерфейса чата.
 *
 * Управляет отображением элементов UI, обработкой пользовательских действий,
 * состоянием видимости, формой ввода, сообщениями и взаимодействием с провайдером.
 * Использует шаблон "Компонент" с делегированием ответственности дочерним обработчикам.
 *
 * @example
 * const ui = new UI(container, messagesProvider, {
 *   classes: { message: 'custom-message' },
 *   selectors: { input: '#chat-input' }
 * }, eventEmitter, logger);
 *
 * ui.bindEvents(text => console.log('Отправлено:', text), () => console.log('Чат переключён'));
 *
 * @class UI
 */
export default class UI {
    /**
     * Создаёт экземпляр UI.
     *
     * @param {HTMLElement} container - Корневой DOM-элемент чата.
     * @param {MessagesProvider} messagesProvider - Сервис для работы с сообщениями (загрузка, добавление).
     * @param {StorageKeysProvider} keysProvider - Провайдер ключей для хранения состояний и настроек.
     * @param {Object} [options={}] - Дополнительные настройки.
     * @param {Object} [options.classes] - Кастомные CSS-классы для переопределения стилей.
     * @param {Object} [options.selectors] - Селекторы для поиска внутренних элементов (input, toggle и т.д.).
     * @param {Evented} eventEmitter - Внутренняя шина событий для коммуникации между компонентами.
     * @param {Object} [logger] - Логгер с методами `.debug()`, `.info()`, `.error()` для отладки.
     *
     * @throws {Error} Если container не является HTMLElement.
     *
     * @example
     * new UI(
     *   document.getElementById('chat'),
     *   messagesProvider,
     *   { classes: { open: 'chat-open' } },
     *   eventEmitter,
     *   console
     * );
     */
    constructor(
        container,
        messagesProvider,
        keysProvider,
        options = {},
        eventEmitter,
        logger
    ) {
        if (!container || !(container instanceof HTMLElement)) {
            throw new Error('UI: container must be a valid HTMLElement');
        }

        /**
         * Объединённые CSS-классы: стандартные + переданные через опции или кастомные.
         * Используются всеми обработчиками для управления стилями.
         * @type {Object<string, string>}
         */
        this.classes = { ...defaultClasses, ...(options.classes || {}) };

        /**
         * Менеджер DOM-элементов чата.
         * @type {Elements}
         */
        this.elements = new Elements(container, options.selectors);

        /**
         * Провайдер сообщений — источник данных для отображения.
         * @type {MessagesProvider}
         */
        this.messagesProvider = messagesProvider;

        /**
         * Провайдер ключей для доступа к STORAGE_KEYS.
         * @type {StorageKeysProvider}
         */
        this.keysProvider = keysProvider;

        /**
         * Шина событий для внутренней коммуникации.
         * @type {Evented}
         */
        this.eventEmitter = eventEmitter;

        /**
         * Логгер для отладочных и диагностических сообщений.
         * @type {Object|Function|undefined}
         */
        this.logger = logger;

        /**
         * Контроллер для отмены асинхронных операций (например, fetch, setTimeout).
         * Используется для предотвращения утечек памяти при размонтировании.
         * @type {AbortController}
         */
        this.abortController = new AbortController();

        this.#initializeComponents();
        this.#initializeFeatures();
    }

    /**
     * Инициализирует все функциональные обработчики UI:
     * - сообщения
     * - форма
     * - состояние (открыто/закрыто)
     *
     * @private
     */
    #initializeComponents() {
        this.messages = new Messages(
            this.elements.messages,
            this.classes,
            this.eventEmitter,
            this.logger
        );

        this.stateManager = new StateManager(
            this.elements,
            this.classes,
            this.abortController,
            this.eventEmitter,
            this.logger
        );

        this.formHandler = new FormHandler(
            this,
            this.elements,
            this.abortController,
            this.eventEmitter,
            this.logger
        );
    }

    /**
     * Инициализирует дополнительный функционал UI:
     * - индикатор печати
     * - авто-приветствие
     * - подсказка-приветствие
     *
     * @private
     */
    #initializeFeatures() {
        this.typingIndicator = new TypingIndicator(
            this.elements.messages,
            this.classes,
            this.eventEmitter,
            this.logger
        );

        this.innerTips = new InnerTips(
            this,
            this.messagesProvider,
            this.keysProvider,
            this.elements.messages,
            this.eventEmitter,
            this.logger
        );

        this.outerTips = new OuterTips(
            this.elements,
            this.classes,
            this.messagesProvider,
            this.keysProvider,
            this.eventEmitter,
            this.logger
        );
    }

    /**
     * Привязывает обработчики событий к UI-элементам:
     * - отправка формы
     * - переключение видимости чата
     *
     * @param {Function} onSubmit - Функция, вызываемая при отправке сообщения. Принимает текст.
     * @param {Function} onToggle - Функция, вызываемая при открытии/закрытии окна чата.
     *
     * @example
     * ui.bindEvents(
     *   (text) => controller.sendMessage(text),
     *   () => analytics.track('chat.toggled')
     * );
     */
    bindEvents(onSubmit, onToggle) {
        this.formHandler.bindEvents(onSubmit);
        this.stateManager.bindEvents(onToggle);
    }

    /**
     * Отвязывает все активные обработчики событий и асинхронные задачи.
     * Вызывается при уничтожении чата для предотвращения утечек памяти.
     *
     * Пересоздаёт `abortController`, чтобы новые события не влияли на старые.
     *
     * @example
     * ui.unbindEvents(); // Останавливает слушатели
     */
    unbindEvents() {
        this.abortController.abort();
        this.abortController = new AbortController();
    }

    /**
     * Переключает состояние чата: открывает, если закрыт, и наоборот.
     * При открытии запускается авто-приветствие; при закрытии — оно отменяется.
     *
     * @example
     * ui.toggle(); // Откроет или закроет окно
     */
    toggle() {
        if (this.isOpen()) {
            this.close();
            this.innerTips.cancel();
        } else {
            this.open();
            this.innerTips.start();
        }
    }

    /**
     * Добавляет новое сообщение в список сообщений через MessageHandler.
     *
     * @param {...any} args - Аргументы, передаваемые напрямую в `messageHandler.addMessage`.
     * @returns {any} Результат выполнения (обычно DOM-элемент сообщения или ID).
     *
     * @example
     * ui.addMessage({
     *   type: 'user',
     *   text: 'Привет!',
     *   timestamp: Date.now()
     * });
     */
    addMessage(...args) {
        return this.messages.addMessage(...args);
    }

    /**
     * Запускает отображение приветственного совета (например, "Напишите первым").
     *
     * @example
     * ui.startWelcomeTip();
     */
    startOuterTips() {
        this.outerTips.start();
    }

    /**
     * Показывает индикатор "собеседник печатает".
     *
     * @example
     * ui.showTyping();
     */
    showTyping() {
        this.typingIndicator.show();
    }

    /**
     * Обновляет содержимое индикатора печати (например, меняет текст или аватар).
     *
     * @param {...any} args - Параметры обновления (зависит от реализации обработчика).
     *
     * @example
     * ui.updateTyping({ sender: 'Ассистент' });
     */
    updateTyping(...args) {
        this.typingIndicator.update(...args);
    }

    /**
     * Скрывает индикатор печати.
     *
     * @example
     * ui.hideTyping();
     */
    hideTyping() {
        this.typingIndicator.hide();
    }

    /**
     * Преобразует текущий индикатор печати в полноценное сообщение (например, после получения ответа).
     *
     * @example
     * ui.finalizeTypingAsMessage({
     *   text: 'Здравствуйте! Чем могу помочь?',
     *   type: 'ai'
     * });
     */
    finalizeTypingAsMessage() {
        this.typingIndicator.finalizeAsMessage();
    }

    /**
     * Блокирует форму ввода (кнопку и поле), чтобы предотвратить повторную отправку.
     *
     * @example
     * ui.disabledForm(); // Отключает форму во время загрузки
     */
    disabledForm() {
        this.formHandler.disable();
    }

    /**
     * Разблокирует форму ввода.
     *
     * @example
     * ui.enableForm(); // После успешной отправки
     */
    enableForm() {
        this.formHandler.enable();
    }

    /**
     * Проверяет, открыто ли окно чата.
     *
     * @returns {boolean} `true`, если чат открыт, иначе `false`.
     *
     * @example
     * if (ui.isOpen()) {
     *   console.log('Чат виден');
     * }
     */
    isOpen() {
        return this.stateManager.isOpen();
    }

    /**
     * Открывает окно чата.
     *
     * @example
     * ui.open();
     */
    open() {
        this.stateManager.open();
    }

    /**
     * Закрывает окно чата.
     *
     * @example
     * ui.close();
     */
    close() {
        this.stateManager.close();
    }

    /**
     * Полная очистка состояния UI:
     * - остановка таймеров и анимаций
     * - удаление временных сообщений
     * - сброс формы
     * - скрытие всех элементов
     * - деактивация обработчиков
     *
     * Вызывается при уничтожении экземпляра чата.
     *
     * @example
     * ui.cleanup(); // Подготовка к удалению
     */
    cleanup() {
        // Остановить авто-приветствие (таймеры)
        this.innerTips?.reset?.();

        // Скрыть индикатор "печатает", если активен
        this.typingIndicator?.hide?.();

        // Сбросить форму ввода
        this.formHandler?.reset?.();

        // Очистить историю сообщений
        this.messages?.clearHistoryMessages?.();

        // Удалить приветствие-подсказку
        this.outerTips?.destroy?.();

        // Гарантировать, что чат закрыт
        if (this.isOpen()) {
            this.close();
        }
    }
}
