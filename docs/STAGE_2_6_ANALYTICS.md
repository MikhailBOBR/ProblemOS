# Stage 2.6: Analytics Layer

This slice adds the first real analytics layer for the 100k+ codebase plan.

Implemented:

- `analyticsService` as a dedicated backend service.
- Personal analytics: `GET /api/me/analytics`.
- Expert queue analytics: `GET /api/expert/analytics`.
- Platform analytics: `GET /api/admin/analytics`.
- Metrics for cases, statuses, categories, deadlines, documents, evidence, notifications and expert workload.
- Dashboard analytics blocks for users and experts.
- Admin analytics blocks for platform and expert workload.
- API tests covering user, expert and admin analytics responses.
- Endpoint documentation updates in `docs/API_ENDPOINTS.md` and `GET /api/openapi`.

Next planned slice:

1. Backend modularization: split `server/src/index.js` into route/controller modules.
2. Admin UI tabs: users, cases, analytics, templates, playbooks, diagnostics.
3. Template version restore UI.
4. Email notification adapter with dry-run and tests.
