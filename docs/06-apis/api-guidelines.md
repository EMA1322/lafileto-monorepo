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
`UNAUTHORIZED (401)`, `FORBIDDEN (403)`, `NOT_FOUND (404)`, `CONFLICT (409)`, `RESOURCE_CONFLICT (409)`, `VALIDATION_ERROR (422)`, `RATE_LIMITED (429)`.

## Paginación/orden/búsqueda
- `q`: término de búsqueda libre, recortado en backend.
- `page`: entero `>= 1`, default `1`.
- `pageSize`: entero `>= 1` y `<= 100`, default `20` (el servicio puede restringir el rango efectivo).
- `orderBy`: nombre de campo permitido por el recurso (p. ej. `name`, `fullName`).
- `orderDir`: `asc` (default) | `desc`.
- `pageCount`: total de páginas devuelto en `data.meta.pageCount`; siempre incluir en las respuestas paginadas.

## Versionado
`v1` estable; compatibilidad hacia Client; cambios incompatibles → `v2`.

## Cabeceras
- `X-Request-Id`: propagado por el backend en cada respuesta para trazabilidad.
- `RateLimit-*` y `X-RateLimit-*`: expuestas por el limitador en `/auth/login` cuando aplica.
- `Content-Type: application/json` por defecto.

## CORS
- Allowlist por entorno configurada en el backend vía `CORS_ALLOWLIST` (ver `/07-anexos/env.md`).

## Categorías — convenciones
- IDs `cuid()` (p. ej. `ckud3a...`); no exponer autoincrementales.
- `name` se recorta (`trim`) y valida longitud 2–50; backend responde `CATEGORY_NAME_CONFLICT` (409) ante duplicados.
- `imageUrl` opcional: si llega vacío se normaliza a `null`; sólo se aceptan URLs absolutas `http(s)`.
- Estado booleano `active`; no existe soft-delete (`deletedAt`). Borrado actual es físico; documentar si se agrega soft-delete.
- Envelope obligatorio `{ ok, data, meta? }`; `GET /categories` siempre responde `meta` con `page`, `pageSize`, `total`, `pageCount`.
- Parámetros soportados: `page`, `pageSize (5..100)`, `q`, `status=all|active|inactive`, `orderBy=name|createdAt|updatedAt`, `orderDir=asc|desc`, `all=true` (fuerza `pageSize=100`).
- Errores negocio: `CATEGORY_NOT_FOUND (404)`, `CATEGORY_NAME_CONFLICT (409)`, `PERMISSION_DENIED (403)`, `VALIDATION_ERROR (422)`.
- > NOTE: Si se agrega `slug`, usar snake-case o kebab-case consistente (`slugify(name)`), índice único y exponerlo en responses.
