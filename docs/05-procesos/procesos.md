---
status: Draft
owner: Tech Lead
last_update: 2025-10-09
scope: Flujo issue → branch → PR → merge, DoD y coordinación.
---

## Flujo
Issue → Branch → Dev → PR → CI (lint/test/build) → Review → Merge.

## DoD
Código compila, tests pasan, **docs actualizados** y enlaces verificados.

## Checklist PR
- [ ] Cambios cubiertos por tests
- [ ] Actualicé /docs (APIs/UX/Arquitectura)
- [ ] Revisé CORS y `.env`

**DoD (runtime):**
- `pnpm dev` levanta sin errores.
- `GET /api/v1/health` responde 200.
