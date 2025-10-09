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
- **Category**(id, name, description?)
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
