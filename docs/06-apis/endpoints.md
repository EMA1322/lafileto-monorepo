---
status: Draft
owner: Backend Lead + Front Leads
last_update: 2025-10-09
scope: Tabla sincronizada con OpenAPI v1; filtros/paginación/orden/búsqueda consolidados; “Pendiente” donde falte implementar.
---

> Fuente de verdad: `openapi.yaml`. Convenciones generales en [`api-guidelines.md`](./api-guidelines.md).  
> **Auth**: JWT **solo Admin**. Rutas públicas marcadas como **(público)**.

## Parámetros comunes
- `page` (>=1), `pageSize` (1..100, **default 20**), `sort` (`field:asc|desc`[, ...]), `q` (texto).
- Filtros de **Products**: `categoryId`, `isOffer`.


## Health
| Método | Path | Auth | 200 (data) | Notas |
|---|---|---|---|---|
| GET | `/health` | **(público)** | `{ ok:true, data:{ status, ts } }` | Endpoint de vida del servicio |

## Auth
| Método | Path | Auth | Body | 200 (data) | Errores |
|---|---|---|---|---|---|
| POST | `/auth/login` | — | `{ email, password }` | `{ token, user }` | 401, 422, 429 |
| GET | `/auth/me` | JWT | — | `User` | 401 |

## Users (Admin)
| Método | Path | Auth | Query/Body | Notas | Estado |
|---|---|---|---|---|---|
| GET | `/users` | JWT | `page,pageSize,q,sort` | Paginado/orden/búsqueda | **I1 listo** |
| POST | `/users` | JWT | `{ name,email,password,roleId }` | Email único | **I1 listo** |
| GET | `/users/:id` | JWT | — | — | **I1 listo** |
| PUT | `/users/:id` | JWT | `{ name?,email?,password?,roleId? }` | — | **I1 listo** |
| DELETE | `/users/:id` | JWT | — | Idempotente | **I1 listo** |

## Roles (Admin)
| Método | Path | Auth | Notas | Estado |
|---|---|---|---|---|
| GET | `/roles` | JWT | Catálogo para UI | **I1 listo** |
| GET | `/roles/:id` | JWT | — | **I1 listo** |

## Permissions (Admin)
| Método | Path | Auth | Body | Notas | Estado |
|---|---|---|---|---|---|
| GET | `/permissions` | JWT | — | Lista de acciones soportadas | **I1 listo** |
| GET | `/roles/:id/permissions` | JWT | — | Permisos efectivos por rol | **I1 listo** |
| PUT | `/roles/:id/permissions` | JWT | `{ permissions: Permission[] }` | Valida `moduleKey`/`action` | **I1 listo** |

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
