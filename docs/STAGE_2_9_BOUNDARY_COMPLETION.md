# Stage 2.9: Boundary Completion And Web API Client

This slice continues the backend scaling work after repository and DTO introduction.

Implemented:

- Removed remaining direct `data.*` access from `server/src/routes/*` and `server/src/http/*`.
- Expanded JSON repositories with route-oriented methods:
  - case lists by owner/expert;
  - case evidence counts;
  - status counters;
  - recent audit log list;
  - platform counts.
- Added `server/src/presenters/responsePresenters.js`.
  - `presentItem`
  - `presentList`
  - `presentAuthSession`
  - `presentUser`
  - `presentCategories`
  - `presentUpdatedCount`
- Updated route modules to use response presenters for stable response envelopes.
- Added `server/tests/presenters.test.js`.
- Added `web/apiClient.js`.
  - Auth methods.
  - System/category/analyze/diagnostics methods.
  - Case actions, evidence, comments, recommendations and documents.
  - Notification methods.
  - Analytics methods.
  - Admin operations.
- Updated `web/app.js` to use the API client for main reads and actions.

Current rule:

- Routes orchestrate request context, DTO parsing, service calls and presenters.
- Repositories are the only allowed direct data access point for route/http modules.
- Services may still use `data.*` internally until the service repository pass starts.

Next recommended slice:

1. Move service-level `data.*` reads into repositories where it does not blur business logic.
2. Add async repository contracts so JSON and PostgreSQL adapters share the same shape.
3. Split the large browser app into feature modules.
4. Expand `web/apiClient.js` until all API endpoint strings live there.
5. Add frontend smoke tests around API client methods.
