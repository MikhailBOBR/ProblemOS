# Stage 2.8: Repository And DTO Boundary

This slice prepares the local JSON MVP for a larger backend without changing the storage engine yet.

Implemented:

- Added `server/src/repositories/jsonRepositories.js`.
  - Users, sessions, cases, categories, document templates, generated documents, notifications, comments and recommendations now have a shared data access boundary.
  - The current implementation wraps the existing JSON data object.
  - The method names are intended to be mirrored by future PostgreSQL repositories.
- Added `server/src/repositories/index.js` as a provider selector.
- Added `server/src/repositories/postgresRepositories.js` as an explicit PostgreSQL adapter stub.
- Added `server/src/repositories/README.md` with the migration direction.
- Updated `server/src/http/requestContext.js` and `server/src/http/routing.js` to use repositories for common lookups and replacements.
- Updated key route modules to use repositories for high-frequency reads and writes.
- Added `server/src/http/validation.js`.
  - Object-only JSON payload guard.
  - String, number, boolean, array and object validators.
- Added `server/src/dto/requestDtos.js`.
  - Auth DTOs.
  - Case create/update/workflow DTOs.
  - Evidence and document DTOs.
  - Comment and expert recommendation DTOs.
  - Telegram DTOs.
  - Admin role, assignment, category and template DTOs.
- Updated OpenAPI tags to mirror route modules and admin submodules.
- Added tests:
  - `server/tests/repositories.test.js`
  - `server/tests/validation.test.js`
  - `server/tests/api-validation.test.js`

Why this matters:

- Route handlers can stay thin while the API grows.
- Storage migration can happen behind repository contracts.
- Request validation is centralized instead of scattered across controllers.
- The next PostgreSQL slice can add database-backed repositories without rewriting services first.

Next recommended slice:

1. Add repository methods for every remaining direct `data.*` access.
2. Add PostgreSQL repository stubs and a provider selector.
3. Split API tests by route group.
4. Add response DTO/presenter helpers for large responses.
5. Start typed frontend API client functions.
