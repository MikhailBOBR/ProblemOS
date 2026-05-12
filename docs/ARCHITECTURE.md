# Architecture Notes

## MVP Structure

```text
ProblemOS
├── server
│   ├── src
│   │   ├── data            JSON store and seed data
│   │   ├── domain          categories, statuses, playbooks
│   │   ├── dto             request DTO parsing and normalization
│   │   ├── http            request context, routing helpers, validation
│   │   ├── repositories    JSON repository boundary, future PostgreSQL adapter point
│   │   ├── presenters      response envelope builders
│   │   ├── routes          API route groups and admin subgroups
│   │   ├── services        business behavior
│   │   ├── telegram        bot adapter skeleton
│   │   ├── utils           HTTP, security, ids
│   │   └── index.js        composition root, static serving and startup
│   └── tests               node:test coverage
├── web                     static SPA
└── docs                    project memory and roadmap
```

## Core Flow

```text
Free text problem
-> DTO validation
-> analyzeProblem()
-> createCase()
-> category playbook creates steps
-> nextAction engine chooses user action
-> evidence and facts enrich the case
-> document template renders official text
-> package export collects timeline, docs and evidence
```

## Domain Boundaries

- `domain/*` contains stable product vocabulary.
- `dto/*` owns request normalization.
- `http/*` owns request context, validation and shared routing primitives.
- `repositories/*` owns data access contracts. The current implementation wraps JSON data; PostgreSQL repositories should mirror these methods.
- `presenters/*` owns stable response envelopes such as `{ item }`, `{ items, total }` and auth sessions.
- `routes/*` owns HTTP route orchestration and stays thin.
- `services/*` owns business behavior.
- `index.js` composes route modules, rate limiting, static serving and startup.
- `web/*` is intentionally thin and uses API state.
- `web/apiClient.js` is the browser-side API boundary. New UI code should prefer client methods over raw endpoint strings.
- `audit_logs` is the append-only operational history for future admin review and migrations.
- `timeline` remains user-facing case history; `audit_logs` remains system-facing traceability.

## Legal Safety

The service must not promise a legal outcome. Documents include a support disclaimer and are generated from controlled templates. AI helpers can classify, summarize and normalize text, but final documents stay template-based.
