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
- Filtros de **Products**: `q`, `status`, `categoryId`, `priceMin`, `priceMax`, `orderBy`, `orderDir`, `all`.


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
| `q` | string | — | Búsqueda parcial por `name` o `description` (case-insensitive según collation de la DB). |
| `status` | enum | `all` | `all`, `draft`, `active`, `archived`. |
| `categoryId` | string | — | Filtra por categoría asociada. |
| `priceMin` | number | — | Precio base mínimo (>=0). |
| `priceMax` | number | — | Precio base máximo (>= `priceMin`). |
| `orderBy` | enum | `name` | `name`, `price`, `updatedAt`. |
| `orderDir` | enum | `asc` | `asc` o `desc`. |
| `all` | boolean | `false` | Si es `true`, fuerza `page=1` y `pageSize=100`. |

### Endpoints

| Método | Path | Permiso | Body / Query | 200 (data) |
|---|---|---|---|---|
| GET | `/api/v1/products` | `products:r` | Query arriba | `{ ok:true, data:{ items[{ id,name,description?,imageUrl,price,stock,status,categoryId,createdAt,updatedAt,offer?{ id?,discountPercent,startAt?,endAt?,isActive,finalPrice } }], meta{ page,pageSize,total,pageCount } } }` |
| GET | `/api/v1/products/:id` | `products:r` | — | `{ ok:true, data:{ id,name,description?,imageUrl,price,stock,status,categoryId,createdAt,updatedAt,offer?{ id?,discountPercent,startAt?,endAt?,isActive,finalPrice } } }` |
| POST | `/api/v1/products` | `products:w` | `{ name, description?, imageUrl?, price, stock, status?, categoryId }` | `{ ok:true, data:ProductConOferta? }` (201) |
| PUT | `/api/v1/products/:id` | `products:u` | `{ name?, description?, imageUrl?, price?, stock?, status?, categoryId? }` | `{ ok:true, data:ProductConOferta? }` |
| PATCH | `/api/v1/products/:id/status` | `products:changeStatus` | `{ status:"draft|active|archived" }` | `{ ok:true, data:Product }` |
| DELETE | `/api/v1/products/:id` | `products:d` | — | `{ ok:true, data:{ id, deleted:true } }` |

> `imageUrl` es opcional y debe ser una URL absoluta `http`/`https` (máx. 2048 caracteres). Si no se envía, queda en `null`.
> `offer` aparece únicamente cuando existe una oferta vigente para el producto (`discountPercent`, `startAt?`, `endAt?`, `isActive`, `finalPrice`). Si no hay oferta activa se devuelve `offer: null`.
> `finalPrice = price * (1 - discountPercent/100)` redondeado a 2 decimales cuando la oferta está activa; caso contrario el precio expuesto es el base.
> Filtros soportados: `q`, `status`, `categoryId`, `priceMin`, `priceMax`, `orderBy`, `orderDir`, `all`. No existen filtros `slug`, `sku`, `currency` ni `isFeatured`.

### Ejemplos

**GET con filtros y orden**
```http
GET /api/v1/products?q=pollo&status=active&categoryId=cat-001&priceMin=2000&priceMax=2600&orderBy=price&orderDir=desc&page=1&pageSize=1
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
        "description": "Clásico de la casa",
        "price": 2500,
        "stock": 15,
        "status": "active",
        "categoryId": "cat-001",
        "createdAt": "2024-01-01T10:00:00.000Z",
        "updatedAt": "2024-01-05T12:00:00.000Z",
        "offer": {
          "id": "offer-001",
          "discountPercent": 10,
          "startAt": "2024-01-01T00:00:00.000Z",
          "endAt": "2026-01-01T00:00:00.000Z",
          "isActive": true,
          "finalPrice": 2250
        }
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
  "description": "Con salsa rosa",
  "imageUrl": "https://cdn.example.com/products/ravioles.png",
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
    "description": "Con salsa rosa",
    "imageUrl": "https://cdn.example.com/products/ravioles.png",
    "price": 1850.5,
    "stock": 30,
    "status": "draft",
    "categoryId": "cat-001",
    "createdAt": "2025-03-20T15:12:00.000Z",
    "updatedAt": "2025-03-20T15:12:00.000Z",
    "offer": null
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

> Una oferta está activa si:
> - tiene `startAt` y `endAt` y se cumple `startAt ≤ now ≤ endAt`;
> - sólo `startAt` y `startAt ≤ now`;
> - sólo `endAt` y `now ≤ endAt`;
> - ninguna de las fechas (vigente siempre).

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
| `VALIDATION_ERROR` | 422 | Campos fuera de rango (precio <0, stock <0, URL inválida, categoría inexistente). | Validar datos en UI; verificar categoría. |
| `PERMISSION_DENIED` | 403 | Falta del permiso (`products:w/u/d/changeStatus`). | Revisar rol y seeds. |

### Comandos de verificación (smoke manual)

```bash
# crear producto
curl -X POST "$API_BASE/api/v1/products" \
  -H "Authorization: Bearer $TOKEN_ADMIN" -H "Content-Type: application/json" \
  -d '{"name":"Pollo al horno","description":"Clásico", "imageUrl":"https://cdn.example.com/prod/pollo.png","price":2500.00,"stock":10,"status":"active","categoryId":"cat-001"}' | jq '.'

# listar con filtros
curl "$API_BASE/api/v1/products?q=pollo&page=1&pageSize=10&orderBy=updatedAt&orderDir=desc" \
 -H "Authorization: Bearer $TOKEN_VIEWER" | jq '.'

# cambiar status
curl -X PATCH "$API_BASE/api/v1/products/prod-001/status" \
  -H "Authorization: Bearer $TOKEN_SUPERVISOR" -H "Content-Type: application/json" \
  -d '{"status":"archived"}' | jq '.'
```

## Offers (Admin)

### Parámetros soportados (GET `/api/v1/offers`)

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `page` | number | `1` | Página actual (`>=1`). |
| `pageSize` | number | `10` | Límite por página (`5..100`). |
| `q` | string | — | Búsqueda parcial por `product.name` o `product.description` (case-insensitive). |
| `status` | enum | `all` | Reutiliza filtro de productos (`draft`, `active`, `archived`, `all`). |
| `categoryId` | string | — | Filtra por categoría exacta. |
| `priceMin` / `priceMax` | number | — | Rango de precio base. |
| `orderBy` | enum | `name` | `name`, `price`, `updatedAt`. |
| `orderDir` | enum | `asc` | `asc` o `desc`. |
| `activeOnly` | boolean | `false` | Si es `true`, sólo devuelve ofertas vigentes a la fecha del request. |
| `all` | boolean | `false` | Devuelve todo el conjunto (sin paginar) respetando `pageSize` normalizado. |

> Respuesta: `{ ok:true, data:{ items[{ id,productId,discountPercent,startAt?,endAt?,isActive,finalPrice,product{ id,name,description?,imageUrl,price,stock,status,categoryId,createdAt,updatedAt } }], meta{ page,pageSize,total,pageCount } } }`.

| Método | Path | Permiso | Query/Body | 200 (data) |
|---|---|---|---|---|
| GET | `/api/v1/offers` | `offers:r` | Query arriba | Lista paginada de ofertas (incluye `product` embebido). |
| POST | `/api/v1/offers` | `offers:w` | `{ productId, discountPercent, startAt?, endAt? }` | `{ ok:true, data:Offer }` (201) |
| PUT | `/api/v1/offers/:id` | `offers:u` | `{ discountPercent?, startAt?, endAt? }` | `{ ok:true, data:Offer }` |
| DELETE | `/api/v1/offers/:id` | `offers:d` | — | `{ ok:true, data:{ id, deleted:true } }` |

**Ejemplo**

```http
GET /api/v1/offers?page=1&pageSize=2&orderBy=price&orderDir=asc
Authorization: Bearer <token_admin>
Accept: application/json
```

```json
{
  "ok": true,
  "data": {
    "items": [
      {
        "id": "offer-002",
        "productId": "prod-002",
        "discountPercent": 20,
        "startAt": "2024-02-01T00:00:00.000Z",
        "endAt": null,
        "isActive": true,
        "finalPrice": 1680,
        "product": {
          "id": "prod-002",
          "name": "Pollo a la Parrilla",
          "description": "Servido con papas rústicas",
          "imageUrl": null,
          "price": 2100,
          "stock": 12,
          "status": "active",
          "categoryId": "cat-001",
          "createdAt": "2024-01-05T10:00:00.000Z",
          "updatedAt": "2024-01-05T10:00:00.000Z"
        }
      }
    ],
    "meta": {
      "page": 1,
      "pageSize": 2,
      "total": 1,
      "pageCount": 1
    }
  }
}
```

**POST /offers**

```http
POST /api/v1/offers
Authorization: Bearer <token_admin>
Content-Type: application/json

{ "productId": "prod-001", "discountPercent": 15, "startAt": "2024-03-01T00:00:00.000Z", "endAt": "2025-03-01T00:00:00.000Z" }
```

```json
{
  "ok": true,
  "data": {
    "id": "offer-010",
    "productId": "prod-001",
    "discountPercent": 15,
    "startAt": "2024-03-01T00:00:00.000Z",
    "endAt": "2025-03-01T00:00:00.000Z",
    "isActive": true,
    "finalPrice": 2125,
    "product": {
      "id": "prod-001",
      "name": "Pollo al Horno",
      "price": 2500,
      "stock": 15,
      "status": "active",
      "categoryId": "cat-001",
      "createdAt": "2024-01-01T10:00:00.000Z",
      "updatedAt": "2024-01-05T12:00:00.000Z"
    }
  }
}
```

**Reglas de validación**

- `discountPercent` entero `1..100`.
- `startAt` / `endAt` aceptan `null` o fechas válidas; si ambos están presentes se exige `startAt <= endAt`.
- Cada producto sólo puede tener **una** oferta vigente a la vez (`CONFLICT` cuando ya existe una oferta para `productId`).
- El producto asociado debe existir.
- `activeOnly=1` en el listado devuelve únicamente ofertas que cumplen la ventana de vigencia. Las ofertas activas se reflejan automáticamente en `/products` como resumen (`offer.discountPercent`, `offer.finalPrice`, fechas e `isActive`). Al eliminar o expirar la oferta el resumen vuelve a `null`.

### RBAC (moduleKey=`offers`)

| Acción | Descripción | `role-admin` | `role-supervisor` (seed) | `role-viewer` |
|---|---|---|---|---|
| `r` | Listar ofertas (paginado, con `product` embebido) | ✔︎ | ✔︎ | ✔︎ |
| `w` | Crear ofertas | ✔︎ | ✔︎ | ✖︎ |
| `u` | Editar ofertas | ✔︎ | ✔︎ | ✖︎ |
| `d` | Eliminar ofertas | ✔︎ | ✖︎ | ✖︎ |

### Comandos de verificación (smoke manual)

```bash
# listado de ofertas activas
curl "$API_BASE/api/v1/offers?page=1&pageSize=10" \
  -H "Authorization: Bearer $ADMIN_JWT" | jq '.'

# crear oferta
curl -X POST "$API_BASE/api/v1/offers" \
  -H "Authorization: Bearer $ADMIN_JWT" -H "Content-Type: application/json" \
  -d '{"productId":"prod-001","discountPercent":25,"startAt":"2024-03-01T00:00:00.000Z","endAt":"2025-03-01T00:00:00.000Z"}' | jq '.'

# listado de productos con resumen de oferta embebido
curl "$API_BASE/api/v1/products?page=1&pageSize=10" \
  -H "Authorization: Bearer $VIEWER_JWT" | jq '.'
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
