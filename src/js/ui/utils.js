export class Utils {
    // Для предотвращения множественных вызовов
    static pendingScrolls = new WeakMap();

    static scrollToBottom(element) {
        if (!element) {
            return;
        }

        // Проверяем, есть ли уже запланированная прокрутка для этого элемента
        if (this.pendingScrolls.has(element)) {
            return; // Уже запланировано
        }

        // Помечаем, что прокрутка запланирована
        this.pendingScrolls.set(element, true);

        requestAnimationFrame(() => {
            element.scrollTop = element.scrollHeight;
            // Убираем пометку после выполнения
            this.pendingScrolls.delete(element);
        });
    }

    static autoResize(textarea) {
        if (!textarea) {
            return;
        }

        const MIN_HEIGHT = 40;
        const MAX_HEIGHT = 120;

        const style = window.getComputedStyle(textarea);
        const paddingTop = parseFloat(style.paddingTop);
        const paddingBottom = parseFloat(style.paddingBottom);
        const borderTop = parseFloat(style.borderTopWidth);
        const borderBottom = parseFloat(style.borderBottomWidth);

        const verticalPaddings = paddingTop + paddingBottom;
        const verticalBorders = borderTop + borderBottom;
        const totalVertical = verticalPaddings + verticalBorders;

        textarea.style.height = 'auto';

        const contentHeight = textarea.scrollHeight - totalVertical;
        const targetHeight = Math.max(MIN_HEIGHT, Math.min(contentHeight, MAX_HEIGHT));

        textarea.style.height = `${targetHeight + totalVertical}px`;
    }
}
