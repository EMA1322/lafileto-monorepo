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

## Backlog

### MVP
- US-C1, US-C2, US-C3, US-C4, US-C5, US-C6
- US-A1, US-A2, US-A3, US-A4 (mínimo), US-A5

### Next
- Búsqueda avanzada y orden múltiple en Client.
- Paginación configurable en listados Admin.
- Estadísticas básicas en Dashboard.
- Modo accesibilidad de alto contraste.
