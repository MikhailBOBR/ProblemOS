# Stage 2.5: Roles, Experts, Playbooks

Implemented in this slice:

- RBAC helper with `user`, `admin`, `expert` roles.
- Seed expert account: `expert@problemos.local / expert123`.
- Expert case assignment through admin API and admin UI.
- Expert recommendations with `user` and `internal` visibility.
- Template version snapshots, version history and restore endpoint.
- Category playbook editing through admin API and admin UI.
- OpenAPI-like endpoint at `GET /api/openapi`.
- PostgreSQL migration draft at `docs/POSTGRES_MIGRATION.sql` and `GET /api/admin/migration/postgres`.
- Expanded API regression tests for expert workflow, template versions, category playbooks and migration endpoint.

Next planned slice:

1. Analytics dashboard for category/status/deadline funnels.
2. Safer template variable editor in admin UI.
3. Email notification adapter next to Telegram delivery.
4. CI-friendly test command once the execution environment allows Node to run without sandbox `EPERM`.
