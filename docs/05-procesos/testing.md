---
status: Stable
owner: QA + Tech Lead
last_update: 2025-10-10
scope: Guía de pruebas rápidas para backend y Admin (módulo Usuarios).
---

## Pirámide resumida

- **Unit**: helpers/servicios puros (sin red).
- **Integration**: rutas API con Prisma y DB de prueba.
- **SPA**: smoke tests de vistas críticas del Admin.
- **E2E (futuro)**: flujo completo login → gestión Usuarios → logout.

## Smokes de backend (directo)

```bash
curl -i http://localhost:3000/health
curl -i http://localhost:3000/_debug/ping

TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@lafileto.ar","password":"<PASS>"}' | jq -r '.data.accessToken')

curl -i http://localhost:3000/api/v1/auth/me -H "Authorization: Bearer $TOKEN"
curl -i "http://localhost:3000/api/v1/users?all=1" -H "Authorization: Bearer $TOKEN"
```

## Smokes por proxy (Admin dev server)

```bash
curl -i http://localhost:5174/api/_debug/ping
curl -i "http://localhost:5174/api/v1/users?all=1"
```

> Requiere tener `pnpm -F admin dev` y `pnpm -F backend dev` levantados en paralelo. El proxy de Vite reescribe `/api/*` hacia `http://localhost:3000`.

## Checklist visual rápido (SPA Admin)

1. Login como admin (`admin@lafileto.ar`).
2. `/#/users`: ver la grilla completa (sin buscador/paginación) y probar **Nuevo usuario**, **Editar**, **Eliminar**, **Switch de estado**.
3. `/#/users` → pestaña **Roles & Permisos**: alta/edición/baja de roles + guardar matriz `r/w/u/d`.
4. Guardar permisos del rol actual debe refrescar sesión (roles vigentes en barra superior).
5. `Cerrar sesión`: vuelve a login y limpia permisos; desde "No autorizado" el CTA "Volver al inicio de sesión" también cierra sesión.
6. Token caducado (borrar manualmente en localStorage y refrescar) → interceptores redirigen a login.

## Consideraciones adicionales

- Respuestas del backend siguen el envelope `{ ok, data | error }`.
- `GET /api/v1/users` acepta `all=1|true` para recuperar todos los registros; sin flag mantiene paginación.
- Los códigos `409 SELF_DELETE_FORBIDDEN` y `409 LAST_ADMIN_FORBIDDEN` deben mostrarse como toasts amigables en la UI.
- Para regresiones mayores documentar en issues; esta guía cubre el "happy path" y errores controlados del módulo Usuarios.
