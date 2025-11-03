# Módulo de Productos (Admin)

## Resumen
- Vista SPA en `#/products` con filtros persistidos en el hash.
- Tabla responsiva + tarjetas móviles para listar `name`, `sku`, `price`, `stock`, `status`, `category`, `updatedAt`.
- Acciones CRUD: crear, editar, cambiar estado (`draft`, `active`, `archived`) y eliminar definitivo con confirmación.
- RBAC UI: controles visibles/activos según `can('products', permiso)`.
- Estados remotos: loading, empty, error, paginación con `meta.pageCount` y actualizaciones optimistas al cambiar estado.

## Captura
![Listado de productos](img/admin-products.png)

## Filtros soportados
| Parámetro | Descripción |
|-----------|-------------|
| `q` | Búsqueda por nombre o SKU (debounce 300 ms). |
| `category` | Selector de categoría (cargado desde `/categories?all=1`). |
| `status` | Filtro de estado (`draft`, `active`, `archived`). |
| `isFeatured` | Toggle para productos destacados. |
| `orderBy` / `orderDir` | Ordenamiento por `name`, `price`, `updatedAt` asc/desc. |
| `page` / `pageSize` | Paginación con sincronización en hash. |

Los filtros se reflejan y restauran desde la URL (`#/products?...`) para mantener estado al navegar.

## Acciones y permisos
| Acción | Permiso requerido |
|--------|-------------------|
| Crear producto | `can('products', 'w')` |
| Editar producto | `can('products', 'u')` |
| Cambiar estado | `can('products', 'changeStatus')` |
| Eliminar producto | `can('products', 'd')` |

> Si el usuario no tiene `can('products', 'r')` se redirige a `#/no-access`.

## Estados del UI
- **Loading:** skeletons en filtros, tabla y cards.
- **Empty:** mensaje contextual con CTA para crear (si existe permiso `w`).
- **Error:** snackbar/toast con texto proveniente de `mapApiError` y botón reintentar.
- **Paginación:** navegación con flechas, primero/último y sincronización de `meta.pageCount`.
- **Optimista:** el botón de cambiar estado muestra spinner y actualiza la fila con la respuesta del `PATCH /products/:id/status`.

## Flujo de validación
- `price` ≥ 0 y `stock` ≥ 0 (inputs numéricos). 
- Slug y SKU únicos: si el backend devuelve `409 RESOURCE_CONFLICT`, se destaca el campo correspondiente y se muestra toast.
- Slug autogenerado en `kebab-case`; SKU normalizado a mayúsculas.

## QA manual sugerido
1. **Listado + filtros:** cambiar cada filtro (`q`, `category`, `status`, `isFeatured`, `orderBy`, `orderDir`, `page`, `pageSize`) y validar petición `GET /products` con parámetros correctos y restauración al volver desde otra ruta.
2. **Crear producto:** completar el formulario modal, enviar `POST /products` y verificar aparición inmediata en listado.
3. **Editar:** modificar un registro existente, confirmar `PUT /products/:id` y ver cambios reflejados.
4. **Cambiar estado:** probar `draft → active → archived`, confirmar `PATCH /products/:id/status` y respuesta optimista.
5. **Eliminar:** confirmar modal, enviar `DELETE /products/:id` y validar que desaparece y que `GET /products/:id` devuelve 404.
6. **Conflictos 409:** intentar crear/editar con slug o SKU duplicados para ver toast y marcado del campo.
7. **RBAC:** probar cuenta sin permisos `w`, `u`, `d`, `changeStatus` y validar visibilidad/disabled.

## Estado de pruebas automatizadas
- `pnpm --filter admin lint` y `pnpm --filter admin test` no pudieron ejecutarse en este entorno por bloqueo 403 al descargar `pnpm` vía Corepack.
