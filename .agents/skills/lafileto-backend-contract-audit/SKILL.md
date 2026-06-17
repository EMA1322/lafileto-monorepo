---
name: lafileto-backend-contract-audit
description: Backend contract audit workflow for La Fileto apps/backend changes. Use when a task affects Express endpoints, validation, RBAC, response envelopes, Prisma, database behavior, tests, or compatibility with Client and Admin consumers.
---

# La Fileto Backend Contract Audit

Use this skill when auditing or planning work that affects `apps/backend`.

## Backend Scope

Inspect the task against:

- Express routes and `/api/v1` endpoints.
- Request validation and error handling.
- Authentication, authorization, and RBAC.
- Response envelope and status codes.
- Prisma schema, queries, migrations, and seed assumptions.
- MySQL compatibility.
- Tests and fixture data.
- Compatibility with Client and Admin consumers.

## Evidence To Gather

Use commands that match the actual package scripts:

```bash
git diff --stat origin/main...HEAD
git diff --name-status origin/main...HEAD -- apps/backend
git diff origin/main...HEAD -- apps/backend
git diff --check origin/main...HEAD
pnpm -F backend test
pnpm -F backend build
```

If Prisma files changed, inspect generated or migration expectations with the repository's established Prisma commands. Do not run destructive database commands without explicit approval.

## Audit Checklist

- Confirm changed endpoints and HTTP methods.
- Confirm request validation and error cases.
- Confirm RBAC and permission-sensitive behavior.
- Confirm response envelope, status codes, and payload compatibility.
- Confirm Prisma query and schema impact.
- Confirm test coverage for success and failure paths.
- Confirm compatibility with existing Client and Admin calls.
- Identify migrations, seed changes, or environment assumptions.

## Output Format

Write the report in Spanish:

1. Scope Backend real.
2. Endpoints y contratos.
3. Validaciones y errores.
4. RBAC/permisos.
5. Prisma/base de datos.
6. Compatibilidad Client/Admin.
7. Tests y comandos.
8. Riesgos.
9. Dictamen final.

Use `APTO`, `APTO CON OBSERVACIONES`, or `NO APTO` when this is an audit.

Do not commit, push, create PRs, merge, or close PRs. Eduardo keeps manual control.
