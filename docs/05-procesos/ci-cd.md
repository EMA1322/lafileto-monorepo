---
status: Draft
owner: DevOps/Tech Lead
last_update: 2025-10-08
scope: Pipeline por workspace, caching, path filters, artefactos y gates.
---

## Pipeline
- Lint → Test → Build por **workspace** afectado.
- **Path filters** para evitar builds innecesarios.
- Artefactos: `dist/` (SPAs), paquete de API listo para deploy.
- Secretos provistos por entorno CI (no en repo).
