# AI Chat Widget

Минималистичный чат-бот для сайтов. Работает с SSE, поддерживает автоприветствие, автоскролл, автосайз.

## Запуск

```bash
npm install
npm run dev
```

## Установка

### Через npm

```bash
npm install @artikus13/ai-chat-widget
```

Импортируйте в JavaScript:
```js
import AIChat from '@artikus13/ai-chat-widget';
```

### Через CDN (для быстрого подключения)

```html
<script src="https://unpkg.com/ai-chat-widget@latest/dist/chat.js"></script>
```

Используйте @1.0.0, чтобы зафиксировать версию:
https://unpkg.com/ai-chat-widget@1.0.0/dist/chat.js 

## Использование

1. Добавьте контейнер в HTML:

```html
<div id="ai-chat"></div>
```

2. Инициализируйте чат:

```js

        /**
         * Инициализация экземпляра AIChat с настройками.
         *
         * @config {Object} apiOptions — параметры подключения к API
         * @config {string} apiOptions.url — URL эндпоинта для отправки сообщений
         * @config {string} apiOptions.domain — домен для проверки CORS и логики
         * @config {boolean} apiOptions.debug — включить режим отладки (логи в консоль)
         *
         * @config {Object} messagesOptions — тексты системных сообщений
         * @config {Object} messagesOptions.greeting — приветствие при открытии
         * @config {Object} messagesOptions.followup — напоминание, если пользователь долго не пишет
         * @config {Object} messagesOptions.fallback — сообщение при сбое
         * @config {Object} messagesOptions.error — сообщение об ошибке
         * @config {Object} messagesOptions.invite — приглашение написать (если используется)
         * @config {Object} messagesOptions.reminder — напоминание (например, через N минут)
         * @config {Object} messagesOptions.encouragement — поддерживающее сообщение
         * @config {Object} messagesOptions.motivation — мотивационное сообщение
         *
         * @config {Object} themeOptions — визуальные настройки
         * @config {string} themeOptions.color — основной цвет (может использоваться в будущем)
         * @config {string} themeOptions.size — размер чата ('small', 'large')
         *
         * @config {Object} selectorsOptions — кастомизация селекторов (если нужно переопределить)
         * @config {string} selectorsOptions.container — селектор контейнера чата
         * @config {Object} selectorsOptions.selectors — объект селекторов для внутренних элементов
         * @config {Object} selectorsOptions.classes — кастомные CSS-классы
         *
         * @config {Object} delayOptions — временные задержки
         * @config {number} delayOptions.chatShowDelay — задержка показа чата после загрузки (в мс)
         * @config {number} delayOptions.toggleShowDelay — задержка перед появлением кнопки-тумблера
         */
        new AIChat({
            apiOptions: {
                url: 'https://site.com/api/chat', // API-эндпоинт для общения с ботом
                domain: 'varman.pro',                    // домен для логики и проверок
                debug: true                              // включить детальные логи в консоли
            },
            messagesOptions: {
                greeting: {
                    text: 'Привет! Я бот. Чем могу помочь?',
                    delay: 600                            // задержка перед показом приветствия
                },
                followup: {
                    text: 'Вы всё ещё думаете? Готова помочь!',
                    delay: 15000                          // 15 секунд бездействия
                },
                fallback: {
                    text: 'Что-то пошло не так, позвоните нам',
                    delay: 0                              // показывается сразу при ошибке
                },
                error: {
                    text: 'Что-то пошло не так, позвоните нам',
                    delay: 0
                },
                invite: {
                    text: '',
                    delay: 0
                },
                reminder: {
                    text: '',
                    delay: 0
                },
                encouragement: {
                    text: '',
                    delay: 0
                },
                motivation: {
                    text: '',
                    delay: 0
                }
            },
            themeOptions: {
                color: '#fff',
                size: 'large'
            },
            selectorsOptions: {
                container: '#chat-container',
                selectors: { /* Позволяет переопределять data-атрибуты или классы */ },
                classes: { /* Кастомные CSS-классы при необходимости */ }
            },
            delayOptions: {
                chatShowDelay: 5000,      // Показ чата через 5 секунд после загрузки
                toggleShowDelay: 1000     // Кнопка-тумблер появляется через 1 секунду
            }
        });
```
## Параметры

| Группа             | Параметр         | Тип     | По умолчанию | Описание |
|--------------------|------------------|---------|--------------|----------|
| **apiOptions**     | `url`            | string  | — (обязательный) | URL API-эндпоинта для отправки сообщений и получения ответов от бэкенда. |
|                    | `domain`         | string  | — (обязательный) | Домен, используемый для проверки CORS. |
|                    | `debug`          | boolean | `false`      | Включает режим отладки: выводит детальные логи в консоль браузера. |
| **messagesOptions**| `greeting.text`  | string  | `null`       | Текст приветственного сообщения, отображаемого при первом открытии чата. |
|                    | `greeting.delay` | number  | `600`        | Задержка (в мс) перед показом приветственного сообщения после открытия чата. |
|                    | `followup.text`  | string  | `null`       | Текст напоминания, если пользователь долго не отвечает. |
|                    | `followup.delay` | number  | `15000`      | Задержка (в мс) перед показом follow-up сообщения после последнего действия пользователя. |
|                    | `fallback.text`  | string  | `null`       | Текст резервного сообщения, показываемого при сбое обработки запроса. |
|                    | `fallback.delay` | number  | `0`          | Задержка (в мс) перед показом fallback-сообщения. `0` — показывается немедленно. |
|                    | `error.text`     | string  | `null`       | Текст сообщения об ошибке (например, при недоступности API). |
|                    | `error.delay`    | number  | `0`          | Задержка (в мс) перед показом сообщения об ошибке. |
|                    | `invite.text`    | string  | `""`         | Текст приглашения к общению (если используется). |
|                    | `invite.delay`   | number  | `0`          | Задержка перед показом приглашения (в мс). |
|                    | `reminder.text`  | string  | `""`         | Текст напоминания (например, через определённое время). |
|                    | `reminder.delay` | number  | `0`          | Задержка перед показом напоминания (в мс). |
|                    | `encouragement.text` | string | `""`       | Поддерживающее сообщение (например, "Продолжайте, вы молодец!"). |
|                    | `encouragement.delay`| number | `0`       | Задержка перед показом поддерживающего сообщения. |
|                    | `motivation.text`| string  | `""`         | Мотивационное сообщение (например, "Я верю в вас!"). |
|                    | `motivation.delay`| number | `0`         | Задержка перед показом мотивационного сообщения. |
| **themeOptions**   | `color`          | string  | `#fff`       | Основной цвет фона чат-окна (поддержка HEX, RGB и т.п.). |
|                    | `size`           | string  | `'large'`    | Размер интерфейса чата. Возможные значения: `'small'`, `'large'`. Влияет на шрифт и отступы. |
| **selectorsOptions**| `container`     | string  | `#chat-container` | CSS-селектор корневого контейнера чат-виджета. |
|                    | `selectors`      | object  | —            | Объект с кастомными data-атрибутами или селекторами для внутренних элементов (например, `textarea`, `sendButton`). |
|                    | `classes`        | object  | —            | Объект с кастомными CSS-классами для переопределения стилей (например, `header`, `message`). |
| **delayOptions**   | `chatShowDelay`  | number  | `5000`       | Задержка (в мс) перед автоматическим появлением чат-окна после загрузки страницы. |
|                    | `toggleShowDelay`| number  | `1000`       | Задержка (в мс) перед появлением кнопки-тумблера (иконки чата в нижнем правом углу). |


## Поддержка WordPress
Легко интегрируется в WordPress через wp_enqueue_script.

Пример: подключение в теме
Добавьте в functions.php вашей темы:

```php
function enqueue_ai_chat_widget() {
  wp_enqueue_script(
    'ai-chat-widget',
    'https://unpkg.com/ai-chat-widget@latest/dist/chat.js',
    array(),
    '1.0.0',
    true
  );

  // Инициализация чата
  wp_add_inline_script('ai-chat-widget', "
    document.addEventListener('DOMContentLoaded', function() {
      if (document.querySelector('#ai-chat')) {
        const chat = new AIChat({
          container: '#ai-chat',
          apiUrl: 'https://your-ai-api.com/chat', // ваш API endpoint
          greeting: 'Здравствуйте! Чем могу помочь?',
          streaming: true,
          theme: 'light'
        });
        chat.init();
      }
    });
  ");
}
add_action('wp_enqueue_scripts', 'enqueue_ai_chat_widget');
```

## Разработка

1. Клонируйте репозиторий

```bash
git clone https://github.com/artikus11/ai-chat-widget.git
cd ai-chat-widget
```

2. Установите зависимости

```bach
npm install
```

3. Запустите сервер разработки

```bash
npm run dev
```

## Форматирование текста

Пакет поддерживает Markdown (жирный, ссылки, списки и т.д.).

Использует:
- [marked](https://github.com/markedjs/marked) — для парсинга
- [DOMPurify](https://github.com/cure53/DOMPurify) — для защиты от XSS