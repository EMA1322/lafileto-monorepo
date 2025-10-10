---
status: Draft
owner: Tech Lead
last_update: 2025-10-10
scope: Flujo issue → branch → PR → merge, DoD y coordinación.
---

# Procesos

## Flujo estándar
Issue → Branch → Dev → PR → CI (lint/test/build) → Review → Merge.

### Nomenclatura de ramas
- `feat/…`, `fix/…`, `chore/…`, `docs/…`, `ci/…`

### Convención de commits
- **Conventional Commits** (ej.: `feat(admin): add normalize.css`).
- PRs squash a `main` para historial limpio.

## Definition of Done (DoD)
- Compila y pasa CI (lint/tests/build).
- **Docs actualizadas** (APIs/UX/Arquitectura/Despliegue/CI-CD).
- Sin secretos en el diff de PR.
- `pnpm dev` levanta OK y `GET /api/v1/health` responde **200**.

## Checklist de PR
- [ ] Cambios cubiertos por tests (si aplica).
- [ ] Actualicé `/docs` correspondiente.
- [ ] Revisé CORS y `.env` por entorno.
- [ ] Build local OK (`pnpm -F client build`, `pnpm -F admin build`).

## Roles y revisiones
- **CODEOWNERS** define revisores obligatorios por carpeta.
- Mínimo 1 _review_ aprobada para merge.

## Ramas protegidas
- `main` protegido con: PR obligatorio, status check **CI**, y (opcional) historia lineal.
