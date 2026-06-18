---
status: Stable
owner: QA + Tech Lead
last_update: 2025-10-10
scope: Guia de pruebas rapidas para backend y Admin React (Products, Categories, Users/Roles y Settings).
---

## Pirámide resumida

- **Unit**: helpers/servicios puros (sin red).
- **Integration**: rutas API con Prisma y DB de prueba.
- **Admin React**: contratos de vistas criticas del Admin sin depender de legacy fisico.
- **E2E (futuro)**: flujo completo login -> gestion Admin -> logout.

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

## Checklist visual rapido (Admin React)

1. Login como admin (`admin@lafileto.ar`).
2. `/#/products`: validar listado, filtros `q`, `categoryId`, `status`, `hasOffer`, CRUD, cambio de estado y gestion de ofertas.
3. `/#/categories`: validar busqueda, `status=all|active|inactive`, orden, paginacion, `productCount`, CRUD y toggle `active`.
4. `/#/users`: validar listado, crear/editar/eliminar, estado, aliases de lectura tolerados (`userId`, `state`, `role_id`) y contrato canonico (`id`, `fullName`, `roleId`, `status`).
5. `/#/users` -> pestaña **Roles & Permisos**: alta/edicion/baja de roles + guardar matriz `r/w/u/d`.
6. `/#/settings`: validar carga, edicion permitida y guardado contra `/api/v1/settings`.
7. Guardar permisos del rol actual debe refrescar sesion (roles vigentes en barra superior).
8. `Cerrar sesion`: vuelve a login y limpia permisos; desde "No autorizado" el CTA de salida tambien cierra sesion.
9. Token caducado (borrar manualmente en localStorage y refrescar) -> interceptores redirigen a login.

## Consideraciones adicionales

- Respuestas del backend siguen el envelope `{ ok, data | error }`.
- `GET /api/v1/users` acepta `all=1|true` para recuperar todos los registros; sin flag mantiene paginación.
- Los códigos `409 SELF_DELETE_FORBIDDEN` y `409 LAST_ADMIN_FORBIDDEN` deben mostrarse como toasts amigables en la UI.
- Para regresiones mayores documentar en issues; esta guia cubre happy path y errores controlados de los modulos Admin React productivos.

## Smokes específicos de Categorías (API)

- **Sin autenticación**: `curl -i http://localhost:3000/api/v1/categories` → `200` con `data.items` poblado (en dev el proxy responde igual vía `http://localhost:5174/api/v1/categories`).
- **Con token admin**: validar `POST`, `PATCH`, `DELETE /api/v1/categories/:id` devolviendo envelope `{ ok: true, data: { item } }` y códigos `4xx` con `error.code` consistente (`CATEGORY_NAME_CONFLICT`, `RBAC_FORBIDDEN`, `VALIDATION_ERROR`).
- El toggle de estado usa `PATCH /api/v1/categories/:id { active }`; si el backend rechaza el cambio debe conservar el estado original en UI.

## Notas de uso - Categorias

- Buscador con debounce de 300 ms: siempre que cambie el termino se reinicia pagina (`page=1`) y se envia `q` en query string.
- Ordenamiento por `name`, `createdAt` o `updatedAt`; filtro `status=all|active|inactive` se envia al backend.
- La columna **#Productos** usa `productCount` cuando la API lo devuelve; la suite Admin cubre su normalizacion.
- Toggle de estado es optimista: actualiza la fila inmediatamente y revierte si el `PATCH` falla, mostrando toast de error con código.
- RBAC por acción:
  - `categories:r` → acceso a vista.
  - `categories:w` → botón **+ Nueva**.
  - `categories:u` → **Editar** y **Toggle Activo**.
  - `categories:d` → **Eliminar**.
- Todos los errores muestran toast con código (`error.code`) para debugging rápido (ej. `CATEGORY_NAME_CONFLICT`, `RBAC_FORBIDDEN`, `AUTH_INVALID`).

## Matriz de pruebas — Categorías

| Tipo        | Caso                                         | Cobertura actual                                         | Gap / Acción                                                          |
| ----------- | -------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------- |
| Admin React | Products listado/CRUD/offers                 | Cubierto por `apps/admin/test/products-*.test.mjs`       | Mantener smokes manuales para flujo completo con backend real.        |
| Admin React | Categories filtros, `active`, `productCount` | Cubierto por `apps/admin/test/categories-react.test.mjs` | Mantener cobertura cuando cambie el shape de `productCount`.          |
| Admin React | Users/Roles                                  | Cubierto por suite Admin React                           | Reforzar casos manuales de rol no admin.                              |
| Admin React | Settings                                     | Cubierto por `apps/admin/test/settings-react.test.mjs`   | Mantener smoke manual de guardado real si cambia el contrato publico. |
| Backend     | Integraciones de API/RBAC                    | Cubierto por `pnpm -F backend test`                      | Agregar casos solo cuando se modifique contrato o validacion.         |
| E2E         | Login -> gestion -> logout                   | Pendiente                                                | Automatizar con Playwright cuando el entorno sea estable.             |

### Datos semilla sugeridos

- Ejecutar `pnpm -F backend prisma:migrate:deploy` + `pnpm -F backend db:seed` antes de correr integraciones.
- Mantener categorías base (`Bebidas`, `Pastas`, `Carnes`, `Ensaladas`, `Postres`) para validar paginado y filtros.

### Checks previos a merge

- [ ] `pnpm -F admin test`.
- [ ] `pnpm -F backend test`.
- [ ] `pnpm -F admin build`.
- [ ] Validar manualmente permisos/RBAC cuando el cambio toque Users/Roles, Products, Categories o Settings.
- [ ] Confirmar que Postman usa `baseUrl` canonico `/api/v1` y no mezcla `/settings`, `/api/settings` y `/api/v1/settings`.
