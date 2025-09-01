import { marked } from 'marked';
import { normalizeMarkdown, replaceBrWithSpan } from '../utils/markdown.js';
import { sanitizeHtml } from '../utils/sanitize.js';

export default class ResponseFormatter {
    formatText(text) {
        const cleaned = normalizeMarkdown(text);
        let html = marked.parse(cleaned);
        html = sanitizeHtml(html);
        html = replaceBrWithSpan(html);
        return html;
    }

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
