import { defaultClasses } from './config';
import { Elements } from './Elements';
import { MessageHandler } from './handlers/MessageHandler';
import { FormHandler } from './handlers/FormHandler';
import { StateHandler } from './handlers/StateHandler';
import { TypingIndicatorHandler } from './handlers/TypingIndicatorHandler';
import { AutoGreetingHandler } from './handlers/AutoGreetingHandler';

/**
 * Основной класс пользовательского интерфейса чата.
 * Отвечает за управление элементами UI, обработку событий и взаимодействие с провайдером сообщений.
 *
 * @class UI
 */
export default class UI {
    /**
     * Создаёт экземпляр UI.
     * @param {HTMLElement} container - DOM-элемент, в котором будет отображаться чат.
     * @param {Object} messagesProvider - Объект, предоставляющий методы для работы с сообщениями.
     * @param {Object} [options={}] - Дополнительные опции конфигурации.
     * @param {Object} [options.classes] - Пользовательские CSS-классы.
     * @param {Object} [options.selectors] - Селекторы для поиска элементов внутри контейнера.
     */
    constructor(container, messagesProvider, options = {}) {
        this.classes = { ...defaultClasses, ...(options.classes || {}) };
        this.elements = new Elements(container, options.selectors);
        this.messagesProvider = messagesProvider;

        this.abortController = new AbortController();

        this.messageHandler = new MessageHandler(this.elements.messages, this.classes, options);
        this.formHandler = new FormHandler(this.elements, this.abortController);
        this.stateHandler = new StateHandler(this.elements, this.classes, this.abortController);
        this.typingIndicatorHandler = new TypingIndicatorHandler(this.elements.messages, this.classes);
        this.autoGreetingHandler = new AutoGreetingHandler(this, messagesProvider, this.elements.messages);
    }

    /**
     * Привязывает обработчики событий к форме и состоянию чата.
     * @param {Function} onSubmit - Функция, вызываемая при отправке формы.
     * @param {Function} onToggle - Функция, вызываемая при переключении состояния чата (открытие/закрытие).
     */
    bindEvents(onSubmit, onToggle) {
        this.formHandler.bindEvents(onSubmit);
        this.stateHandler.bindEvents(onToggle);
    }

    /**
     * Отвязывает все обработчики событий.
     * Должен вызываться при уничтожении чата.
     */
    unbindEvents() {
        this.abortController.abort();
        this.abortController = new AbortController();
    }

    /**
     * Переключает состояние чата: открывает, если закрыт, и наоборот.
     * При открытии запускает автоматическое приветствие, при закрытии — отменяет его.
     */
    toggle() {
        if (this.isOpen()) {
            this.close();
            this.autoGreetingHandler.cancel();
        } else {
            this.open();
            this.autoGreetingHandler.start();
        }
    }

    /**
     * Добавляет новое сообщение в чат.
     * @param {...any} args - Аргументы, передаваемые в обработчик сообщений.
     * @returns {any} Результат выполнения метода addMessage у MessageHandler.
     */
    addMessage(...args) {
        return this.messageHandler.addMessage(...args);
    }

    /**
     * Показывает индикатор печати (например, "Пользователь печатает...").
     */
    showTyping() {
        this.typingIndicatorHandler.show();
    }

    /**
     * Обновляет состояние индикатора печати.
     * @param {...any} args - Аргументы для обновления индикатора.
     */
    updateTyping(...args) {
        this.typingIndicatorHandler.update(...args);
    }

    /**
     * Скрывает индикатор печати.
     */
    hideTyping() {
        this.typingIndicatorHandler.hide();
    }

    /**
     * Преобразует индикатор печати в обычное сообщение.
     */
    finalizeTypingAsMessage() {
        this.typingIndicatorHandler.finalizeAsMessage();
    }

    /**
     * Блокирует форму ввода (например, во время отправки сообщения).
     */
    disabledForm() {
        this.formHandler.disable();
    }

    /**
     * Разблокирует форму ввода.
     */
    enableForm() {
        this.formHandler.enable();
    }

    /**
     * Проверяет, открыт ли чат.
     * @returns {boolean} true, если чат открыт, иначе false.
     */
    isOpen() {
        return this.stateHandler.isOpen();
    }

    /**
     * Открывает чат.
     */
    open() {
        this.stateHandler.open();
    }

    /**
     * Закрывает чат.
     */
    close() {
        this.stateHandler.close();
    }

    /**
     * Полная очистка состояния UI: таймеры, DOM, состояние формы.
     * Вызывается при уничтожении чата.
     */
    cleanup() {
        // 1. Остановить авто-приветствие (таймеры)
        this.autoGreetingHandler?.reset?.();

        // 2. Скрыть индикатор "печатает", если активен
        this.typingIndicatorHandler?.hide?.();

        // 3. Очистить форму ввода
        this.formHandler?.reset?.();

        //4. Очистить историю сообщений
        this.messageHandler?.clearHistoryMessages?.();

        // 5. Скрыть чат, если открыт
        if (this.isOpen()) {
            this.close();
        }
    }
}
