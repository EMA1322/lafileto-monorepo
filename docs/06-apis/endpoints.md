---
status: CANONICAL
verified_at: 2026-08-07
---

# Endpoints y contratos HTTP

La API principal está bajo `/api/v1`. Las respuestas usan el envelope común de éxito/error implementado por Backend. Este documento describe superficies y autorización; los payloads exactos se verifican contra validadores, rutas y tests antes de cambiar consumidores.

## Públicos

| Método | Ruta                               | Uso                              |
| ------ | ---------------------------------- | -------------------------------- |
| GET    | `/health`, `/api/v1/health`        | health checks.                   |
| GET    | `/api/v1/public/categories`        | categorías visibles.             |
| GET    | `/api/v1/public/products`          | catálogo público.                |
| GET    | `/api/v1/public/offers`            | ofertas públicas.                |
| GET    | `/api/v1/public/settings`          | ajustes públicos expuestos.      |
| GET    | `/api/v1/public/business-status`   | estado comercial público.        |
| GET    | `/api/v1/public/commercial-config` | configuración comercial pública. |
| POST   | `/api/v1/auth/login`               | autentica y entrega sesión JWT.  |

## Protegidos

`GET /api/v1/auth/me` y `POST /api/v1/auth/logout` requieren JWT. Los siguientes grupos requieren JWT y RBAC según su módulo y operación:

| Grupo      | Rutas principales                                              |
| ---------- | -------------------------------------------------------------- |
| Dashboard  | `GET /dashboard/summary`                                       |
| Users      | CRUD bajo `/users`                                             |
| Roles      | CRUD bajo `/roles` y permisos asociados                        |
| Modules    | lectura bajo `/modules`                                        |
| Categories | escritura, lectura administrativa y cambios bajo `/categories` |
| Products   | CRUD y `PATCH /products/:id/status` bajo `/products`           |
| Offers     | CRUD bajo `/offers`                                            |
| Settings   | escritura y lectura administrativa bajo `/settings`            |

La ruta `PATCH /products/:id/status` usa hoy `rbacGuard('products', 'u')`, no `products:changeStatus`. La discrepancia con el flag de datos es deuda de decisión, no permiso implícito para cambiar el runtime.

Existe un alias legacy `/api/settings`; no es la superficie canónica para trabajo nuevo. El debug endpoint se limita al entorno no productivo y no sustituye health checks.

## Contratos de consumidor

- Client depende de catálogo, categorías, ofertas y settings públicos, y de `VITE_API_BASE_URL`.
- Admin persiste token/sesión en su adaptador, aplica el envelope y consume rutas JWT/RBAC.
- Los cambios de envelope, autenticación, RBAC, paths o validadores deben pasar auditoría de contrato y pruebas de los consumidores.

No se mantiene aquí una especificación OpenAPI inexistente ni se modifica Postman en esta fase. La generación de una referencia de requests/responses sigue siendo trabajo futuro sujeto a decisión.
