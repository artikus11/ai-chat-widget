import { beforeEach, afterEach, vi } from 'vitest';
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Подключаем матчеры
expect.extend(matchers);

// Мок хранилища
const createStorageMock = () => {
    let storage = {};
    return {
        getItem: vi.fn((key) => storage[key] ?? null),
        setItem: vi.fn((key, value) => {
            storage[key] = String(value);
        }),
        removeItem: vi.fn((key) => {
            delete storage[key];
        }),
        clear: vi.fn(() => {
            storage = {};
        })
    };
};

// Мок requestAnimationFrame
global.requestAnimationFrame = (cb) => setTimeout(cb, 0);
global.cancelAnimationFrame = (id) => clearTimeout(id);

// Настройка моков перед каждым тестом
beforeEach(() => {
    global.localStorage = createStorageMock();
    global.sessionStorage = createStorageMock();
});

// Очистка после каждого теста
afterEach(() => {
    vi.clearAllMocks();
});