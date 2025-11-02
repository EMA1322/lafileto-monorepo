---
status: Draft
owner: Product/UX
last_update: 2025-10-08
scope: Principios, flujos críticos, patrones y checklist.
---

## Principios
Claro > lindo; consistencia; mobile-first; bajo costo cognitivo; velocidad percibida.

## Flujos críticos
Client: Home (ofertas con Swiper sólo aquí) → Products → Cart → Confirm (WhatsApp).  
Admin: Login → Dashboard → Categories/Products/Users → Settings.

## Patrones
- **Card** producto: imagen, título, precio/offerPrice, CTA.
- **Modal** confirmación: `role="dialog"`, focus trap, cerrar con Esc.
- **Snackbar**: 3–5s, `aria-live="polite"`.

## Checklist
- [ ] CTA principal visible en mobile
- [ ] Labels siempre visibles
- [ ] Modales accesibles
- [ ] Validación in-line

## Flujos — Categorías (Admin)

### Listado
- Ruta `/#/categories` carga toolbar con búsqueda (debounce 300 ms), filtro `status`, orden asc/desc y botón **+ Nueva** (requiere `categories:w`).
- Tabla semántica con estados: `is-loading` (skeleton), `has-error` (mensaje con código) y `is-empty` (copy orientado a acción).
- Columna **#Productos** muestra `—` con tooltip hasta que exista conteo real.
- Paginación (`page`, `pageSize`) comparte componente con Users; resumen en footer.

```
[Buscar | Status | Orden | +Nueva]
         |
┌───────────────────────────────┐
│ Tabla Categorías              │
│ [ID][Nombre][Imagen][#Prod][Estado][Acciones]
└───────────────────────────────┘
         |
[‹ Prev] 1 [Next ›]
```

### Alta / Edición
- Modales con focus trap (`role="dialog"`, `aria-modal="true"`), formulario con validaciones inline (nombre 2–50, URL http/https).
- Botón primario se deshabilita hasta cumplir validaciones; spinner inline mientras se envía.
- Toast de éxito/error (`aria-live="polite"`) y cierre automático; en error se mantiene modal abierto.
- Edición reutiliza modal con valores precargados y advierte límite 50 caracteres.

### Toggle / Eliminación
- Acción **Ver** abre modal compacto con switch `role="switch"` (`aria-checked`) para `active`; cambio es optimista con rollback.
- Acción **Eliminar** abre modal de confirmación (botón danger) y mensaje sobre impacto futuro en productos.
- Errores `CATEGORY_NOT_FOUND` o `PERMISSION_DENIED` muestran toast rojo y dejan fila sin cambios.

### Estados vacíos / error
- Vacío: ilustración + CTA “Crear la primera categoría”.
- Error: banner rojo con detalle de `error.message` y botón “Reintentar” que vuelve a ejecutar `fetch`.

> NOTE: Client SPA usa botones por categoría; corregir consumo de envelope antes de documentar flujo público final.
