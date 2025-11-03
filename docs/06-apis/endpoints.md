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
- Filtros de **Products**: `q`, `status`, `categoryId`, `isFeatured`, `priceMin`, `priceMax`, `orderBy`, `orderDir`, `all`.


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


## Categories (Admin)

### Parámetros soportados (GET `/api/v1/categories`)

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `page` | number | `1` | Página actual (`>=1`). |
| `pageSize` | number | `10` | Límite por página (`5..100`). |
| `q` | string | — | Búsqueda parcial por nombre (case-insensitive). |
| `status` | enum | `all` | `all`, `active`, `inactive`. |
| `orderBy` | enum | `name` | `name`, `createdAt`, `updatedAt`. |
| `orderDir` | enum | `asc` | `asc` o `desc`. |
| `all` | boolean | `false` | Si es `true`, fuerza `page=1` y `pageSize=100`. |

La búsqueda (`q`) utiliza `contains` con `mode: 'insensitive'` en Prisma, por lo que ignora mayúsculas y minúsculas.

### Endpoints

| Método | Path | Permiso | Body / Query | 200 (data) |
|---|---|---|---|---|
| GET | `/api/v1/categories` | `categories:r` | Query arriba | `{ ok:true, data:{ items[{ id,name,imageUrl,active }], meta{ page,pageSize,total,pageCount } } }` |
| GET | `/api/v1/categories/:id` | `categories:r` | — | `{ ok:true, data:{ id,name,imageUrl,active } }` |
| POST | `/api/v1/categories` | `categories:w` | `{ name:string[2..50], imageUrl?:URL }` | `{ ok:true, data:{ id,name,imageUrl,active:true } }` (201) |
| PUT | `/api/v1/categories/:id` | `categories:u` | `{ name?, imageUrl? }` | `{ ok:true, data:{ id,name,imageUrl,active } }` |
| PATCH | `/api/v1/categories/:id` | `categories:u` | `{ active:boolean }` | `{ ok:true, data:{ id,name,imageUrl,active } }` |
| DELETE | `/api/v1/categories/:id` | `categories:d` | — | `{ ok:true, data:{ deleted:true } }` |

> NOTE: No existe endpoint público `/categories`; la Client SPA reutiliza estos endpoints protegidos y hoy falla al parsear el envelope (`data.items`).

### Ejemplos

**GET paginado**
```http
GET /api/v1/categories?page=1&pageSize=10&status=all&orderBy=name&orderDir=asc
Authorization: Bearer <token>
Accept: application/json
```

```json
{
  "ok": true,
  "data": {
    "items": [
      { "id": "cat-001", "name": "Bebidas", "imageUrl": "https://cdn.example.com/cat/bebidas.png", "active": true },
      { "id": "cat-002", "name": "Pastas", "imageUrl": null, "active": false }
    ],
    "meta": {
      "page": 1,
      "pageSize": 10,
      "total": 5,
      "pageCount": 1
    }
  }
}
```

**POST**
```http
POST /api/v1/categories
Authorization: Bearer <token>
Content-Type: application/json

{ "name": "Carnes", "imageUrl": "https://cdn.example.com/cat/carnes.webp" }
```

```json
{
  "ok": true,
  "data": {
    "id": "cat-abc123",
    "name": "Carnes",
    "imageUrl": "https://cdn.example.com/cat/carnes.webp",
    "active": true
  }
}
```

**Error 409**
```json
{
  "ok": false,
  "error": {
    "code": "CATEGORY_NAME_CONFLICT",
    "message": "La categoría indicada ya existe."
  }
}
```

### RBAC (moduleKey=`categories`)

| Acción | Descripción | `role-admin` | `role-supervisor` (seed) | `role-viewer` |
|---|---|---|---|---|
| `r` | Listar / ver detalle | ✔︎ | ✔︎ | ✔︎ |
| `w` | Crear | ✔︎ | ✔︎ | ✖︎ |
| `u` | Editar / toggle | ✔︎ | ✔︎ | ✖︎ |
| `d` | Eliminar | ✔︎ | ✖︎ | ✖︎ |

> NOTE: Suites de integración modelan supervisor solo lectura; alinear fixtures con seeds.

### Errores frecuentes

| Código | HTTP | Descripción | Acción recomendada |
|---|---|---|---|
| `PERMISSION_DENIED` | 403 | Falta permiso requerido (`categories:w/u/d`). | Revisar `effectivePermissions` en sesión o seeds. |
| `CATEGORY_NOT_FOUND` | 404 | ID inexistente o eliminada previamente. | Confirmar `id` antes de invocar PUT/PATCH/DELETE. |
| `CATEGORY_NAME_CONFLICT` | 409 | Nombre duplicado (trim/case insensitive). | Ajustar `name` en formulario. |
| `VALIDATION_ERROR` | 422 | Longitud inválida (`<2` o `>50`) o URL no válida. | Validar campos en UI antes de enviar. |

### Comandos de verificación (smoke manual)

```bash
# Listado con meta (JWT requerido)
curl -s -H "Authorization: Bearer $ADMIN_JWT" \
  "http://localhost:3000/api/v1/categories?page=1&pageSize=10&status=all" | jq '.'

# Crear categoría
timestamp=$(date +%s)
curl -s -X POST -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Bebidas ${timestamp}\",\"imageUrl\":\"https://cdn.example.com/cat/${timestamp}.png\"}" \
  http://localhost:3000/api/v1/categories | jq '.'

# Toggle active
curl -s -X PATCH -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{"active":false}' \
  http://localhost:3000/api/v1/categories/<id> | jq '.'

# Eliminar
curl -s -X DELETE -H "Authorization: Bearer $ADMIN_JWT" \
  http://localhost:3000/api/v1/categories/<id> | jq '.'
```



## Products (Admin)

### Parámetros soportados (GET `/api/v1/products`)

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `page` | number | `1` | Página actual (`>=1`). |
| `pageSize` | number | `10` | Límite por página (`5..100`). |
| `q` | string | — | Búsqueda parcial por `name`, `slug` o `sku` (case-insensitive). |
| `status` | enum | `all` | `all`, `draft`, `active`, `archived`. |
| `categoryId` | string | — | Filtra por categoría asociada. |
| `isFeatured` | boolean | `false` | Si está presente, filtra por destacados. |
| `priceMin` | number | — | Precio mínimo (>=0). |
| `priceMax` | number | — | Precio máximo (>= `priceMin`). |
| `orderBy` | enum | `name` | `name`, `price`, `updatedAt`. |
| `orderDir` | enum | `asc` | `asc` o `desc`. |
| `all` | boolean | `false` | Si es `true`, fuerza `page=1` y `pageSize=100`. |

### Endpoints

| Método | Path | Permiso | Body / Query | 200 (data) |
|---|---|---|---|---|
| GET | `/api/v1/products` | `products:r` | Query arriba | `{ ok:true, data:{ items[{ id,name,slug,sku,description?,price,currency,stock,status,isFeatured,categoryId,createdAt,updatedAt }], meta{ page,pageSize,total,pageCount } } }` |
| GET | `/api/v1/products/:id` | `products:r` | — | `{ ok:true, data:{ id,name,slug,sku,description?,price,currency,stock,status,isFeatured,categoryId,createdAt,updatedAt } }` |
| POST | `/api/v1/products` | `products:w` | `{ name, slug, sku, price, currency?, stock, status?, isFeatured?, description?, categoryId }` | `{ ok:true, data:Product }` (201) |
| PUT | `/api/v1/products/:id` | `products:u` | `{ name?, slug?, sku?, price?, currency?, stock?, status?, isFeatured?, description?, categoryId? }` | `{ ok:true, data:Product }` |
| PATCH | `/api/v1/products/:id/status` | `products:changeStatus` | `{ status:"draft|active|archived" }` | `{ ok:true, data:Product }` |
| DELETE | `/api/v1/products/:id` | `products:d` | — | `{ ok:true, data:{ id, deleted:true } }` |

> `price` se almacena como `Decimal(10,2)` pero se serializa como número (`float`) en el envelope. `slug` (kebab-case) y `sku` (A–Z, 0–9, `-`, `_`) son únicos.

### Ejemplos

**GET con filtros y orden**
```http
GET /api/v1/products?q=pollo&status=active&categoryId=cat-001&isFeatured=true&priceMin=2000&priceMax=2600&orderBy=price&orderDir=desc&page=1&pageSize=1
Authorization: Bearer <token_admin>
Accept: application/json
```

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "prod-001",
        "name": "Pollo al Horno",
        "slug": "pollo-al-horno",
        "sku": "POL-001",
        "description": "Clásico de la casa",
        "price": 2500,
        "currency": "ARS",
        "stock": 15,
        "status": "active",
        "isFeatured": true,
        "categoryId": "cat-001",
        "createdAt": "2024-01-01T10:00:00.000Z",
        "updatedAt": "2024-01-05T12:00:00.000Z"
      }
    ],
    "meta": {
      "page": 1,
      "pageSize": 1,
      "total": 2,
      "pageCount": 2
    }
  }
}
```

**POST**
```http
POST /api/v1/products
Authorization: Bearer <token_admin>
Content-Type: application/json

{
  "name": "Ravioles de espinaca",
  "slug": "ravioles-de-espinaca",
  "sku": "RAV-010",
  "price": 1850.5,
  "stock": 30,
  "status": "draft",
  "categoryId": "cat-001"
}
```

```json
{
  "ok": true,
  "data": {
    "id": "prod-xyz123",
    "name": "Ravioles de espinaca",
    "slug": "ravioles-de-espinaca",
    "sku": "RAV-010",
    "description": null,
    "price": 1850.5,
    "currency": "ARS",
    "stock": 30,
    "status": "draft",
    "isFeatured": false,
    "categoryId": "cat-001",
    "createdAt": "2025-03-20T15:12:00.000Z",
    "updatedAt": "2025-03-20T15:12:00.000Z"
  }
}
```

**PATCH status**
```http
PATCH /api/v1/products/prod-xyz123/status
Authorization: Bearer <token_supervisor>
Content-Type: application/json

{ "status": "active" }
```

```json
{
  "ok": true,
  "data": {
    "id": "prod-xyz123",
    "status": "active",
    "updatedAt": "2025-03-20T15:20:00.000Z"
  }
}
```

**Error 409 (slug o SKU duplicado)**
```json
{
  "ok": false,
  "error": {
    "code": "RESOURCE_CONFLICT",
    "message": "El slug ya está en uso."
  }
}
```

### RBAC (moduleKey=`products`)

| Acción | Descripción | `role-admin` | `role-supervisor` (seed) | `role-viewer` |
|---|---|---|---|---|
| `r` | Listar / ver detalle | ✔︎ | ✔︎ | ✔︎ |
| `w` | Crear | ✔︎ | ✔︎ | ✖︎ |
| `u` | Editar | ✔︎ | ✔︎ | ✖︎ |
| `d` | Eliminar | ✔︎ | ✖︎ | ✖︎ |
| `changeStatus` | Cambiar estado (`draft/active/archived`) | ✔︎ | ✔︎ | ✖︎ |

### Errores frecuentes

| Código | HTTP | Descripción | Acción recomendada |
|---|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Producto inexistente o ID inválido. | Confirmar `id` antes de invocar GET/PUT/PATCH/DELETE. |
| `RESOURCE_CONFLICT` | 409 | `slug` o `sku` duplicados (`P2002`). | Ajustar valores únicos antes de reintentar. |
| `VALIDATION_ERROR` | 422 | Campos fuera de rango (precio <0, stock <0, slug inválido, categoría inexistente). | Validar datos en UI; verificar categoría. |
| `PERMISSION_DENIED` | 403 | Falta del permiso (`products:w/u/d/changeStatus`). | Revisar rol y seeds. |

### Comandos de verificación (smoke manual)

```bash
# crear producto
curl -X POST "$API_BASE/api/v1/products" \
 -H "Authorization: Bearer $TOKEN_ADMIN" -H "Content-Type: application/json" \
 -d '{"name":"Pollo al horno","slug":"pollo-al-horno","sku":"POL-001","price":2500.00,"stock":10,"status":"active","categoryId":"cat-001"}' | jq '.'

# listar con filtros
curl "$API_BASE/api/v1/products?q=pollo&page=1&pageSize=10&orderBy=updatedAt&orderDir=desc" \
 -H "Authorization: Bearer $TOKEN_VIEWER" | jq '.'

# duplicado de slug → 409
curl -X POST "$API_BASE/api/v1/products" \
 -H "Authorization: Bearer $TOKEN_ADMIN" -H "Content-Type: application/json" \
 -d '{"name":"Pollo BBQ","slug":"pollo-al-horno","sku":"POL-999","price":2100,"stock":5,"status":"draft","categoryId":"cat-001"}' | jq '.'

# cambiar status
curl -X PATCH "$API_BASE/api/v1/products/prod-001/status" \
 -H "Authorization: Bearer $TOKEN_SUPERVISOR" -H "Content-Type: application/json" \
 -d '{"status":"archived"}' | jq '.'
```

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
