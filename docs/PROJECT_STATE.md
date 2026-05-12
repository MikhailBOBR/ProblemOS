# ProblemOS Project State

Дата старта: 2026-05-12

## Текущий этап

Этап 2. Усиление backend-модели и превращение MVP из набора экранов в систему ведения дела.

Фокус: доказательства должны храниться как настоящие файлы, статусы должны меняться через workflow engine, а Telegram должен иметь понятную точку входа для будущего polling/webhook.

## Сделано в предыдущем шаге

- Собран самодостаточный Node.js HTTP API + статический web-интерфейс + JSON storage.
- Добавлены категории MVP: возврат товара, ЖКХ, некачественная услуга.
- Реализованы регистрация, вход, роли, дела, доказательства, документы, уведомления, админка.
- Добавлена генерация RTF-документов по шаблонам.
- Добавлен пакет дела в Markdown.

## Сделано в этом шаге

- Добавлен `fileStorageService`: доказательства теперь сохраняются в `server/data/uploads`, а JSON хранит только индекс файла.
- Добавлены проверка MIME-типов, лимит размера, безопасные имена файлов, SHA-256 хэш и защищенное скачивание `/api/evidence/:id/download`.
- Добавлен `workflowService`: действия `complete_current_step`, `mark_sent`, `mark_deadline_missed`, `start_escalation`, `close_case`, `reopen_case`.
- Добавлен API `/api/cases/:id/actions`.
- Web-карточка дела получила workflow-кнопки и скачивание файлов доказательств.
- Telegram layer расширен до `/api/telegram/link` и `/api/telegram/webhook`.
- Telegram webhook умеет команды `/start`, `/help`, `/mycases`, `/next`, `/newcase описание`.
- Расширены тесты: файл, скачивание, workflow, запрет чужого доступа, Telegram-создание дела.

## Ближайший следующий шаг

Этап 2.2. Стабилизировать модель данных под будущий большой стек:

1. Добавить `schema`-документацию и PostgreSQL/Django-compatible модели.
2. Добавить audit log как отдельную сущность, а не только timeline внутри дела.
3. Сделать профиль пользователя с привязкой Telegram ID в интерфейсе.
4. Добавить document template variables UI: админ должен видеть переменные и пример заполнения.
5. Подготовить реальный Telegram polling runner через переменную `TELEGRAM_BOT_TOKEN`.

## Принцип развития

Каждый шаг оставляет проект запускаемым:

```text
domain -> API -> UI -> tests -> docs
```

## Архитектурная цель

Финальная версия может быть мигрирована в:

```text
Frontend: Next.js + TypeScript
Backend: Django + DRF или NestJS
DB: PostgreSQL
Storage: S3/MinIO
Bot: aiogram или Telegraf
Queue: Redis + Celery/BullMQ
AI: OpenAI-compatible provider через отдельный AI layer
```
