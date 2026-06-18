---
status: Draft
owner: Backend Lead
last_update: 2025-10-08
scope: Entidades principales, relaciones y notas de migraciones/seeds.
---

## Entidades

- **User**(id, name, email, passwordHash, roleId)
- **Role**(id, name)
- **Permission**(moduleKey, action) — catálogo para RBAC
- **Category**(id, name, imageUrl?, active)
- **Product**(id, name, description?, imageUrl?, price, stock, status, categoryId, offer?)
- **Offer**(id, productId, discountPercent, isActive, finalPrice derivado)
- **Setting**(id, isOpen, whatsapp?, address?)

## Relaciones

- User N:1 Role
- Role 1:N Permissions (materializadas por asignación)

## Migraciones y seeds

- Seeds mínimas: roles base (Admin, Supervisor), permisos por módulo, usuario admin inicial, `settings` (`isOpen=true`).

## Integridad y performance

- Índices: `products(categoryId)`, `products(name)`, `users(email unique)`.
- Validar `discountPercent` con CHECK o a nivel servicio.

## Category (detalle)

| Campo       | Tipo       | Restricciones / Fuente                                              | Notas                                                                                                |
| ----------- | ---------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `id`        | `String`   | PK (`cuid()`), `VARCHAR(191)`                                       | Generado por Prisma, opaco para clientes.                                                            |
| `name`      | `String`   | `VARCHAR(50)`, único (`Category_name_key`), trim antes de persistir | Debe alinearse con `maxlength` en Admin SPA.                                                         |
| `slug`      | —          | —                                                                   | Historico: no hay columna `slug` ni contrato vigente; no reintroducir sin decision futura explicita. |
| `imageUrl`  | `String?`  | `VARCHAR(2048)`, opcional → `null` si llega vacío                   | Validar URL absoluta (`http(s)`).                                                                    |
| `active`    | `Boolean`  | `DEFAULT true`, índice (`Category_active_idx`)                      | Único estado actual (no hay soft-delete).                                                            |
| `createdAt` | `DateTime` | `DEFAULT now()`                                                     | No expuesto en API actual.                                                                           |
| `updatedAt` | `DateTime` | `@updatedAt`                                                        | Actualiza en cada cambio.                                                                            |

### Relación con Products

- `Product.categoryId` es la relacion vigente hacia Category.
- `productCount` forma parte del contrato de Categories cuando se necesita informar dependencias en Admin.

### Soft-delete y estados

- No existe `deletedAt`. DELETE actual es físico. Registrar deuda si se exige soft-delete para preservar historial.
- `active` funciona como flag binario para toggles rápidos; UI permite filtrar `status=all|active|inactive`.

### Reglas de unicidad / naming

- Comparación case-insensitive usando Prisma (MySQL collation default). Normalizar `name` con trim y collapse de espacios múltiples antes de guardar.
- Nota historica: Client SPA consume `id` y `name`; un slug estable para URLs publicas requeriria decision y contrato nuevos.
