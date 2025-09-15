import { defineConfig } from 'vitest/config';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    // Алиасы работают и в тестах
    resolve: {
        alias: {
            '@js': path.resolve(__dirname, 'src/js'),
            '@test': path.resolve(__dirname, 'src/test'), // добавим алиас для тестов!
            '@scss': path.resolve(__dirname, 'src/scss')
        }
    },
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/test/setup.js'], // обновлённый путь
        include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: [
            '**/node_modules/**',
            '**/dist/**',
            '**/demo/**',
            '**/cypress/**',
            '**/.{idea,git,cache,output,temp}/**'
        ],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                'demo/',
                '**/*.config.*',
                'src/test/**',        // не включаем тесты в coverage
                'src/test/mocks/**'
            ]
        },
        resolve: {
            alias: {
                '@js': path.resolve(__dirname, 'src/js'),
                '@scss': path.resolve(__dirname, 'src/scss')
            }
        }
    }
});