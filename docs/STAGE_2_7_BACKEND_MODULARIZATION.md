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

Next extraction order:

1. `routes/caseRoutes.js` for case list/detail/update/actions.
2. `routes/evidenceRoutes.js` for upload/download.
3. `routes/documentRoutes.js` for templates, generation and exports.
4. `routes/adminRoutes.js` split further into admin users, cases, templates, categories and operations.
5. `routes/telegramRoutes.js` for webhook/link/draft/link.

Rule for future modularization:

- Move one route group at a time.
- Keep route handlers thin.
- Keep business logic in services.
- Keep access checks in `requestContext` and `rbacService`.
- Every extracted group must already have tests or receive tests in the same slice.
