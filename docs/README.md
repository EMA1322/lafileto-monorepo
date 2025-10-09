---
status: Draft
owner: Tech Lead + Product/UX
last_update: 2025-10-09
scope: Índice, propósito, cómo contribuir, mapa del repo y contactos.
---

# Documentación — Menú Digital · La Fileto

## Propósito
Centralizar lineamientos de **visión**, **requisitos**, **arquitectura**, **UX/UI**, **procesos** y **APIs** del monorepo (client, admin, backend, packages).

## Índice
- **01-vision**: [vision.md](./01-vision/vision.md), [roadmap.md](./01-vision/roadmap.md)
- **02-requisitos**: [requisitos.md](./02-requisitos/requisitos.md), [user-stories.md](./02-requisitos/user-stories.md)
- **03-arquitectura**: [arquitectura.md](./03-arquitectura/arquitectura.md), C4 ([context](./03-arquitectura/c4-context.mmd), [containers](./03-arquitectura/c4-containers.mmd), [components-admin](./03-arquitectura/c4-components-admin.mmd), [components-client](./03-arquitectura/c4-components-client.mmd)), [datos-y-modelado.md](./03-arquitectura/datos-y-modelado.md), [despliegue.md](./03-arquitectura/despliegue.md)
- **04-ux-ui**: [ux-ui.md](./04-ux-ui/ux-ui.md), [design-system.md](./04-ux-ui/design-system.md), [accesibilidad.md](./04-ux-ui/accesibilidad.md)
- **05-procesos**: [procesos.md](./05-procesos/procesos.md), [git-branching.md](./05-procesos/git-branching.md), [coding-standards.md](./05-procesos/coding-standards.md), [testing.md](./05-procesos/testing.md), [ci-cd.md](./05-procesos/ci-cd.md)
- **06-apis**: [api-guidelines.md](./06-apis/api-guidelines.md), [endpoints.md](./06-apis/endpoints.md), [openapi.yaml](./06-apis/openapi.yaml), [ejemplos.json](./06-apis/ejemplos.json), [postman_collection.json](./06-apis/postman_collection.json)
- **07-anexos**: [env.md](./07-anexos/env.md), [seguridad.md](./07-anexos/seguridad.md), [troubleshooting.md](./07-anexos/troubleshooting.md), [glosario.md](./07-anexos/glosario.md), [changelog.md](./07-anexos/changelog.md)

## Cómo contribuir
1. Cada cambio de contrato/flujo debe incluir actualización en `/docs` en la **misma PR**.
2. Validar enlaces relativos antes del merge.
3. Mantener el tono **conciso** y sin auditorías ni historiales; sólo “Última actualización”.
4. Para nuevas APIs, actualizar `openapi.yaml`, `endpoints.md` y ejemplos.

## Mapa del repo
| Workspace | Descripción | Dev URL |
|---|---|---|
| `client/` | SPA pública (catálogo + carrito + WhatsApp) | http://localhost:5173/ |
| `admin/` | SPA de gestión con RBAC | http://localhost:5174/ |
| `backend/` | API Node/Express + Prisma/MySQL | http://localhost:3000/api/v1 |

## Contactos / Owners
| Área | Owner |
|---|---|
| Product/UX | Pendiente de completar |
| Front (Client/Admin) | Pendiente de completar |
| Backend | Pendiente de completar |

## Estado general
- **MVP** en ejecución con migración **JSON→API** por módulo y flag `VITE_DATA_SOURCE`.


## Ejecución en desarrollo
Comandos para levantar **Client**, **Admin** y **API** simultáneamente (PNPM workspaces):
```bash
pnpm install
pnpm dev
```
URLs en dev:
- Client → http://localhost:5173
- Admin  → http://localhost:5174
- API    → http://localhost:3000/api/v1/health

> Si un puerto está ocupado, podés liberar 5173/5174/3000 con:
```bash
pnpm dlx kill-port 5173 5174 3000
```

## Build de producción
Construcción de artefactos estáticos para las SPAs:
```bash
pnpm -F client build
pnpm -F admin build
```
El **backend** corre como proceso Node (p. ej., con PM2/systemd):
```bash
pnpm -F backend start
```
