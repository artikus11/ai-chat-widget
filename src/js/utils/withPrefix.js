/**
 * Префикс, используемый для именования классов, событий, атрибутов и других идентификаторов,
 * чтобы избежать конфликтов в глобальной области видимости.
 *
 * @type {string}
 * @private
 * @constant
 */
const PREFIX = 'aichat';

/**
 * Возвращает строку с добавлением префикса `aichat` к указанному ключу.
 * Полезно для формирования уникальных имён CSS-классов, данных-атрибутов, событий и т.д.
 *
 * @param {string} key - Ключ, к которому применяется префикс.
 * @param {string} [sep=':'] - Разделитель между префиксом и ключом. По умолчанию двоеточие.
 * @returns {string} Строка в формате `${PREFIX}${sep}${key}`.
 *
 * @example
 * withPrefix('container'); // → 'aichat:container'
 * withPrefix('open', '--'); // → 'aichat--open'
 * withPrefix('message', '_'); // → 'aichat_message'
 */
export default function withPrefix(key, sep = ':') {
    return `${PREFIX}${sep}${key}`;
}
