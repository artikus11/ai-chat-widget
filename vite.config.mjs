import { defineConfig } from 'vite';

export default defineConfig({
    root: 'demo', // папка с демо-страницей
    server: {
        port: 3000,
        open: true
    },
    build: {
        outDir: '../dist', // собираем в корневую dist
        emptyOutDir: true,
        rollupOptions: {
            input: 'src/js/index.js', // точка входа — index.js в js/
            output: {
                format: 'umd',
                name: 'AIChat',
                entryFileNames: 'chat.js' // выход: dist/chat.js
            }
        }
    },
    css: {
        preprocessorOptions: {
            scss: {
                api: 'modern', // ← ключевая строка: используем современный API
                silenceDeprecations: ['legacy-js-api'], // ← убираем предупреждение
                includePaths: ['src/scss']
            }
        }
    },
    resolve: {
        alias: {
            '@js': '/src/js',
            '@scss': '/src/scss'
        }
    }
});
