# Menú Digital — La Fileto (Monorepo)

SPA **Client** + **Admin** con Vite y **Backend** Node/Express (Prisma/MySQL).  
Documentación completa en [`/docs`](./docs).

> Recomendado: **Node.js 20 LTS** y **pnpm ≥ 8**. Si usás `npm` o `yarn`, adaptá los comandos.

---

## Estructura del repositorio

```
/
├─ apps/
│  ├─ client/    # SPA pública (catálogo + carrito + WhatsApp)
│  ├─ admin/     # SPA de gestión (JWT + RBAC)
│  └─ backend/   # API Node/Express + Prisma/MySQL
├─ packages/     # (opcional) librerías compartidas
└─ docs/         # documentación del proyecto
```

**Dev URLs (por defecto):**

| App     | URL (dev)                   |
|---------|-----------------------------|
| Client  | http://localhost:5173/      |
| Admin   | http://localhost:5174/      |
| API v1  | http://localhost:3000/api/v1|

---

## Requisitos previos

- **Node.js 20 LTS** (recomendado)  
- **pnpm ≥ 8** (`npm i -g pnpm`)  
- **MySQL 8.x** local o en contenedor (puerto 3306)  
- Variables de entorno según [`/docs/07-anexos/env.md`](./docs/07-anexos/env.md).

> **Feature flag**: `VITE_DATA_SOURCE=json|api` (por **módulo**) para la migración gradual JSON→API.

---

## Instalación

```bash
# 1) Instalar dependencias (en la raíz)
pnpm install

# 2) Preparar base de datos (opcional, si usás Prisma)
# Ajustá DATABASE_URL en .env del backend antes de ejecutar:
pnpm -F backend prisma migrate dev
pnpm -F backend prisma db seed   # si hay seeds
```

> Si no usás Prisma o aún no hay DB, saltá el paso 2 y trabajá con `VITE_DATA_SOURCE=json` en el Client.

---

## Ejecutar en desarrollo

**En terminales separadas** (recomendado):

```bash
# Client SPA
pnpm -F client dev

# Admin SPA
pnpm -F admin dev

# API Backend
pnpm -F backend dev
```

> Alternativa (si existe script agregado): `pnpm -r dev` para levantar todo en paralelo.  
> Confirmá las URLs arriba y el CORS en el backend si accedés desde otra IP de la LAN.

---

## Build de producción

```bash
# SPAs
pnpm -F client build
pnpm -F admin build

# Backend (ejemplo)
pnpm -F backend build
# Ejecutar: pnpm -F backend start   # o PM2/systemd según despliegue
```

Los artefactos de las SPAs quedan en `apps/*/dist/` listos para servir (Nginx u otro).

---

## Variables de entorno (resumen)

Ver detalle en [`/docs/07-anexos/env.md`](./docs/07-anexos/env.md). Ejemplo **dev**:

**Backend**
```
PORT=3000
DATABASE_URL=mysql://user:pass@localhost:3306/lafileto
JWT_SECRET=changeme
CORS_ALLOWLIST=http://localhost:5173,http://localhost:5174
```

**Client/Admin**
```
VITE_API_BASE_URL=http://localhost:3000/api/v1
VITE_DATA_SOURCE=json   # client puede iniciar en JSON
# VITE_DATA_SOURCE=api  # admin suele ir directo a API
```

---

## Testing (base)

- Ver lineamientos en [`/docs/05-procesos/testing.md`](./docs/05-procesos/testing.md).  
- Ejemplos típicos (si existen scripts):
  ```bash
pnpm -F backend test
pnpm -F client test
pnpm -F admin test
```

---

## Validación rápida (dev)

**Backend**
```bash
pnpm -F backend prisma:generate
pnpm -F backend prisma:migrate:deploy
pnpm -F backend dev
curl -i http://localhost:3000/health
```

**Admin**
```bash
pnpm -F admin dev
# validar por proxy (autenticado desde Admin)
http://localhost:5174/api/v1/users?page=1&pageSize=10
http://localhost:5174/api/v1/roles
http://localhost:5174/api/v1/modules
http://localhost:5174/api/v1/roles/role-admin/permissions
```

**UI**
- `/#/users`: columnas `Nombre completo`, `Email`, `Teléfono`, `Rol`, `Estado`. Soporta búsqueda y paginación.
- Pestaña **Roles & Permisos** siempre disponible para `role-admin`; guardar actualiza la matriz `r/w/u/d`.

**Compatibilidad**
- Mantener login operativo, sin cambios de proxy ni `.env`.
- `/_debug/ping` responde 200 detrás del proxy.

**Calidad**
```bash
pnpm -r lint --if-present
pnpm -r format --if-present
```

> Nota de esquema: se eliminaron los campos `failedLoginAttempts`, `lockUntil`, `createdAt`, `updatedAt`, `deletedAt` de las tablas administradas por Prisma (`User`, `Role`, `Module`, `RolePermission`, `Setting`).

---

## Estándares y procesos

- **Convenciones**: [`coding-standards.md`](./docs/05-procesos/coding-standards.md)  
- **Flujo de trabajo**: [`procesos.md`](./docs/05-procesos/procesos.md)  
- **Ramas/commits**: [`git-branching.md`](./docs/05-procesos/git-branching.md)  
- **CI/CD**: [`ci-cd.md`](./docs/05-procesos/ci-cd.md)

---

## APIs

- **Guía**: [`api-guidelines.md`](./docs/06-apis/api-guidelines.md)  
- **OpenAPI v1**: [`openapi.yaml`](./docs/06-apis/openapi.yaml)  
- **Endpoints**: [`endpoints.md`](./docs/06-apis/endpoints.md)  
- **Ejemplos**: [`ejemplos.json`](./docs/06-apis/ejemplos.json)  
- **Postman**: [`postman_collection.json`](./docs/06-apis/postman_collection.json)

---

## UX/UI y Accesibilidad

- **Principios y flujos**: [`ux-ui.md`](./docs/04-ux-ui/ux-ui.md)  
- **Design System**: [`design-system.md`](./docs/04-ux-ui/design-system.md)  
- **Accesibilidad**: [`accesibilidad.md`](./docs/04-ux-ui/accesibilidad.md)

---

## Despliegue y seguridad

- **Despliegue**: [`/docs/03-arquitectura/despliegue.md`](./docs/03-arquitectura/despliegue.md)  
- **Seguridad** (JWT Admin, CORS, rate-limit): [`/docs/07-anexos/seguridad.md`](./docs/07-anexos/seguridad.md)

---

## Solución de problemas

Consulta [`troubleshooting.md`](./docs/07-anexos/troubleshooting.md). Casos típicos:
- **CORS**: añadir el origen a `CORS_ALLOWLIST` y reiniciar backend.
- **WhatsApp**: usar `encodeURIComponent` para el mensaje.
- **Imgs/Vite**: preferir rutas absolutas o `new URL(..., import.meta.url)`.

---

## Contribuir

1. Toda PR que cambie flujos/contratos debe **actualizar `/docs`** en la misma PR.  
2. Validá que los **enlaces relativos** funcionen antes del merge.  
3. Mantené el tono **conciso**; sin auditorías/historiales.  
4. Abrí issues con **scope claro** y criterio de aceptación (Given/When/Then).

---

**Última actualización:** 2025-10-08
