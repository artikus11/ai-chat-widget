import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from 'node:process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ command }) => {
    const format = env.BUILD_FORMAT || 'es';

    return {
        root: 'demo',

        ...(command === 'serve' && {
            optimizeDeps: {
                include: ['dompurify', 'marked']
            }
        }),

        server: {
            host: '0.0.0.0',        // слушать все интерфейсы
            port: 3000,
            strictPort: true,
            // Дополнительно: разрешить CORS, если нужно
            cors: true,
        },

        build: {
            outDir: path.resolve(__dirname, 'dist'),
            emptyOutDir: false,

            lib: {
                entry: path.resolve(__dirname, 'src/js/index.js'),
                name: 'AIChat',
                formats: [format],
                fileName: () => {
                    return format === 'umd' ? 'chat.js' : 'chat.es.js';
                }
            },
            cssCodeSplit: true,
            rollupOptions: {
                output: {
                    assetFileNames: (assetInfo) => {
                        if (assetInfo.name?.endsWith('.css')) {
                            return 'chat.css';
                        }
                        return 'assets/[name]-[hash][extname]';
                    }
                }
            }
        },

        css: {
            preprocessorOptions: {
                scss: {
                    api: 'modern',
                    silenceDeprecations: ['legacy-js-api'],
                    includePaths: [path.resolve(__dirname, 'src/scss')]
                }
            }
        },

        resolve: {
            alias: {
                '@js': path.resolve(__dirname, 'src/js'),
                '@scss': path.resolve(__dirname, 'src/scss')
            }
        }
    };
});