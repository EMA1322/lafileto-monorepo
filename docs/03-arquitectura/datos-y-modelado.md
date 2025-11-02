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
- **Product**(id, name, price, discount?, isOffer?, categoryId, description?)
- **Setting**(id, isOpen, whatsapp?, address?)

## Relaciones
- User N:1 Role
- Role 1:N Permissions (materializadas por asignación)

## Migraciones y seeds
- Seeds mínimas: roles base (Admin, Supervisor), permisos por módulo, usuario admin inicial, `settings` (`isOpen=true`).

## Integridad y performance
- Índices: `products(categoryId)`, `products(name)`, `users(email unique)`.
- Validar `discount` con CHECK o a nivel servicio.

## Category (detalle)

| Campo      | Tipo        | Restricciones / Fuente | Notas |
|------------|-------------|------------------------|-------|
| `id`       | `String`    | PK (`cuid()`), `VARCHAR(191)` | Generado por Prisma, opaco para clientes.
| `name`     | `String`    | `VARCHAR(50)`, único (`Category_name_key`), trim antes de persistir | Debe alinearse con `maxlength` en Admin SPA.
| `slug`     | —           | — | > NOTE: No hay columna `slug` aún. Si se requiere, definir convención `slugify(name)` + índice único.
| `imageUrl` | `String?`   | `VARCHAR(2048)`, opcional → `null` si llega vacío | Validar URL absoluta (`http(s)`).
| `active`   | `Boolean`   | `DEFAULT true`, índice (`Category_active_idx`) | Único estado actual (no hay soft-delete).
| `createdAt`| `DateTime`  | `DEFAULT now()`        | No expuesto en API actual.
| `updatedAt`| `DateTime`  | `@updatedAt`           | Actualiza en cada cambio.

### Relación con Products
- Futuro `Product.categoryId` (FK) → hoy pendiente; al implementar, definir `ON DELETE RESTRICT` o flujo de reasignación antes del borrado.
- `Products` en Admin espera `productCount` por categoría; aún no calculado en servicio.

### Soft-delete y estados
- No existe `deletedAt`. DELETE actual es físico. Registrar deuda si se exige soft-delete para preservar historial.
- `active` funciona como flag binario para toggles rápidos; UI permite filtrar `status=all|active|inactive`.

### Reglas de unicidad / naming
- Comparación case-insensitive usando Prisma (MySQL collation default). Normalizar `name` con trim y collapse de espacios múltiples antes de guardar.
- > NOTE: Validar con QA si se requiere slug estable para URLs públicas; hoy Client SPA consume solo `id` y `name`.
