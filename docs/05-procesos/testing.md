---
status: Stable
owner: QA + Tech Lead
last_update: 2025-10-10
scope: Guía de pruebas rápidas para backend y Admin (módulos Usuarios y Categorías).
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
curl -i "http://localhost:5174/api/v1/categories?page=1&pageSize=10"
```

> Requiere tener `pnpm -F admin dev` y `pnpm -F backend dev` levantados en paralelo. El proxy de Vite reescribe `/api/*` hacia `http://localhost:3000`.

## Checklist visual rápido (SPA Admin)

1. Login como admin (`admin@lafileto.ar`).
2. `/#/users`: ver la grilla completa (sin buscador/paginación) y probar **Nuevo usuario**, **Editar**, **Eliminar**, **Switch de estado**.
3. `/#/categories`: verificar columnas ID | Nombre | Imagen | #Productos | Estado | Acciones.
   - Buscar por nombre (input demora 300 ms antes de ir a red) y comprobar que la API recibe `search=<term>`.
   - Ordenar asc/desc por nombre y confirmar que el query string envía `order=asc|desc`.
   - Filtro Activas/Inactivas (frontend) oculta filas sin recalcular totales, badge cambia según estado.
   - Paginación reusa controles de Users (`page`, `pageSize`).
   - Acciones: **+ Nueva**, **Editar**, **Eliminar**, **Toggle Activo**. Cada éxito debe disparar toast verde.
   - Errores esperados: nombre duplicado → toast rojo con código `CATEGORY_NAME_CONFLICT`; sin permisos w|u|d → botones ocultos/disabled y, si se fuerza la petición, toast con `RBAC_FORBIDDEN`.
4. `/#/users` → pestaña **Roles & Permisos**: alta/edición/baja de roles + guardar matriz `r/w/u/d`.
5. Guardar permisos del rol actual debe refrescar sesión (roles vigentes en barra superior).
6. `Cerrar sesión`: vuelve a login y limpia permisos; desde "No autorizado" el CTA "Volver al inicio de sesión" también cierra sesión.
7. Token caducado (borrar manualmente en localStorage y refrescar) → interceptores redirigen a login.

## Consideraciones adicionales

- Respuestas del backend siguen el envelope `{ ok, data | error }`.
- `GET /api/v1/users` acepta `all=1|true` para recuperar todos los registros; sin flag mantiene paginación.
- Los códigos `409 SELF_DELETE_FORBIDDEN` y `409 LAST_ADMIN_FORBIDDEN` deben mostrarse como toasts amigables en la UI.
- Para regresiones mayores documentar en issues; esta guía cubre el "happy path" y errores controlados del módulo Usuarios.

## Smokes específicos de Categorías (API)

- **Sin autenticación**: `curl -i http://localhost:3000/api/v1/categories` → `200` con `data.items` poblado (en dev el proxy responde igual vía `http://localhost:5174/api/v1/categories`).
- **Con token admin**: validar `POST`, `PATCH`, `DELETE /api/v1/categories/:id` devolviendo envelope `{ ok: true, data: { item } }` y códigos `4xx` con `error.code` consistente (`CATEGORY_NAME_CONFLICT`, `RBAC_FORBIDDEN`, `VALIDATION_ERROR`).
- El toggle de estado usa `PATCH /api/v1/categories/:id { active }`; si el backend rechaza el cambio debe conservar el estado original en UI.

## Notas de uso – Categorías

- El `DATA_SOURCE` default ahora es **API** (sin fallback JSON); cualquier override via localStorage `DATA_SOURCE=json` queda solo para debugging manual.
- Buscador con debounce de 300 ms: siempre que cambie el término se reinicia página (`page=1`) y se envía `search` en query string.
- Ordenamiento únicamente por nombre (`order=asc|desc`); filtro Activas/Inactivas se aplica en frontend sobre la página actual.
- La columna **#Productos** muestra `0` (placeholder) con `title="Se activará cuando Products backend exponga conteo"` hasta que la API provea el dato.
- Toggle de estado es optimista: actualiza la fila inmediatamente y revierte si el `PATCH` falla, mostrando toast de error con código.
- RBAC por acción:
  - `categories:r` → acceso a vista.
  - `categories:w` → botón **+ Nueva**.
  - `categories:u` → **Editar** y **Toggle Activo**.
  - `categories:d` → **Eliminar**.
- Todos los errores muestran toast con código (`error.code`) para debugging rápido (ej. `CATEGORY_NAME_CONFLICT`, `RBAC_FORBIDDEN`, `AUTH_INVALID`).

## Matriz de pruebas — Categorías

| Tipo | Caso | Cobertura actual | Gap / Acción |
|---|---|---|---|
| Unit (servicio) | `createCategory` valida duplicados y normaliza `imageUrl` | ❌ | Agregar pruebas con mock de repositorio para `findByName` y normalización de URL vacía. |
| Unit (servicio) | `deleteCategory` verifica dependencias de productos | ❌ | > NOTE: Pendiente de implementar conteo real de productos antes de cubrirlo. |
| Integración API | GET paginado (`page`, `pageSize`, `status`, `orderBy`) | ✅ `tests/integration/categories.api.test.mjs` | Extender para `orderBy=updatedAt` y `all=true`. |
| Integración API | POST (201) + 409 duplicado | ⚠️ Solo flujo feliz | Añadir caso duplicado y validaciones 422 (longitud, URL inválida). |
| Integración API | PUT + PATCH idempotente | ⚠️ Parcial | Cubrir retorno sin cambios (PUT) y `PATCH` `true→true`. |
| Integración API | DELETE con dependencias | ❌ | Bloquear hasta que exista verificación con productos. |
| Integración RBAC | Supervisor solo lectura | ✅ `tests/integration/categories.rbac.test.mjs` | Alinear seeds vs fixtures (hoy supervisor en seed tiene `w/u`). |
| Smoke API | Script CLI `scripts/smoke/categories.smoke.mjs` | ⚠️ Usa rutas `/admin/categories` y soft-delete | Actualizar script conforme a `/api/v1/categories` y toggles booleanos. |
| Smoke Admin SPA | Búsqueda, filtros, modales, toasts | 🔁 Checklist manual (ver arriba) | Automatizar con Playwright cuando endpoints estén estables. |
| Client SPA | Filtro por categoría (botones) | ❌ | Corregir consumo de envelope (`data.items`) y agregar prueba de regresión. |

### Datos semilla sugeridos
- Ejecutar `pnpm -F backend prisma:migrate:deploy` + `pnpm -F backend db:seed` antes de correr integraciones.
- Mantener categorías base (`Bebidas`, `Pastas`, `Carnes`, `Ensaladas`, `Postres`) para validar paginado y filtros.

### Checks previos a merge (Categorías)
- [ ] `pnpm -r test` (ejecuta suites API + RBAC de categorías).
- [ ] Validar manualmente toggle en Admin SPA con usuario supervisor (sin permisos w/u/d) para garantizar RBAC.
- [ ] Confirmar que Postman folder "Categories" ejecuta sin errores (GET 200, POST 201, PUT 200, DELETE 200).
