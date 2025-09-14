import EventEmitter from './EventEmitter';

/**
 * Глобальный экземпляр EventEmitter, используемый как централизованный шиной событий (event bus).
 *
 * Позволяет различным частям приложения подписываться на события, отправлять и получать сообщения
 * без необходимости прямой зависимости между ними. Полезен для реализации шаблона "наблюдатель"
 * в системах с loosely coupled компонентами.
 *
 * @type {EventEmitter}
 * @example
 * // Подписка на событие
 * EventBus.on('user:login', (userData) => {
 *   console.log('Пользователь вошёл:', userData);
 * });
 *
 * // Генерация события
 * EventBus.emit('user:login', { id: 123, name: 'John Doe' });
 *
 * @example
 * // Однократная подписка
 * EventBus.once('app:init', () => {
 *   console.log('Приложение инициализировано');
 * });
 *
 * @example
 * // Отписка от события
 * const handler = () => { ... };
 * EventBus.off('data:update', handler);
 */
const EventBus = new EventEmitter();

export default EventBus;
