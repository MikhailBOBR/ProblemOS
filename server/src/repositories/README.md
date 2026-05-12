# Repository Layer

This folder defines the data access boundary used before the PostgreSQL migration.

Current implementation:

- `jsonRepositories.js` wraps the existing in-memory JSON data object.
- `index.js` selects the repository backend. The local MVP uses `REPOSITORY_BACKEND=json`.
- `postgresRepositories.js` is an explicit stub for the upcoming database adapter.
- Route handlers and request context can depend on repository methods instead of reaching into `data.*` directly.

Migration direction:

1. Keep service logic storage-agnostic.
2. Move direct array reads and writes behind repositories step by step.
3. Add PostgreSQL repositories with the same method names.
4. Switch repository factory by configuration when the database backend is introduced.

The JSON store remains the source of truth for the local MVP until the PostgreSQL adapter is ready.
