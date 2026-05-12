# Stage 2.7: Backend Modularization Start

This slice starts moving the backend from a single large `server/src/index.js` file toward a route/controller/service shape suitable for the 100k+ codebase plan.

Implemented:

- Added `server/src/http/requestContext.js`.
  - `requireUser`
  - `requireAdmin`
  - `getCaseForUser`
  - `findEvidenceForUser`
- Added `server/src/routes/analyticsRoutes.js`.
  - `GET /api/me/analytics`
  - `GET /api/expert/analytics`
  - `GET /api/admin/analytics`
- Wired `handleAnalyticsRoutes` into the main API router.
- Removed analytics endpoint handling from the main routing body.
- Added `server/src/routes/authRoutes.js`.
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/me`
  - `PATCH /api/me/profile`
- Wired `handleAuthRoutes` into the main API router.
- Removed auth/profile endpoint handling from the main routing body.
- Added `server/src/http/routing.js`.
  - `matchPath`
  - `filterCases`
  - `replaceCase`
  - `getTemplatesForCategory`
  - `sendBuffer`
- Added `server/src/routes/caseRoutes.js`.
  - `GET /api/cases`
  - `POST /api/cases`
  - `GET /api/cases/:id`
  - `PATCH /api/cases/:id`
  - `POST /api/cases/:id/actions`
  - `GET /api/cases/:id/audit`
  - `GET /api/cases/:id/completeness`
  - `GET /api/cases/:id/comments`
  - `POST /api/cases/:id/comments`
  - `GET /api/cases/:id/recommendations`
  - `POST /api/cases/:id/recommendations`
  - `GET /api/expert/cases`
- Added `server/src/routes/evidenceRoutes.js`.
  - `POST /api/cases/:id/evidence`
  - `GET /api/evidence/:id/download`
- Added `server/src/routes/documentRoutes.js`.
  - `GET /api/cases/:id/documents`
  - `POST /api/cases/:id/documents/generate`
  - `GET /api/cases/:id/package`
  - `GET /api/documents/:id/download`
- Wired case, evidence and document route modules into the main API router.
- Removed the corresponding route bodies and local routing helpers from `server/src/index.js`.
- Added `server/src/routes/notificationRoutes.js`.
  - `GET /api/notifications`
  - `PATCH /api/notifications/read-all`
  - `PATCH /api/notifications/:id/read`
- Added `server/src/routes/telegramRoutes.js`.
  - `POST /api/telegram/draft`
  - `POST /api/telegram/link`
  - `POST /api/telegram/webhook`
- Added `server/src/routes/adminRoutes.js`.
  - Route group dispatcher for admin modules.
- Added `server/src/routes/adminOpsRoutes.js`.
  - `GET /api/admin/stats`
  - `POST /api/admin/scheduler/run`
  - `POST /api/admin/notifications/dispatch`
  - `GET /api/admin/export`
  - `POST /api/admin/backup`
  - `GET /api/admin/audit`
  - `GET /api/admin/migration/postgres`
  - `GET /api/admin/migrations/postgres`
- Added `server/src/routes/adminUserRoutes.js`.
  - `GET /api/admin/users`
  - `PATCH /api/admin/users/:id/role`
- Added `server/src/routes/adminCaseRoutes.js`.
  - `GET /api/admin/cases`
  - `PATCH /api/admin/cases/:id/assign-expert`
- Added `server/src/routes/adminCategoryRoutes.js`.
  - `GET /api/admin/categories`
  - `PATCH /api/admin/categories/:id`
- Added `server/src/routes/adminTemplateRoutes.js`.
  - `GET /api/admin/templates`
  - `GET /api/admin/templates/:id/versions`
  - `POST /api/admin/templates/:id/restore`
  - `PATCH /api/admin/templates/:id`
- Added `server/src/routes/systemRoutes.js`.
  - `GET /api/health`
  - `GET /api/openapi`
  - `GET /api/diagnostics`
  - `GET /api/categories`
  - `POST /api/ai/analyze`
- `server/src/index.js` is now a composition root for route modules, static serving, rate limiting and server startup.

Next extraction order:

1. Start the next backend growth slice: repository interfaces for the future PostgreSQL migration.
2. Add DTO validation helpers before growing the API surface further.
3. Add route-level test organization that mirrors the extracted modules.
4. Add OpenAPI grouping tags that mirror the route modules.
5. Prepare the web client API layer to consume route groups through typed client functions.

Rule for future modularization:

- Move one route group at a time.
- Keep route handlers thin.
- Keep business logic in services.
- Keep access checks in `requestContext` and `rbacService`.
- Every extracted group must already have tests or receive tests in the same slice.
