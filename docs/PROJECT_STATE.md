# ProblemOS Project State

Дата старта: 2026-05-12

## Текущий этап

Этап 2.3. Документы, пакеты дела и расширенный backend API.

Фокус: документы должны выгружаться в нескольких форматах, дело должно скачиваться архивом вместе с доказательствами, а backend должен поддерживать рабочие процессы админа/эксперта.

## Уже сделано

- Самодостаточный Node.js HTTP API + статический web-интерфейс + JSON storage.
- Категории MVP: возврат товара, ЖКХ, некачественная услуга.
- Регистрация, вход, роли, профиль, привязка Telegram ID.
- Дела, статусы, workflow actions, доказательства, документы, уведомления.
- Файловое хранилище доказательств в `server/data/uploads`.
- SHA-256, MIME-проверки, лимиты, безопасные имена файлов.
- Audit log как отдельная коллекция `auditLogs`.
- Telegram webhook и polling runner через `TELEGRAM_BOT_TOKEN`.
- PostgreSQL/Django-compatible схема в `docs/DATA_SCHEMA.md`.

## Сделано в текущем шаге

- Добавлен ZIP writer без внешних зависимостей.
- Добавлен DOCX exporter без внешних зависимостей.
- Добавлен простой PDF exporter.
- `/api/documents/:id/download?format=rtf|docx|pdf`.
- `/api/cases/:id/package?format=zip` собирает архив дела.
- ZIP-пакет включает `summary.md`, timeline, audit log, индекс документов, индекс доказательств, RTF-документы и реальные файлы доказательств.
- Добавлен `completenessService`.
- `/api/cases/:id/completeness` показывает готовность дела, недостающие факты, доказательства и доступные шаблоны.
- Карточка дела показывает готовность, недостающие данные, выбор шаблона и скачивание RTF/DOCX/PDF.
- Добавлены комментарии по делу: `/api/cases/:id/comments`.
- Комментарии отображаются в карточке дела и пишутся в audit log.
- Добавлены фильтры `/api/cases?status=&categoryId=&priority=&q=`.
- Добавлены админские списки `/api/admin/users` и `/api/admin/cases`.
- Расширены тесты на DOCX/PDF/ZIP, completeness, комментарии, фильтры и админские endpoints.

## Ближайший следующий шаг

Этап 2.4. Уведомления, фоновые задачи и production-hardening:

1. Добавить scheduler для дедлайнов: генерация уведомлений по срокам.
2. Добавить read/unread UX и массовое прочтение уведомлений.
3. Добавить Telegram-отправку уведомлений по дедлайнам.
4. Добавить rate limit для auth/API.
5. Добавить backup/export JSON storage и health diagnostics.
6. Подготовить Dockerfile/docker-compose.

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
