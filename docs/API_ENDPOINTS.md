# ProblemOS API Endpoints

Current API surface for the self-contained MVP. The live machine-readable draft is also available at `GET /api/openapi`.

## Auth

- `POST /api/auth/register` - register a user and return a bearer token.
- `POST /api/auth/login` - log in and return a bearer token.
- `GET /api/me` - return current sanitized profile.
- `GET /api/me/analytics` - personal case, deadline, document and notification analytics.
- `PATCH /api/me/profile` - update name, phone and Telegram ID.

## Public Dictionaries

- `GET /api/categories` - categories, playbook questions, required evidence and case statuses.
- `POST /api/ai/analyze` - classify a free-form problem and extract facts.
- `POST /api/telegram/draft` - convert a free-form Telegram message into a case draft.

## Cases

- `GET /api/cases` - list cases visible to the current user. Users see their own cases, experts see assigned cases, admins see all.
- `POST /api/cases` - create a case from description, category and facts.
- `GET /api/cases/{id}` - get full case details.
- `PATCH /api/cases/{id}` - update owner/admin editable fields.
- `POST /api/cases/{id}/actions` - run workflow actions such as `mark_sent`, `start_escalation`, `close_case`.
- `GET /api/cases/{id}/audit` - case audit trail.
- `GET /api/cases/{id}/completeness` - readiness score and missing facts/evidence.

## Evidence

- `POST /api/cases/{id}/evidence` - attach metadata and optional base64 file payload.
- `GET /api/evidence/{id}/download` - download stored evidence file.

## Documents

- `GET /api/cases/{id}/documents` - generated documents and active templates for a case.
- `POST /api/cases/{id}/documents/generate` - generate a document from a template.
- `GET /api/documents/{id}/download?format=rtf|docx|pdf` - export generated document.
- `GET /api/cases/{id}/package?format=md|zip` - export case package.

## Collaboration

- `GET /api/cases/{id}/comments` - list case comments.
- `POST /api/cases/{id}/comments` - add a visible case comment.
- `GET /api/cases/{id}/recommendations` - list recommendations visible to the viewer.
- `POST /api/cases/{id}/recommendations` - admin or assigned expert creates a user-visible or internal recommendation.
- `GET /api/expert/cases` - expert/admin work queue.
- `GET /api/expert/analytics` - expert queue analytics and workload.

## Notifications

- `GET /api/notifications` - list notifications and run current user's deadline scan.
- `PATCH /api/notifications/read-all` - mark all notifications as read.
- `PATCH /api/notifications/{id}/read` - mark one notification as read.

## Admin

- `GET /api/admin/stats` - platform counters and case status distribution.
- `GET /api/admin/analytics` - platform analytics for categories, statuses, deadlines, documents and expert workload.
- `GET /api/diagnostics` - runtime, storage and data health.
- `POST /api/admin/scheduler/run` - run deadline scheduler.
- `POST /api/admin/notifications/dispatch` - dry-run or send Telegram notifications.
- `GET /api/admin/export` - full JSON export.
- `POST /api/admin/backup` - create JSON backup.
- `GET /api/admin/audit` - latest audit events.
- `GET /api/admin/users` - users with role and case counts.
- `PATCH /api/admin/users/{id}/role` - set `user`, `expert` or `admin`.
- `GET /api/admin/cases` - all cases with owner metadata.
- `PATCH /api/admin/cases/{id}/assign-expert` - assign or clear case expert.
- `GET /api/admin/categories` - editable playbooks.
- `PATCH /api/admin/categories/{id}` - update category questions, evidence checklist, route and deadlines.
- `GET /api/admin/templates` - document templates.
- `PATCH /api/admin/templates/{id}` - update template and create version snapshot.
- `GET /api/admin/templates/{id}/versions` - template version history.
- `POST /api/admin/templates/{id}/restore` - restore template from a version snapshot.
- `GET /api/admin/migration/postgres` - PostgreSQL migration draft.
