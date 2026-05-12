# Architecture Notes

## MVP Structure

```text
ProblemOS
├── server
│   ├── src
│   │   ├── data          JSON store and seed data
│   │   ├── domain        categories, statuses, playbooks
│   │   ├── services      cases, docs, AI-like helpers, notifications
│   │   ├── telegram      bot adapter skeleton
│   │   ├── utils         HTTP, security, ids
│   │   └── index.js      server and routes
│   └── tests             node:test coverage
├── web                  static SPA
└── docs                 project memory and roadmap
```

## Core Flow

```text
Free text problem
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
- `services/*` owns business behavior.
- `index.js` only maps HTTP routes to services.
- `web/*` is intentionally thin and uses API state.
- `audit_logs` is the append-only operational history for future admin review and migrations.
- `timeline` remains user-facing case history; `audit_logs` remains system-facing traceability.

## Legal Safety

The service must not promise a legal outcome. Documents include a support disclaimer and are generated from controlled templates. AI helpers can classify, summarize and normalize text, but final documents stay template-based.
