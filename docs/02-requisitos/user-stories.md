---
status: Draft
owner: Product/UX + Tech Lead
last_update: 2025-10-08
scope: Historias por rol (Cliente/Admin) con criterios Gherkin; backlog MVP/Next.
---

## Introducción
Historias focalizadas en los flujos **críticos** del MVP, alineadas con [`/docs/02-requisitos/requisitos.md`](./requisitos.md).

## Historias — Cliente

### US-C1 Explorar catálogo por categorías
**Como** cliente **quiero** ver productos agrupados por categorías **para** comparar opciones rápidamente.

```gherkin
Scenario: Navegación por categorías
  Given estoy en la vista Products
  When selecciono una categoría
  Then veo el listado filtrado por esa categoría
  And puedo volver a ver todas las categorías
```

### US-C2 Ver ofertas en Home (Swiper)
**Como** cliente **quiero** ver ofertas destacadas **para** descubrir descuentos.
```gherkin
Scenario: Ofertas visibles en Home
  Given estoy en la Home
  When se renderiza el carrusel
  Then veo tarjetas de productos en oferta
  And puedo agregar al carrito desde cada tarjeta
```

### US-C3 Agregar un producto al carrito
```gherkin
Scenario: Agregar producto
  Given estoy en Products
  And el negocio está "abierto"
  When presiono "Agregar al carrito"
  Then el producto se agrega con cantidad 1
  And el subtotal del ítem se calcula correctamente
```

### US-C4 Editar cantidades en el carrito
```gherkin
Scenario: Editar cantidades
  Given tengo productos en el carrito
  When incremento o decremento la cantidad
  Then el total del carrito se actualiza
  And no se permiten cantidades negativas
```

### US-C5 Confirmar y enviar por WhatsApp
```gherkin
Scenario: Enviar pedido por WhatsApp
  Given revisé mi carrito
  When presiono "Confirmar"
  Then se genera un mensaje con ítems y totales
  And se abre WhatsApp con el texto listo para enviar
```

### US-C6 Negocio cerrado
```gherkin
Scenario: Compra deshabilitada por negocio cerrado
  Given el negocio está "cerrado"
  When navego el catálogo
  Then los botones de compra aparecen deshabilitados
  And veo un aviso informativo
```

## Historias — Admin

### US-A1 Iniciar sesión
```gherkin
Scenario: Login válido
  Given un usuario Admin existe
  When envío credenciales válidas
  Then recibo un JWT
  And puedo acceder al Dashboard
```

### US-A2 CRUD Categorías
```gherkin
Scenario: Crear categoría
  Given tengo permiso CREATE en categories
  When envío name y description válidos
  Then la categoría queda disponible para asignar a productos
```

### US-A3 CRUD Productos
```gherkin
Scenario: Crear producto con descuento válido
  Given tengo permiso CREATE en products
  And discount es 0–100
  When envío nombre, precio y categoryId
  Then el producto queda disponible
  And el offerPrice se calcula correctamente en la UI
```

### US-A4 Gestión de usuarios/roles/permissions (RBAC)
```gherkin
Scenario: Supervisor no puede eliminar productos
  Given ingreso con rol "Supervisor"
  When accedo a Products
  Then puedo leer/crear/editar
  And no veo la acción "Eliminar"
```

### US-A5 Settings (estado del negocio)
```gherkin
Scenario: Cerrar el negocio
  Given tengo permiso UPDATE en settings
  When seteo isOpen=false
  Then en Client los botones de compra quedan deshabilitados
```

## Categorías (Admin / Operador / Viewer)

### US-A-CAT-01 Crear categoría (Administrador)
**Como** Administrador **quiero** crear una categoría con nombre e imagen opcional **para** organizar el catálogo.

_Criterios de aceptación_
- `name` obligatorio, entre 2 y 50 caracteres después de trim, único sin diferenciar mayúsculas/minúsculas.
- `imageUrl` opcional; si se informa debe ser URL absoluta `http(s)`.
- La categoría nueva se crea con `active=true` y aparece en la primera página del listado.
- La API responde con envelope `{ ok:true, data:{ ... } }` y meta cuando corresponde.
- Errores de validación retornan `422 VALIDATION_ERROR` con detalle por campo; duplicados responden `409 CATEGORY_NAME_CONFLICT`.

_Definition of Done_
- Endpoint POST `/api/v1/categories` cubierto por prueba de integración (éxito + conflicto de nombre).
- Modal "Nueva categoría" en Admin SPA valida longitud/URL y muestra toast accesible de éxito/error.
- Registro actualizado en Postman (request + test básico) y en `/docs/06-apis/endpoints.md`.

### US-A-CAT-02 Editar categoría (Administrador / Supervisor con update)
**Como** operador con permisos de actualización **quiero** editar nombre o imagen de una categoría existente **para** mantenerla vigente.

_Criterios de aceptación_
- PUT `/api/v1/categories/:id` acepta `name` y/o `imageUrl` opcionales; si no cambian los valores devuelve el registro sin error.
- Validaciones idénticas a la creación (longitud, unicidad, URL).
- Se conserva el estado `active` actual.
- La UI precarga los datos, evita envíos duplicados y refleja errores 422/404 con mensajes claros.

_Definition of Done_
- Pruebas de integración cubren PUT feliz, 404 y 409 por nombre duplicado.
- Modal "Editar" en Admin SPA previene enviar más de 50 caracteres y usa loading state.
- Documentación actualizada (contrato y troubleshooting) con mensajes de error esperados.

### US-A-CAT-03 Cambiar estado activo (Administrador / Supervisor con update)
**Como** operador autorizado **quiero** activar o desactivar categorías **para** controlar su visibilidad en listados y formularios.

_Criterios de aceptación_
- PATCH `/api/v1/categories/:id` recibe `{ active:boolean }` y es idempotente (sin cambios → misma respuesta).
- El listado Admin permite filtrar por `status=all|active|inactive` y refleja la nueva condición sin recargar toda la página.
- La UI realiza rollback si la API devuelve error y muestra toast accesible.

_Definition of Done_
- Test de integración cubre cambios `true→false` y `false→true` + idempotencia.
- Modal "Ver/Toggle" indica estado actual con switch accesible (`aria-checked`).
- Registro de la funcionalidad en `/docs/06-apis/endpoints.md` y guía de troubleshooting.

### US-A-CAT-04 Eliminar categoría (Administrador)
**Como** Administrador **quiero** eliminar categorías sin uso **para** mantener limpio el catálogo.

_Criterios de aceptación_
- DELETE `/api/v1/categories/:id` requiere permiso `categories:d` y retorna `{ ok:true, data:{ deleted:true } }`.
- La operación debe validar dependencias con productos cuando exista la relación (hoy sin enforcement → documentar deuda).
- En caso de inexistencia se retorna `404 CATEGORY_NOT_FOUND`.
- La UI confirma en modal y remueve el registro del listado al éxito.

_Definition of Done_
- Prueba de integración cubre borrado feliz y 404.
- Modal "Eliminar" documentado y con mensajes claros; se registra limitación sobre dependencias.
- Checklist de smoke actualizado (API + Admin) con esta acción.

### US-O-CAT-05 Listar y filtrar categorías (Viewer)
**Como** usuario con permiso de lectura **quiero** listar categorías con filtros y paginación **para** revisar información sin modificarla.

_Criterios de aceptación_
- GET `/api/v1/categories` requiere JWT con `categories:r` y soporta `page`, `pageSize (5..100)`, `q`, `status`, `orderBy=name|createdAt|updatedAt`, `orderDir` y `all=true`.
- La respuesta siempre incluye envelope `{ ok, data:{ items[], meta{} } }` con `meta.page`, `meta.pageSize`, `meta.total`, `meta.pageCount`.
- Usuarios con solo lectura no ven botones de crear/editar/eliminar en la UI (RBAC en cliente).
- Se contemplan estados `loading`, `empty` y `error` accesibles.

_Definition of Done_
- Test de integración asegura que el Viewer (sin permisos w/u/d) recibe 403 en acciones prohibidas.
- Admin SPA muestra tabla, filtros y paginación funcionales conectados al backend real.
- Documentación (endpoints + UX) describe parámetros, estados y límites; Postman incluye ejemplo paginado.

> NOTE: La relación Category ↔ Product aún no impide eliminar categorías con productos asociados; registrar deuda técnica cuando se implemente.

## Backlog

### MVP
- US-C1, US-C2, US-C3, US-C4, US-C5, US-C6
- US-A1, US-A2, US-A3, US-A4 (mínimo), US-A5

### Next
- Búsqueda avanzada y orden múltiple en Client.
- Paginación configurable en listados Admin.
- Estadísticas básicas en Dashboard.
- Modo accesibilidad de alto contraste.
