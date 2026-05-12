# Roadmap

## Phase 0. Product Skeleton

- [x] Описать категории MVP.
- [x] Сделать статусы и маршруты дел.
- [x] Запустить web + API без зависимостей.
- [x] Сформировать первый документ из шаблона.

## Phase 1. Strong MVP

- [ ] PostgreSQL-ready data model.
- [x] Безопасное файловое хранилище доказательств.
- [x] DOCX/PDF/RTF экспорты.
- [x] ZIP-пакет дела с документами, audit log и файлами доказательств.
- [x] Telegram webhook skeleton с командами `/start`, `/newcase`, `/mycases`, `/next`.
- [x] Профиль пользователя с привязкой Telegram ID.
- [ ] Email/Telegram уведомления о дедлайнах.
- [x] Audit log для ключевых действий по делу.
- [x] Workflow API для действий по делу.
- [x] Telegram polling runner через `TELEGRAM_BOT_TOKEN`.
- [x] Комментарии по делу.
- [x] Админские списки пользователей и дел.
- [x] Проверка полноты дела перед документом.

## Phase 2. Product Depth

- [ ] Workflow editor для админа.
- [ ] Версионирование шаблонов документов.
- [x] Проверка полноты дела по category playbook.
- [x] Скачать пакет дела архивом.
- [ ] Экспертные комментарии.
- [ ] Расширенная аналитика.

## Phase 3. AI Layer

- [ ] Подключить LLM provider через отдельный adapter.
- [ ] Извлечение фактов в структурированную схему.
- [ ] Нормализация текста официальным языком.
- [ ] Объяснение следующего шага.
- [ ] Guardrails: дисклеймеры, шаблоны, запрет обещаний результата.

## Phase 4. Production Hardening

- [ ] RBAC permissions.
- [ ] Rate limits.
- [ ] Backups.
- [ ] Observability.
- [ ] CI tests.
- [ ] Docker compose.
- [ ] Security review.
