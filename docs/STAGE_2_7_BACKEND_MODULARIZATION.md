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
- Kept compatibility wrappers in `index.js` for existing case/document/evidence routes. These wrappers should disappear gradually as more route modules are extracted.

Next extraction order:

1. `routes/authRoutes.js` for register/login/profile.
2. `routes/caseRoutes.js` for case list/detail/update/actions.
3. `routes/evidenceRoutes.js` for upload/download.
4. `routes/documentRoutes.js` for templates, generation and exports.
5. `routes/adminRoutes.js` split further into admin users, cases, templates, categories and operations.
6. `routes/telegramRoutes.js` for webhook/link/draft.

Rule for future modularization:

- Move one route group at a time.
- Keep route handlers thin.
- Keep business logic in services.
- Keep access checks in `requestContext` and `rbacService`.
- Every extracted group must already have tests or receive tests in the same slice.
