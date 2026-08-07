---
status: CANONICAL
verified_at: 2026-08-07
source: apps/backend/prisma/schema.prisma
---

# Datos y modelado

La fuente ejecutable de este documento es `apps/backend/prisma/schema.prisma`. Prisma usa MySQL y relaciones gestionadas por la aplicación.

| Modelo           | Campos y relaciones relevantes                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `User`           | `id` entero, `fullName`, `email` único, `phone`, `passwordHash`, `roleId`, `status`; pertenece opcionalmente a `Role`.                                    |
| `Role`           | `roleId` como clave, `name`; agrupa usuarios y permisos.                                                                                                  |
| `Module`         | `moduleKey` como clave y `name`; agrupa permisos por módulo.                                                                                              |
| `RolePermission` | clave compuesta `roleId`/`moduleKey`; flags `r`, `w`, `u`, `d` y `changeStatus`. Es el modelo de permiso: no existe un modelo `Permission` independiente. |
| `Setting`        | `key` como clave y `value` de tipo Prisma `Json`; no tiene columnas tipadas por ajuste.                                                                   |
| `Category`       | `id` cuid, `name` único, `imageUrl` opcional, `active` y relación con productos.                                                                          |
| `Product`        | `id` cuid, nombre, descripción, imagen, `price` Decimal, `stock`, `status` (`DRAFT`, `ACTIVE`, `ARCHIVED`), categoría y oferta opcional.                  |
| `Offer`          | `id` cuid, `productId` único y `discountPct` entero; relación uno a uno con `Product`.                                                                    |

La eliminación de categorías cascada a productos según el esquema; las demás reglas de borrado y validación se confirman en rutas y servicios antes de modificarse. No se debe inferir soft delete donde el esquema no lo declara.

La existencia de un flag `changeStatus` en `RolePermission` no implica que una ruta lo aplique: la ruta de estado de productos usa hoy el permiso de actualización del módulo `products`. Ver [endpoints](../06-apis/endpoints.md) y [decisiones](../project/decision-register.md).
