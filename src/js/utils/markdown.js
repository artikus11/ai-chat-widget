/**
 * Нормализует Markdown-текст перед парсингом
 * @param {string} text
 * @returns {string}
 */
export function normalizeMarkdown(text) {
    return (
        text
            // Исправление пробелов в URL
            .replace(/https\s*?:\s*?\/\s*?\/\s*?/g, 'https://')
            // Фикс заголовков с жирным шрифтом
            .replace(/^(#{1,3})\s*(.+?)\s*-\s*(\*\*.+?\*\*:)/gm, '$1 $2\n\n-$3')
            // Добавление пробела после URL
            .replace(/(https?:\/\/[^\s]+)(?=[^\s])/g, '$1 ')
            // Пробел перед URL
            .replace(/([^\s])(https?:\/\/)/g, '$1 $2')
            // Удаление тегов [LINK][/LINK]
            .replace(/\[LINK\]\[\/LINK\]/g, '')
            // Фикс заголовков типа "### Тема -"
            .replace(/^(#{3})\s*(.+?)\s*-\s*/gm, '### $2\n\n')
            // Замена множественных переносов
            .replace(/\n{3,}/g, '\n\n')
            .trim()
    );
}

/**
 * Добавляет span-обёртки вместо <br> для стилизации
 * @param {string} html
 * @returns {string}
 */
export function replaceBrWithSpan(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const paragraphs = doc.querySelectorAll('p');

    paragraphs.forEach(p => {
        p.innerHTML = p.innerHTML.replace(
            /<br\s*\/?>/g,
            '<span class="line-break"></span>'
        );
    });

    return doc.body.innerHTML;
}
