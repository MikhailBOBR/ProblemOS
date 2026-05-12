# ProblemOS Project State

Дата старта: 2026-05-12

## Текущий этап

Этап 2.2. Стабилизация модели данных под будущий большой стек.

Фокус: отдельный audit log, профиль пользователя с Telegram ID, schema-документация и Telegram polling runner.

## Уже сделано

- Самодостаточный Node.js HTTP API + статический web-интерфейс + JSON storage.
- Категории MVP: возврат товара, ЖКХ, некачественная услуга.
- Регистрация, вход, роли, дела, доказательства, документы, уведомления, админка.
- Генерация RTF-документов по шаблонам.
- Пакет дела в Markdown.
- Файловое хранилище доказательств в `server/data/uploads`.
- Проверка MIME-типов, лимит размера, безопасные имена файлов, SHA-256 и защищенное скачивание `/api/evidence/:id/download`.
- `workflowService` и API `/api/cases/:id/actions`.
- Workflow-действия: `complete_current_step`, `mark_sent`, `mark_deadline_missed`, `start_escalation`, `close_case`, `reopen_case`.
- Telegram API `/api/telegram/link` и `/api/telegram/webhook`.
- Telegram-команды `/start`, `/help`, `/mycases`, `/next`, `/newcase описание`.

## Сделано в текущем шаге

- Добавлен `auditLogService` и отдельная коллекция `auditLogs`.
- Store получил нормализацию старых JSON-данных: новые поля добавляются без ручной миграции.
- Audit log пишется для регистрации, входа, обновления профиля, создания дела, загрузки доказательства, генерации документа, workflow-действий, Telegram-действий и правки шаблонов.
- Добавлены API `/api/cases/:id/audit` и `/api/admin/audit`.
- Добавлен профиль пользователя в web-интерфейсе.
- Добавлен API `/api/me/profile` для ФИО, телефона и Telegram ID.
- Telegram handler вынесен в `telegramService`, чтобы его использовали webhook и polling runner.
- Добавлен `server/src/telegram/pollingRunner.js` для запуска через `TELEGRAM_BOT_TOKEN`.
- Админка шаблонов показывает переменные `{{...}}` и подсказку по заполнению.
- Добавлен `docs/DATA_SCHEMA.md` с PostgreSQL/Django-compatible схемой.
- Расширены тесты профилем и audit log.

## Ближайший следующий шаг

Этап 2.3. Документы и пакеты дела:

1. Сделать настоящий DOCX exporter без внешних зависимостей или через легкую библиотеку после установки зависимостей.
2. Добавить PDF export как второй формат.
3. Сформировать ZIP-пакет дела: описание, timeline, audit, документы и файлы доказательств.
4. Добавить выбор шаблона при генерации документа в UI.
5. Добавить предпросмотр полноты дела: каких фактов и доказательств не хватает перед документом.

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
