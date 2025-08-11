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
const chat = new AIChat({
  container: '#ai-chat',
  apiUrl: 'https://your-ai-api.com/chat',
  greeting: 'Привет! Чем могу помочь?',
  placeholder: 'Напишите сообщение...',
  streaming: true,
  theme: 'light'
});

chat.init();
```
## Параметры

| Параметр    | Тип     | По умолчанию | Описание                     |
|-------------|---------|--------------|------------------------------|
| container   | string  | — (обязательный) | CSS-селектор контейнера      |
| apiUrl      | string  | — (обязательный) | URL вашего API               |
| greeting    | string  | null         | Приветственное сообщение     |
| placeholder | string  | "Спросите что-нибудь" | Текст-подсказка в поле ввода |
| streaming   | boolean | true         | Включить потоковый вывод     |
| autoFocus   | boolean | true         | Автофокус на поле ввода      |
| maxHeight   | number  | 400          | Максимальная высота контейнера |
| theme       | string  | "light"      | Тема оформления (light/dark) |


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