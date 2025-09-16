import { describe, test, expect } from 'vitest';
import { Utils } from '@js/ui/utils';

describe('Utils > getRandomSpeed', () => {
    test('должен возвращать значение в диапазоне [speed - variation, speed + variation]', () => {
        for (let i = 0; i < 100; i++) {
            const result = Utils.getRandomSpeed(40, 10);
            expect(result).toBeGreaterThanOrEqual(30);
            expect(result).toBeLessThanOrEqual(50);
        }
    });

    test('работает с custom variation', () => {
        const result = Utils.getRandomSpeed(50, 5);
        expect(result).toBeGreaterThanOrEqual(45);
        expect(result).toBeLessThanOrEqual(55);
    });
});