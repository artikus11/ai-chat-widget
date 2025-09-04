import { marked } from 'marked';
import { normalizeMarkdown, replaceBrWithSpan } from '../utils/markdown.js';
import { sanitizeHtml } from '../utils/sanitize.js';

/**
 * Класс для форматирования текстовых данных и ссылок для отображения в веб-интерфейсе
 * @class ResponseFormatter
 */
export default class ResponseFormatter {
    /**
     * Форматирует Markdown-текст в безопасный HTML
     * @param {string} text - Входной текст в формате Markdown
     * @returns {string} Отформатированный HTML-код
     * @example
     * const formatter = new ResponseFormatter();
     * const html = formatter.formatText('# Заголовок\nТекст');
     */
    formatText(text) {
        const cleaned = normalizeMarkdown(text);
        let html = marked.parse(cleaned);
        html = sanitizeHtml(html);
        html = replaceBrWithSpan(html);
        return html;
    }

    /**
     * Форматирует массив ссылок в HTML-список
     * @param {Array<Object>} links - Массив объектов ссылок
     * @param {string} links[].link - URL ссылки
     * @param {string} [links[].title] - Заголовок ссылки (опционально)
     * @returns {string} HTML-код списка ссылок
     * @example
     * const links = [
     *   { link: 'https://example.com', title: 'Пример' },
     *   { link: 'https://test.com' }
     * ];
     * const html = formatter.formatLinks(links);
     */
    formatLinks(links) {
        const linksHtml = links
            .map(item => {
                try {
                    const url = new URL(item.link.trim());
                    const title = item.title?.trim() || 'Подробнее...';
                    return `<li><a href="${url.href}" target="_blank" rel="noopener noreferrer">${title}</a></li>`;
                } catch {
                    return `<li><a href="#" onclick="event.preventDefault()">Ссылка</a></li>`;
                }
            })
            .join('');
        return `<ul class="links__list">${linksHtml}</ul>`;
    }
}
