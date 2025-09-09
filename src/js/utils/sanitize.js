import DOMPurify from 'dompurify';

/**
 * Очищает HTML от XSS-уязвимостей
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHtml(html) {
    return DOMPurify.sanitize(html);
}

/**
 * Расширенная настройка DOMPurify (опционально)
 * Например, разрешить определённые атрибуты
 */
export function configureSanitizer() {
    DOMPurify.setConfig({
        ALLOWED_TAGS: [
            'p',
            'br',
            'hr',
            'h1',
            'h2',
            'h3',
            'h4',
            'h5',
            'h6',
            'strong',
            'b',
            'em',
            'i',
            'u',
            'del',
            'code',
            'pre',
            'blockquote',
            'ul',
            'ol',
            'li',
            'a',
            'img',
            'table',
            'thead',
            'tbody',
            'tfoot',
            'tr',
            'th',
            'td',
            'span',
        ],
        ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'title', 'class'],
        ADD_TAGS: ['span'],
        ADD_ATTR: ['target', 'rel'],
    });

    DOMPurify.removeAllHooks();

    DOMPurify.addHook('afterSanitizeAttributes', node => {
        if (node.tagName === 'A' && node.target === '_blank') {
            node.setAttribute('rel', 'noopener noreferrer');
        }

        if (node.tagName === 'IMG') {
            const src = node.getAttribute('src');
            if (
                !src ||
                (!src.startsWith('https://') &&
                    !src.startsWith('data:image/') &&
                    !src.startsWith('blob:'))
            ) {
                node.removeAttribute('src');
            }
        }
    });
}
