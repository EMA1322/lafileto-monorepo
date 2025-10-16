---
status: Draft
owner: Backend Lead + Front Leads
last_update: 2025-03-15
scope: Tabla sincronizada con OpenAPI v1; filtros/paginación/orden/búsqueda consolidados; “Pendiente” donde falte implementar.
---

> Fuente de verdad: `openapi.yaml`. Convenciones generales en [`api-guidelines.md`](./api-guidelines.md).
> **Auth**: JWT **solo Admin**. Rutas públicas marcadas como **(público)**. Algunas rutas exigen `role-admin`.

## Parámetros comunes
- `page` (>=1), `pageSize` (1..100, **default 10**), `sort` (`field:asc|desc`[, ...]), `q` (texto).
- `all=1` en `/users` devuelve todos los registros (sin paginar).
- Filtros de **Products**: `categoryId`, `isOffer`.


## Health
| Método | Path | Auth | 200 (data) | Notas |
|---|---|---|---|---|
| GET | `/health` | **(público)** | `{ ok:true, data:{ status, ts } }` | Endpoint de vida del servicio |
| GET | `/_debug/ping` | **(público)** | `{ ok:true, data:{ pong, ts } }` | Ping sin auth para smoke tests |

## Auth
| Método | Path | Auth | Body | 200 (data) | Errores |
|---|---|---|---|---|---|
| POST | `/auth/login` | — | `{ email, password }` | `{ token, user }` | 401, 422, 429 |
| GET | `/auth/me` | JWT | — | `User` | 401 |
| POST | `/auth/logout` | JWT | — | `{ loggedOut: true }` | 401 |

## Users (Admin)
| Método | Path | Auth | Query/Body | Notas | Estado |
|---|---|---|---|---|---|
| GET | `/users` | JWT (`role-admin`) | `page,pageSize,search,all=1` | `all=1` devuelve todo sin paginar; orden `fullName ASC`, envelope `{ items[{ id,fullName,email,phone,roleId,status }], meta{ page,pageSize,total } }` | **I2 listo** |
| POST | `/users` | JWT (`role-admin`) | `{ fullName,email,phone,password,roleId,status }` | Alta de usuario; valida teléfono (`^[0-9()+\s-]{7,20}$`) y evita duplicados de email | **I2 listo** |
| PUT | `/users/:id` | JWT (`role-admin`) | `{ fullName,phone,roleId,status }` | Actualiza datos (sin cambiar email/password); valida teléfono y existencia de rol | **I2 listo** |
| DELETE | `/users/:id` | JWT (`role-admin`) | — | Borrado duro; bloquea auto-eliminación (`SELF_DELETE_FORBIDDEN`) y último admin (`LAST_ADMIN_FORBIDDEN`) | **I2 listo** |

## Roles (Admin)
| Método | Path | Auth | Notas | Estado |
|---|---|---|---|---|
| GET | `/roles` | JWT (`role-admin`) | Catálogo para UI (`{ items[{ roleId,name }] }`) | **I1 listo** |
| POST | `/roles` | JWT (`role-admin`) | `{ name, roleId? }` genera `role-<slug>` si no se envía `roleId`; inicializa permisos en `0` | **I1 listo** |
| PUT | `/roles/:roleId` | JWT (`role-admin`) | Actualiza `name` | **I1 listo** |
| DELETE | `/roles/:roleId` | JWT (`role-admin`) | No permite borrar `role-admin`; responde `ROLE_IN_USE` si hay usuarios asociados | **I1 listo** |

## Modules (Admin)
| Método | Path | Auth | Notas | Estado |
|---|---|---|---|---|
| GET | `/modules` | JWT (`role-admin`) | Lista `{ items[{ key,name }] }` para armar matriz de permisos | **I1 listo** |

## Permissions (Admin)
| Método | Path | Auth | Body | Notas | Estado |
|---|---|---|---|---|---|
| GET | `/roles/:id/permissions` | JWT (`role-admin`) | — | Devuelve `{ roleId, permissions[{ moduleKey,r,w,u,d }] }` | **I1 listo** |
| PUT | `/roles/:id/permissions` | JWT (`role-admin`) | `{ permissions:[{ moduleKey,r,w,u,d }] }` | Upsert por `moduleKey` dentro de transacción; entradas ausentes no se modifican | **I1 listo** |

## Categories (Catálogo)
| Método | Path | Auth | Query/Body | Notas | Estado |
|---|---|---|---|---|---|
| GET | `/categories` | **(público)** | `page,pageSize,q,sort` | Listado público | **Pendiente (I2)** |
| POST | `/categories` | JWT | `{ name, description? }` | Admin protegido | **Pendiente (I2)** |
| GET | `/categories/:id` | **(público)** | — | — | **Pendiente (I2)** |
| PUT | `/categories/:id` | JWT | `{ name?, description? }` | — | **Pendiente (I2)** |
| DELETE | `/categories/:id` | JWT | — | Idempotente | **Pendiente (I2)** |

## Products (Catálogo)
| Método | Path | Auth | Query/Body | Notas | Estado |
|---|---|---|---|---|---|
| GET | `/products` | **(público)** | `page,pageSize,q,sort,categoryId,isOffer` | `discount 0–100` | **Pendiente (I2)** |
| POST | `/products` | JWT | `{ name,price,categoryId,description?,isOffer?,discount? }` | — | **Pendiente (I2)** |
| GET | `/products/:id` | **(público)** | — | — | **Pendiente (I2)** |
| PUT | `/products/:id` | JWT | `{ ...campos opcionales... }` | — | **Pendiente (I2)** |
| DELETE | `/products/:id` | JWT | — | Idempotente | **Pendiente (I2)** |

## Settings (Negocio)
| Método | Path | Auth | Body | Notas | Estado |
|---|---|---|---|---|---|
| GET | `/settings` | **(público)** | — | `isOpen`, contacto | **Pendiente (I3)** |
| PUT | `/settings` | JWT | `{ isOpen?, whatsapp?, address? }` | Admin + RBAC | **Pendiente (I3)** |

### Notas
- **Idempotencia**: `PUT`/`DELETE` deben ser idempotentes.  
- **Respuestas**: todas con envelope `{ ok, data?, error?, meta? }`.  
- **Deuda**: completar `openapi.yaml` con ejemplos por respuesta cuando se implemente cada módulo.

### Pendiente de completar (checklist)
- [ ] Confirmar límites de validación específicos por campo (longitudes, rangos).  
- [ ] Documentar mensajes de error **estables** por regla de negocio.  
- [ ] Agregar ejemplos reales a `openapi.yaml` (sección `examples`).  
