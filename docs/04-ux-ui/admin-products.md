# Modulo de Productos (Admin)

## Resumen

- Vista Admin productiva en `#/products`, implementada en React.
- Listado responsivo para `name`, `description`, `imageUrl`, `price`, `stock`, `status`, `categoryId` y resumen de oferta cuando existe.
- Acciones CRUD: crear, editar, cambiar estado (`draft`, `active`, `archived`) y eliminar definitivo con confirmacion.
- Offers se gestionan desde Products: `offer`, `hasOffer`, `discountPercent` y `finalPrice`.
- RBAC UI: controles visibles/activos segun permisos de `products` y `offers`.
- Estados remotos: loading, empty, error, paginacion con `meta.pageCount` y actualizaciones optimistas al cambiar estado.

## Captura

![Listado de productos](img/admin-products.png)

## Campos vigentes

| Campo             | Uso                                                                   |
| ----------------- | --------------------------------------------------------------------- |
| `name`            | Nombre visible del producto.                                          |
| `description`     | Descripcion opcional.                                                 |
| `imageUrl`        | URL absoluta opcional de imagen.                                      |
| `price`           | Precio base.                                                          |
| `stock`           | Stock numerico.                                                       |
| `status`          | Estado `draft`, `active` o `archived`; la UI puede agrupar inactivos. |
| `categoryId`      | Categoria asociada.                                                   |
| `offer`           | Resumen embebido de la oferta activa o `null`.                        |
| `hasOffer`        | Filtro canonico para productos con/sin oferta.                        |
| `discountPercent` | Porcentaje de descuento de la oferta.                                 |
| `finalPrice`      | Precio derivado cuando la oferta esta activa.                         |

No son contrato vigente de Products Admin: `slug`, `sku`, `currency` ni `isFeatured`. El backend puede tolerar algunos campos legacy de entrada por compatibilidad, pero la UI no debe mostrarlos, filtrarlos ni validarlos como campos productivos.

## Filtros soportados

| Parametro              | Descripcion                                                          |
| ---------------------- | -------------------------------------------------------------------- |
| `q`                    | Busqueda por nombre o descripcion (debounce 300 ms).                 |
| `categoryId`           | Selector de categoria, cargado desde Categories.                     |
| `status`               | Filtro de estado (`all`, `active`, `draft`, `archived`, `inactive`). |
| `hasOffer`             | Filtro canonico para oferta (`all`, `true`, `false`).                |
| `orderBy` / `orderDir` | Ordenamiento por `name`, `price`, `updatedAt` asc/desc.              |
| `page` / `pageSize`    | Paginacion con sincronizacion en hash.                               |

Los filtros se reflejan y restauran desde la URL (`#/products?...`) para mantener estado al navegar. El alias hash `offer` puede seguir existiendo como compatibilidad temporal hacia `hasOffer`, pero no debe documentarse como parametro canonico nuevo.

## Acciones y permisos

| Accion            | Permiso requerido       |
| ----------------- | ----------------------- |
| Crear producto    | `products:w`            |
| Editar producto   | `products:u`            |
| Cambiar estado    | `products:changeStatus` |
| Eliminar producto | `products:d`            |
| Crear oferta      | `offers:w`              |
| Editar oferta     | `offers:u`              |
| Eliminar oferta   | `offers:d`              |

> Si el usuario no tiene lectura de `products`, se redirige a la pantalla de no autorizado segun el router Admin.

## Estados del UI

- **Loading:** bloque de estado consistente con primitives React del Admin.
- **Empty:** mensaje contextual con CTA para crear si existe permiso.
- **Error:** mensaje recuperable con accion de reintento.
- **Paginacion:** controles sincronizados con `meta.pageCount`.
- **Optimista:** el cambio de estado actualiza la fila con la respuesta del `PATCH /products/:id/status`.

## Flujo de validacion

- `name` requerido.
- `price` >= 0 y `stock` >= 0.
- `categoryId` requerido.
- `status` debe ser `draft`, `active` o `archived`.
- `imageUrl`, si se envia, debe ser URL valida.
- Offers validan `discountPercent` dentro del rango aceptado por backend y derivan `finalPrice`; no se persiste `finalPrice` desde la UI.

## QA manual sugerido

1. **Listado + filtros:** cambiar `q`, `categoryId`, `status`, `hasOffer`, `orderBy`, `orderDir`, `page` y `pageSize`; validar `GET /api/v1/products` con parametros canonicos y restauracion al volver desde otra ruta.
2. **Crear producto:** completar el formulario modal, enviar `POST /api/v1/products` y verificar aparicion inmediata en listado.
3. **Editar producto:** modificar un registro existente, confirmar `PUT /api/v1/products/:id` y ver cambios reflejados.
4. **Cambiar estado:** probar `draft -> active` y `active -> archived`, confirmar `PATCH /api/v1/products/:id/status` y respuesta optimista.
5. **Eliminar:** confirmar modal, enviar `DELETE /api/v1/products/:id` y validar que desaparece y que el detalle posterior devuelve 404.
6. **Offers:** crear, editar y eliminar una oferta desde Products; confirmar `offer.discountPercent`, `offer.finalPrice` y `offer.isActive` en el listado.
7. **RBAC:** probar cuenta sin permisos `products:w`, `products:u`, `products:d`, `products:changeStatus`, `offers:w`, `offers:u` y `offers:d`.

## Estado de pruebas automatizadas

- La cobertura vigente vive en la suite Admin React (`pnpm -F admin test`), incluyendo contratos de Products, CRUD y Offers.
