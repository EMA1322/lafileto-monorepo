---
status: Draft
owner: Backend Lead
last_update: 2025-10-09
scope: Base URL, auth, envelope, errores, paginación, versionado y compatibilidad.
---

## Base
`/api/v1` — dev: `http://localhost:3000/api/v1`

## Auth
- **Admin**: JWT Bearer
- **Client**: público (lectura)

## Envelope
Éxito: `{ "ok": true, "data": ..., "meta": { ... } }`  
Error: `{ "ok": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }`

## Errores (códigos)
`UNAUTHORIZED (401)`, `FORBIDDEN (403)`, `NOT_FOUND (404)`, `CONFLICT (409)`, `VALIDATION_ERROR (422)`, `RATE_LIMITED (429)`.

## Paginación/orden/búsqueda
`page`, `pageSize (1..100, default 20)`, `sort=field:asc|desc[,field2:desc]`, `q`.

## Versionado
`v1` estable; compatibilidad hacia Client; cambios incompatibles → `v2`.

## Cabeceras
- `X-Request-Id`: propagado por el backend en cada respuesta para trazabilidad.
- `RateLimit-*` y `X-RateLimit-*`: expuestas por el limitador en `/auth/login` cuando aplica.
- `Content-Type: application/json` por defecto.

## CORS
- Allowlist por entorno configurada en el backend vía `CORS_ALLOWLIST` (ver `/07-anexos/env.md`).
