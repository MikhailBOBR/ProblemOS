# ProblemOS Project State

Дата старта: 2026-05-12

## Текущий этап

Этап 2.4. Уведомления, фоновые задачи и production-hardening.

Фокус: дедлайны должны превращаться в постоянные уведомления, админ должен видеть состояние системы, а проект должен быть готов к запуску в контейнере.

## Уже сделано

- Самодостаточный Node.js HTTP API + статический web-интерфейс + JSON storage.
- Категории MVP: возврат товара, ЖКХ, некачественная услуга.
- Регистрация, вход, роли, профиль, привязка Telegram ID.
- Дела, статусы, workflow actions, доказательства, документы, уведомления.
- Файловое хранилище доказательств в `server/data/uploads`.
- Audit log как отдельная коллекция `auditLogs`.
- Telegram webhook и polling runner через `TELEGRAM_BOT_TOKEN`.
- DOCX/PDF/RTF export.
- ZIP-пакет дела с документами, audit log и файлами доказательств.
- Проверка полноты дела.
- Комментарии по делу.
- Админские списки пользователей и дел.

## Сделано в текущем шаге

- Добавлен `schedulerService`: дедлайны создают постоянные уведомления без дублей.
- `/api/notifications` запускает пользовательский deadline scan и возвращает `unread`.
- Добавлено массовое прочтение `/api/notifications/read-all`.
- Добавлен Telegram delivery service с dry-run и реальной отправкой через `TELEGRAM_BOT_TOKEN`.
- Добавлен `/api/admin/scheduler/run`.
- Добавлен `/api/admin/notifications/dispatch`.
- Добавлен `/api/diagnostics` для админа.
- Добавлен `/api/admin/export` для JSON export.
- Добавлен `/api/admin/backup` для backup файла в `server/data/backups`.
- Добавлен in-memory rate limiter для API/auth.
- Добавлен standalone runner `server/src/jobs/deadlineScheduler.js`.
- Добавлены `Dockerfile`, `docker-compose.yml`, `.dockerignore`.
- Web-интерфейс получил read/unread уведомлений и админские операции: scheduler, Telegram dry-run, backup, export, diagnostics.
- Расширены тесты: scheduler, notification read-all, Telegram dispatch dry-run, diagnostics, export, backup, rate limit.

## Ближайший следующий шаг

Этап 2.5. Production polish и расширение ролей:

1. Добавить RBAC permissions helper вместо разрозненных проверок.
2. Добавить роли `expert` и экспертные рекомендации.
3. Добавить версионирование шаблонов документов.
4. Добавить редактор workflow/playbook в админке.
5. Добавить OpenAPI-like описание endpoints.
6. Добавить миграционный слой JSON -> PostgreSQL schema draft.

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
