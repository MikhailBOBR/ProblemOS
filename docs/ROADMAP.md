# Roadmap

## Phase 0. Product Skeleton

- [x] Описать категории MVP.
- [x] Сделать статусы и маршруты дел.
- [x] Запустить web + API без зависимостей.
- [x] Сформировать первый документ из шаблона.

## Phase 1. Strong MVP

- [ ] PostgreSQL-ready data model.
- [x] Безопасное файловое хранилище доказательств.
- [ ] Настоящие DOCX/PDF экспорты.
- [x] Telegram webhook skeleton с командами `/start`, `/newcase`, `/mycases`, `/next`.
- [ ] Email/Telegram уведомления о дедлайнах.
- [ ] Audit log для всех действий по делу.
- [x] Workflow API для действий по делу.

## Phase 2. Product Depth

- [ ] Workflow editor для админа.
- [ ] Версионирование шаблонов документов.
- [ ] Проверка полноты дела по category playbook.
- [ ] Скачать пакет дела архивом.
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
