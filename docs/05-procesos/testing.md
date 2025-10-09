---
status: Draft
owner: QA + Tech Lead
last_update: 2025-10-09
scope: Pirámide de test, unit/integration en backend, smoke en SPA y E2E futuro.
---

- **Unit**: helpers/servicios.
- **Integration**: rutas API con DB de prueba.
- **SPA**: smoke tests de vistas críticas.
- **E2E (futuro)**: checkout WhatsApp, login Admin.
- Seeds de datos para escenarios básicos.

**Smoke API:** `GET /api/v1/health` → 200 `{ ok:true }`.
**Rate-limit:** tras 10 intentos de `POST /api/v1/auth/login` en 15 min desde la misma IP → 429.
