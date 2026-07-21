# Wedding Album

React/TypeScript приложение для свадебного QR-альбома: гости загружают фото,
видят общую галерею, а организатор выгружает все снимки ZIP-архивом.

## Стек

- React + TypeScript + Vite
- Supabase Storage для файлов
- Supabase Postgres для метаданных
- GitHub Pages для фронта

## Локальный запуск

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Настройка Supabase

1. Создай проект в Supabase.
2. Открой SQL Editor.
3. Выполни содержимое `supabase.sql`.
4. Открой Project Settings -> API.
5. Скопируй `Project URL` и publishable key в `.env.local`.

Пример:

```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
VITE_SUPABASE_BUCKET=wedding-photos
VITE_ALBUM_ID=main
VITE_COUPLE_NAMES=Аня & Максим
VITE_ADMIN_PIN=1234
```

## Важное про админку

GitHub Pages отдает только статический фронт. Это значит, что настоящий секрет
или server-side права администратора там хранить нельзя.

В текущем MVP:

- гости публично загружают фото;
- гости публично смотрят альбом;
- `/admin` закрыт PIN для удобства, но это не криптографическая защита;
- админка умеет скачать все фото ZIP-архивом;
- удаление выключено по умолчанию.

Если нужно безопасное удаление из админки, добавь позже Supabase Edge Function
или небольшой backend, где будет храниться service role key.

## GitHub Pages

Для repo `wedding-album` собери проект так:

```bash
VITE_BASE_PATH=/wedding-album/ npm run build
```

Затем публикуй папку `dist` через GitHub Pages. Удобный вариант - GitHub
Actions, который собирает проект и деплоит `dist`.

## QR-код

QR должен вести на публичный URL альбома, например:

```text
https://username.github.io/wedding-album/
```

Приложение использует hash-router, поэтому прямые ссылки на админку выглядят
так:

```text
https://username.github.io/wedding-album/#/admin
```
