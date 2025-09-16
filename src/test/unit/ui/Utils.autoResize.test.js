import { describe, test, expect, vi } from 'vitest';
import { Utils } from '@js/ui/utils';

describe('Utils > autoResize', () => {
    test('должен изменять высоту textarea в зависимости от содержимого', () => {
        const textarea = document.createElement('textarea');
        textarea.value = 'Long text\n'.repeat(10);
        document.body.appendChild(textarea);

        // Симулируем стили
        textarea.style.padding = '10px';
        textarea.style.border = '2px solid black';

        Utils.autoResize(textarea);

        const computed = window.getComputedStyle(textarea);
        const paddingTop = parseFloat(computed.paddingTop);
        const paddingBottom = parseFloat(computed.paddingBottom);
        const borderTop = parseFloat(computed.borderTopWidth);
        const borderBottom = parseFloat(computed.borderBottomWidth);
        const totalVertical = paddingTop + paddingBottom + borderTop + borderBottom;

        const expectedHeight = Math.min(textarea.scrollHeight - totalVertical, 120);
        const targetHeight = Math.max(40, expectedHeight);

        expect(parseInt(textarea.style.height)).toBe(targetHeight + totalVertical);
    });
});