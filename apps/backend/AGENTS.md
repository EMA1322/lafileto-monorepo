# Backend guide

Scope: `apps/backend/**`.

Read [current-state.md](../../docs/project/current-state.md), [endpoints.md](../../docs/06-apis/endpoints.md), [datos-y-modelado.md](../../docs/03-arquitectura/datos-y-modelado.md), [env.md](../../docs/07-anexos/env.md), [testing.md](../../docs/05-procesos/testing.md), and [seguridad.md](../../docs/07-anexos/seguridad.md).

## High-risk contracts

- The API is versioned under `/api/v1` and uses the shared success/error envelope.
- Preserve public/protected separation, JWT authentication, and RBAC behavior.
- Prisma targets MySQL. Database tests, migrations, seed, reset, and smokes are fail-closed opt-in operations.
- `pnpm -F backend prisma <subcommand>` is a manual passthrough, not the safe default path for sensitive DB work.

## Routine verification

```bash
pnpm -F backend lint
pnpm -F backend test
```

The `build` script is informational and does not compile the backend; it is not routine verification. Do not list DB commands as routine verification. Use the documented safety procedure and `lafileto-backend-contract-audit` when the change affects contracts.
