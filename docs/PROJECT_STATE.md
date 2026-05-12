# ProblemOS Project State

Start date: 2026-05-12

## Current Stage

Stage 2.8. Repository and DTO boundary after backend modularization.

Focus: keep the JSON MVP working while introducing the backend boundaries needed for PostgreSQL, typed request validation and a much larger route surface.

## Already Implemented

- Self-contained Node.js HTTP API, static web UI and JSON storage.
- MVP categories: product return, housing/utilities problem and poor service.
- Registration, login, roles, profile and Telegram ID linking.
- Case lifecycle: statuses, workflow actions, comments, audit log, expert assignment and recommendations.
- Evidence upload/download with local file storage.
- Document generation from templates with RTF/DOCX/PDF export.
- Markdown and ZIP case package export.
- Case completeness checks and "what to do next" logic.
- In-app notifications, deadline scheduler and Telegram notification dispatch dry-run.
- Admin statistics, analytics, diagnostics, backup, export and PostgreSQL migration draft.
- Route modules for system, auth, analytics, cases, evidence, documents, notifications, Telegram and admin.
- Admin route submodules for ops, users, cases, categories and templates.
- Repository boundary over JSON data for the future PostgreSQL adapter.
- Repository provider selector with an explicit PostgreSQL adapter stub.
- DTO validation helpers for request payloads.

## Current Slice

- Added `server/src/repositories/jsonRepositories.js`.
- Added `server/src/repositories/index.js`.
- Added `server/src/repositories/postgresRepositories.js`.
- Added `server/src/http/validation.js`.
- Added `server/src/dto/requestDtos.js`.
- Updated request context, routing helpers and key routes to use repositories and DTOs.
- Updated OpenAPI tags to match the route-module structure.
- Added repository, DTO and API validation tests.

## Next Step

Stage 2.9 should continue backend scaling:

1. Add repository methods for remaining direct `data.*` access.
2. Add PostgreSQL repository stubs and provider selector.
3. Split API tests by route group.
4. Add response DTO/presenter helpers for large payloads.
5. Start typed frontend API client functions.

## Development Principle

Every step keeps the project runnable:

```text
domain -> DTO -> repository -> API -> UI -> tests -> docs
```

## Long-Term Architecture Target

```text
Frontend: Next.js + TypeScript
Backend: Django + DRF or NestJS
DB: PostgreSQL
Storage: S3/MinIO
Bot: aiogram or Telegraf
Queue: Redis + Celery/BullMQ
AI: OpenAI-compatible provider through an isolated AI layer
```
