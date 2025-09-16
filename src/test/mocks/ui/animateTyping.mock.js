import { vi } from 'vitest';
import { Utils } from '@js/ui/utils';

/**
 * Создаёт мок для Utils.animateTyping
 * @returns {{ animation: object, utilsMock: object }}
 */
export const createAnimationMock = () => {
    const mockAnimation = {
        on: vi.fn(),
        emit: vi.fn(),
        stop: vi.fn()
    };

    const utilsMock = {
        Utils: {
            animateTyping: vi.fn().mockReturnValue(mockAnimation),
            // Все остальные методы — пустые, но не сломанные
            scrollToBottom: () => { },
            autoResize: () => { },
            updateChatHeight: () => { },
            getRandomSpeed: (speed) => speed
        }
    };

    return { mockAnimation, utilsMock };
};