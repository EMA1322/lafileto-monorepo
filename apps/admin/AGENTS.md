# Admin guide

Scope: `apps/admin/**`.

Read [current-state.md](../../docs/project/current-state.md), [admin-react-architecture.md](../../docs/03-arquitectura/admin-react-architecture.md), [endpoints.md](../../docs/06-apis/endpoints.md), and [seguridad.md](../../docs/07-anexos/seguridad.md) before changing Admin behavior.

## High-risk contracts

- Admin is React 18 on Vite, but the custom hash router owns routing, auth guards, and RBAC guards. Do not introduce React Router without an approved decision.
- Preserve auth storage, JWT session hydration, RBAC behavior, hash routes, and `VITE_FEATURE_SETTINGS` behavior.
- The known legacy fallback is `#not-authorized`; do not remove or change it without a focused compatibility review.
- Keep Admin requests compatible with protected `/api/v1` contracts.

## Routine verification

```bash
pnpm -F admin lint
pnpm -F admin test
pnpm -F admin build
```

Use `lafileto-admin-audit` for scoped Admin audits. Root rules remain in force.
