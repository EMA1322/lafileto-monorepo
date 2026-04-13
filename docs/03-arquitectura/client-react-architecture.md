---
status: Aprobado
owner: Frontend Lead + Tech Lead
last_update: 2026-04-13
scope: Arquitectura vigente del client React público, flujo de datos y reglas de extensión.
---

# Arquitectura vigente del client React público

## 1. Propósito del documento
Este documento describe la arquitectura **actual y productiva** de `apps/client` para desarrollo diario.

Objetivos operativos:
- acelerar onboarding técnico;
- evitar regresiones de arquitectura;
- alinear futuros PRs de frontend público;
- dejar explícito qué prácticas legacy no deben reintroducirse.

## 2. Estado actual del client público
Estado vigente (Fase 5.3):
- El **client React es la base oficial** del frontend público.
- El flujo principal público corre en React: **Home, Products, Cart y Confirm**.
- La fuente de datos productiva para catálogo/configuración pública es la **API pública versionada** (`/api/v1/public/*`).
- El carrito real del proyecto persiste en `localStorage` y es consumido por Cart/Confirm.
- Los estados técnicos UX (loading, empty, error y bloqueos operativos) están normalizados de forma consistente.

## 3. Mapa de arquitectura del client React
Vista práctica de capas en `apps/client`:

1. **Shell de entrada (Vite + main.js)**
   - Carga estilos globales.
   - Inyecta header/footer.
   - Monta el shell React en `#main-content`.

2. **Bootstrap React**
   - `mountReactShell()` crea/asegura el nodo de mount y renderiza `<App />`.

3. **App + Router**
   - `AppRouter` usa `HashRouter` y centraliza rutas públicas.
   - `BaseLayout` envuelve páginas del flujo principal.

4. **Páginas de negocio**
   - `HomePage`, `ProductsPage`, `CartPage`, `ConfirmPage`.

5. **Capa de datos pública**
   - `src/react/services/publicApi.js` expone funciones de consumo para React.
   - Reexporta la API base de `src/api/public.js`.

6. **Estado y utilidades transversales**
   - `useAsyncResource` para ciclo loading/success/error.
   - `cartService` para estado persistido del carrito.
   - `commercialContext` para estado comercial (apertura + WhatsApp).
   - helpers/snackbar para formato y feedback.

## 4. Entry point y routing

### 4.1 Entry point
El entry point de frontend público sigue siendo `src/main.js`:
- carga CSS global/header/footer;
- monta fragments de header/footer;
- inicializa React con `mountReactShell('main-content')` al `DOMContentLoaded`.

Esto mantiene compatibilidad del shell estructural y evita acoplar layout global al router de páginas.

### 4.2 Routing público
El routing productivo se concentra en `src/react/router/AppRouter.jsx` con `HashRouter`.

Rutas principales activas:
- `#/` y `#/home` (más compat `#/r` y `#/r/*`) → Home
- `#/products` (más compat `#/r/products`) → Products
- `#/cart` (más compat `#/r/cart`) → Cart
- `#/confirm` (más compat `#/r/confirm`) → Confirm
- fallback `*` → Home

Decisión vigente: el flujo público principal se resuelve en React y bajo hash routing operacional.

## 5. Páginas principales del flujo público

### 5.1 Home
Responsabilidad:
- Render de hero, estado comercial, ofertas y categorías destacadas.
- Consumo de `settings`, `business-status`, `commercial-config`, `offers`, `categories`.
- Alta de ítems promocionales al carrito real.

### 5.2 Products
Responsabilidad:
- Carga de catálogo (categorías + productos) desde API pública.
- Normalización de datos para UI.
- Filtros por categoría y búsqueda.
- Alta de productos al carrito persistido.

### 5.3 Cart
Responsabilidad:
- Lectura y render del carrito real (`localStorage`).
- Edición de cantidades, remoción y vaciado.
- Validación de continuidad comercial (abierto/cerrado) para habilitar confirmación.

### 5.4 Confirm
Responsabilidad:
- Lectura de carrito persistido y cálculo de total.
- Validación de precondiciones técnicas (carrito, estado comercial, WhatsApp, datos mínimos).
- Construcción del mensaje final y envío vía `wa.me`.
- Limpieza de carrito posterior al envío exitoso.

## 6. Flujo de datos y consumo de API pública

Flujo productivo simplificado:
1. UI React invoca servicios en `src/react/services/publicApi.js`.
2. Esa capa reexporta funciones de `src/api/public.js`.
3. `publicFetch()` resuelve `API_BASE` (window/localStorage/env/default) y ejecuta `GET`.
4. Se valida envelope (`ok/data/meta` en éxito o `ok:false/error` en error).
5. La página aplica normalización y renderiza estado UX correspondiente.

Contratos públicos consumidos por el client:
- `GET /public/products`
- `GET /public/categories`
- `GET /public/offers`
- `GET /public/settings`
- `GET /public/business-status`
- `GET /public/commercial-config`

Conclusión operativa: el catálogo y la configuración pública **no dependen de JSON locales** en el flujo productivo.

## 7. Manejo de carrito, localStorage y confirmación

### 7.1 Carrito real
`src/utils/cartService.js` centraliza el comportamiento del carrito:
- normaliza ítems (`id`, `name`, `price`, `image`, `source`, `quantity`);
- persiste con `saveCart()`/`loadCart()` sobre `localStorage`;
- emite `cart:updated` para sincronización entre vistas;
- actualiza contador visible del carrito.

### 7.2 Sincronización Cart/Confirm
`CartPage` y `ConfirmPage`:
- inicializan estado desde `getCart()`;
- escuchan evento `storage` y evento interno `cart:updated` para mantener sincronía;
- recalculan totales desde estado normalizado.

### 7.3 Continuidad comercial y confirmación
`loadCommercialContext()` compone:
- `business-status` (si el local está abierto);
- `commercial-config` (número de WhatsApp comercial).

`ConfirmPage` habilita envío solo cuando:
- hay carrito no vacío;
- negocio abierto;
- número de WhatsApp disponible;
- datos mínimos de cliente válidos.

## 8. Estados UX técnicos normalizados
Patrón transversal activo:
- **loading**: `AsyncStateNotice` con mensajes por recurso;
- **error**: `AsyncStateNotice` con detalle técnico controlado;
- **empty**: mensajes explícitos por contexto (sin ofertas/sin productos/sin carrito);
- **bloqueo técnico**: confirmación deshabilitada con causa visible (cerrado, sin WhatsApp, etc.).

Este patrón evita comportamientos silenciosos y mejora trazabilidad de incidentes en UI pública.

## 9. Qué legado fue retirado
Decisiones vigentes asentadas para no reabrir:
- El router/render manual legacy del flujo público productivo fue retirado como base funcional.
- Los JSON locales de catálogo/configuración fueron retirados como fuente productiva.
- El desarrollo de nuevas pantallas públicas no debe usar patrones de templates legacy como mecanismo principal de negocio.

Nota: header/footer continúan como shell estructural cargado por `main.js`, pero el flujo de páginas de negocio vive en React.

## 10. Reglas para extender nuevas features sin volver al legado
Para cualquier feature nueva del client público:

1. **Entrada por React router**
   - Registrar la ruta en `AppRouter` y resolver pantalla en `src/react/pages`.

2. **Datos vía capa pública existente**
   - Consumir endpoints en `src/api/public.js` + `src/react/services/publicApi.js`.
   - No introducir fuentes locales productivas paralelas.

3. **Estados técnicos consistentes**
   - Usar `useAsyncResource` y `AsyncStateNotice` para loading/error/empty.

4. **Carrito centralizado**
   - Toda mutación del carrito debe pasar por `cartService`.
   - No escribir `localStorage` directo desde páginas para operaciones de carrito.

5. **Bloqueos comerciales explícitos**
   - Mantener chequeos de negocio abierto y disponibilidad WhatsApp en flujos de confirmación.

6. **Compatibilidad de experiencia pública**
   - Mantener hash routing y enlaces internos consistentes (`#products`, `#cart`, `#confirm`) mientras no exista nueva decisión de infraestructura.

## 11. Límites y decisiones de arquitectura vigentes
- `apps/client` React es base oficial del frontend público.
- `apps/admin` y `apps/backend` quedan fuera del alcance de este documento.
- La evolución funcional del client debe preservar contratos públicos versionados.
- No se reabren decisiones de convivencia ya cerradas (JSON productivo, render principal legacy, etc.).
- Este documento es operativo (cómo construir hoy), no bitácora histórica extensa.

## 12. Veredicto de estado actual
**Veredicto:** arquitectura del client React **estable, vigente y apta para escalar nuevas features** dentro del marco actual.

Con la migración principal cerrada (Home/Products/Cart/Confirm), la guía de extensión queda definida para continuar evolución del frontend público sin regresar a patrones legacy.
