---
name: lafileto-admin-audit
description: Admin audit workflow for La Fileto apps/admin changes. Use when a task affects Admin modules, routes, permissions or RBAC, backend integration, UI states, or a future migration only when Eduardo explicitly confirms that migration work.
---

# La Fileto Admin Audit

Use this skill when auditing or planning work that affects `apps/admin`.

## Admin Scope

Inspect the task against:

- Admin modules and ownership boundaries.
- Routes and navigation.
- Permissions, RBAC, and role-sensitive behavior when applicable.
- Backend integration and API contracts.
- Loading, empty, error, success, and disabled UI states.
- Form validation and destructive actions.
- Existing framework and module structure.

Do not assume an Admin migration, rewrite, route conversion, or framework change unless Eduardo explicitly confirms it for the task.

## Evidence To Gather

Use commands that match the actual package scripts:

```bash
git diff --stat origin/main...HEAD
git diff --name-status origin/main...HEAD -- apps/admin
git diff origin/main...HEAD -- apps/admin
git diff --check origin/main...HEAD
pnpm -F admin test
pnpm -F admin build
```

If the change affects backend integration, inspect the relevant backend endpoint contracts too.

## Audit Checklist

- Confirm touched Admin modules and routes.
- Confirm route boundaries and neighboring modules are not unintentionally changed.
- Check permissions and RBAC impact where applicable.
- Check backend request/response compatibility.
- Check UI states for loading, empty, error, success, and blocked actions.
- Check tests, build, and any browser smoke that is relevant.
- Identify missing verification and risk.

## Output Format

Write the report in Spanish:

1. Scope Admin real.
2. Módulos y rutas.
3. Permisos/RBAC, si aplica.
4. Integración con backend.
5. Estados de UI.
6. Tests, build y smokes.
7. Riesgos.
8. Dictamen final.

Use `APTO`, `APTO CON OBSERVACIONES`, or `NO APTO` when this is an audit.

Do not commit, push, create PRs, merge, or close PRs. Eduardo keeps manual control.
