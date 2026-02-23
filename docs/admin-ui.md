# Admin UI — Guía práctica (Design System + checklist de módulos)

> Documento operativo para construir/refactorizar vistas del Admin sin romper consistencia visual, RBAC ni accesibilidad.

## A) Arquitectura UI (router / renderView / imports)

- **Bootstrap global**: `main.js` carga `tokens.css`, `base.css`, `icons.css`, `components.css`, `admin-list.css` y `modals.css`; luego inicializa `initRouter()` e `initModals()`.  
- **Router SPA**: `router.js` resuelve hash route, aplica guards de auth + RBAC (`canRead`) + feature flags (`VITE_FEATURE_SETTINGS`) y recién ahí hace `renderView(path)` + import dinámico del módulo JS.  
- **Render de vistas**: `renderView.js` monta en `#main-content`, marca `aria-busy`, muestra loader estándar (`.view-state--loading`) y fallback de vacío/error (`.view-state--empty`) si falla fetch.

Snippet base de módulo (patrón esperado):

```js
// router.js (patrón)
await ensureStylesheetLoaded(routeConfig.cssHref);
await renderView(routeConfig.viewHtmlPath);
const mod = await import('../components/mi-modulo/mi-modulo.js');
mod?.initMiModulo?.();
```

---

## B) Contrato visual + mapeo de tokens (PR12)

Esta sección es el **contrato visual mandatorio** del Admin UI.

### Reglas fijas (source of truth)

1. **Los módulos NO definen colores base**. Se consumen tokens semánticos (`--surface-*`, `--border-*`, `--c-text`, `--c-text-muted`, etc.).
2. **`components.css` es la fuente de verdad de primitives** (`.btn`, `.card`, `.modal`, `.toast`, `.tooltip`, `.view-state`).
3. **CSS de módulo = layout/placement + overrides mínimos scoped** (`.products__*`, `.users__*`).
4. **No duplicar primitives en módulos**: prohibido redefinir `.btn/.card/.modal/.toast/.tooltip/.view-state` localmente.
5. **Siempre respetar `prefers-reduced-motion`**: nuevas animaciones deben usar guardas equivalentes a `shouldReduceMotion()` o media query.

### Mapeo real: primitivos -> semánticos

- **Primitivos neutrales y marca**: `--c-neutral-*`, `--c-primary`, `--c-secondary`, `--c-success`, `--c-warning`, `--c-error`.
- **Superficies semánticas**:
  - `--surface-0` = fondo raíz (`--c-bg`)
  - `--surface-1` = contenedor base (`--c-surface`)
  - `--surface-2` = contenedor sutil (`--c-surface-muted`)
  - `--surface-hover` y `--surface-elevated` = interacción/elevación
- **Texto semántico**: `--c-text` (principal), `--text-subtle` (intermedio), `--c-text-muted` (secundario).
- **Bordes semánticos**: `--border-soft` (divisor suave), `--border-strong` (separación marcada).
- **Estado semántico**: `success/info/warning/error` usando `--c-success`, `--c-secondary`, `--c-warning`, `--c-error`.

```css
.products__panel {
  background: var(--surface-1);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  color: var(--c-text);
}

.products__panel:hover {
  background: var(--surface-hover);
  border-color: var(--border-strong);
}

.products__hint {
  color: var(--text-subtle);
}
```

---

## C) Componentes base mandatorios (UI kit real)

> Preferí componer con estas clases antes de crear variantes nuevas.

### Botones (`.btn`)

- Base: `.btn`
- Variantes: `.btn--primary`, `.btn--secondary`, `.btn--danger`, `.btn--outline`, `.btn--ghost`
- Tamaños: `.btn--sm`, `.btn--icon`

```html
<button class="btn btn--primary" type="button">Guardar</button>
<button class="btn btn--ghost btn--sm" type="button">Cancelar</button>
```

### Card (`.card`)

- Base: `.card`
- Estructura: `.card__header`, `.card__body`, `.card__footer`
- Variantes: `.card--metric`, `.card--action`

```html
<article class="card">
  <header class="card__header">Resumen</header>
  <div class="card__body">Contenido</div>
</article>
```

### Badge

- Base: `.badge`
- Variantes: `.badge--primary|success|warning|error|neutral|accent`

```html
<span class="badge badge--success">Activo</span>
```

### Table

- Wrapper: `.table-wrapper`
- Tabla: `.data-table`

```html
<div class="table-wrapper">
  <table class="data-table">...</table>
</div>
```

### Modal (`.modal`)

- CSS global: `.modal`, `.modal.is-open`, `.modal__dialog`, `.modal__header`, `.modal__body`, `.modal__footer`, `.modal__title`
- Servicio utilitario disponible: `openModal()` en `utils/modal.js`.

```html
<div class="modal is-open" role="presentation">
  <div class="modal__dialog" role="dialog" aria-modal="true" aria-labelledby="m-title">
    <header class="modal__header"><h2 id="m-title" class="modal__title">Editar</h2></header>
    <div class="modal__body">...</div>
  </div>
</div>
```

### Toast unificado (PR13)

- Stack: `.toast-stack`
- Item: `.toast`, `.toast--success|error|info|warning`, `.toast__message`, `.toast__close`
- API JS: `toast.success/info/warning/error()`.

```js
toast.success('Guardado correctamente');
```

### Skeleton

- Base: `.skeleton`
- Variantes: `.skeleton--pill`, `.skeleton--text`

```html
<span class="skeleton skeleton--text">Cargando</span>
```

### Tooltip (Floating UI, PR20)

- Trigger declarativo: `data-tooltip="..."` + opcional `data-tooltip-placement="top|bottom|left|right"`
- Estilos: `.tooltip`, `.tooltip__content`
- Inicialización: `initTooltips(root)`.

```html
<button class="btn btn--icon" data-tooltip="Actualizar" data-tooltip-placement="bottom">↻</button>
```

### Íconos por sprite (PR17)

- Declarativo: `data-icon="..."`.
- Inicialización: `mountIcons(root)` resuelve `icons.svg#i-<name>`.

```html
<button class="btn btn--ghost btn--sm" type="button">
  <svg class="icon icon--sm" data-icon="refresh" aria-hidden="true"><use></use></svg>
  Refrescar
</button>
```

### View-state (PR14)

- Clases reales: `.view-state`, `.view-state--loading`, `.view-state--empty`, `.view-state__inner`, `.view-state__spinner`, `.view-state__title`, `.view-state__text`, `.view-state__actions`.
- Para error se mantiene el mismo primitive con copy + CTA de reintento (sin crear otra librería paralela).

### Fechas consistentes (PR18)

- Utilidades: `formatShortDateTime()` y `formatRelative()` en `utils/dates.js` (locale `es`).
- Fallback estándar para fecha inválida: `—`.
- Regla: en tablas/cards del admin no formatear fechas "a mano".

---

## D) Estados UI estándar + contrato de view-state (PR14)

Estados recomendados por vista:

- `loading` → `.view-state.view-state--loading`
- `empty` → `.view-state.view-state--empty`
- `error` → usar `view-state` con copy de error + CTA reintentar
- `success` → vista normal + feedback (`toast.success` o badge)

### Contrato sugerido de estado (JS)

```js
const state = {
  status: 'idle', // idle | loading | success | empty | error
  data: [],
  error: null,
};
```

### Markup mínimo

```html
<section class="view-state view-state--loading" role="status" aria-live="polite" aria-atomic="true">
  <div class="view-state__inner view-state__inner--center">
    <span class="view-state__spinner" aria-hidden="true"></span>
    <p class="view-state__text">Cargando…</p>
  </div>
</section>
```

---

## E) RBAC + feature flags (reglas y dónde aplicar)

### Reglas RBAC

1. Definí contenedor con `data-rbac-module="<moduleKey>"` (y opcional `data-rbac-alias`).
2. En acciones UI, usá `data-rbac-action="read|write|update|delete|change-status"`.
3. Si querés ocultar (no solo deshabilitar), agregá `data-rbac-hide`.
4. Ejecutá `applyRBAC(root)` después de renderizar/actualizar DOM dinámico.
5. Para validación de negocio en JS, usá `canRead/canWrite/canUpdate/canDelete`.

```html
<section data-rbac-module="products">
  <button class="btn btn--primary" data-rbac-action="write" data-rbac-hide>Nuevo</button>
</section>
```

```js
import { applyRBAC, canWrite } from '@/utils/rbac.js';

if (!canWrite('products')) return;
applyRBAC(container);
```

### Reglas feature flags

- Parseá flags con `isFeatureEnabled(import.meta.env.VITE_FEATURE_*)`.
- Aplicá guard **en router** y opcionalmente en UI (ocultar CTA).
- No hardcodear `'true'` directo en módulos.

```js
const FEATURE_SETTINGS = isFeatureEnabled(import.meta.env.VITE_FEATURE_SETTINGS);
if (!FEATURE_SETTINGS) window.location.hash = '#dashboard';
```

---

## F) Checklist A11y (obligatorio)

- [ ] **Focus visible** en controles interactivos (`:focus-visible` con ring de tokens).
- [ ] **`aria-live`** para feedback asíncrono (toasts: `polite`; errores críticos: `alert`).
- [ ] **Keyboard completo**: Enter/Space donde aplique, Escape para cerrar modal/tooltip.
- [ ] **Modal accesible**: `role="dialog"`, `aria-modal="true"`, foco inicial y retorno de foco al cerrar.
- [ ] **Focus-trap real** en modal complejo (Tab/Shift+Tab no debe escapar del diálogo).
- [ ] **Tooltips accesibles**: trigger con `data-tooltip`, tooltip con `role="tooltip"`, relación por `aria-describedby`.
- [ ] Respetar `prefers-reduced-motion` en animaciones nuevas.

Snippet mínimo de focus-trap (si el modal no lo implementa aún):

```js
function trapTabKey(event, root) {
  if (event.key !== 'Tab') return;
  const nodes = root.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])');
  const focusables = [...nodes].filter((el) => !el.hasAttribute('disabled'));
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
}
```

---

## G) A11y Smoke Checklist (Teclado + Motion) — Admin

> Objetivo: correr una validación rápida y repetible de accesibilidad funcional en Admin, usando componentes reales del repo (`focus-trap`, `initTooltips`, `#global-modal`, `#headerDrawer`, `icon-btn`, `shouldReduceMotion`).

### A) Setup rápido

1. Browser: usar **Chrome** o **Firefox**.
2. Activar `prefers-reduced-motion`:
   - DevTools (si está disponible): emular `prefers-reduced-motion: reduce`.
   - Si no, activar “Reducir movimiento” en el sistema operativo.
3. Abrir Admin con sesión iniciada y dejar DevTools abierto.
4. Opcional: throttling de CPU/red para hacer más evidentes saltos de foco/motion (la validación visual fina va en PR42).

### B) Walkthrough de teclado (paso a paso)

#### 1) Header drawer (`#headerMenuToggle` / `#headerDrawer` / `#headerOverlay`)

1. Presioná `Tab` hasta enfocar `#headerMenuToggle`.
2. Presioná `Enter` (o `Space`) para abrir el drawer.
3. **Pasa** si el foco entra al drawer (`#headerDrawer`) al abrir.
4. Navegá con `Tab` y `Shift+Tab` dentro del drawer.
   - **Pasa** si el foco queda atrapado (no salta al contenido detrás).
5. Presioná `Escape`.
   - **Pasa** si cierra drawer/overlay y el foco vuelve a `#headerMenuToggle`.

#### 2) Modal global (`#global-modal`, modal v2)

1. Abrí un modal real (ej. create/edit en Products o Categories).
2. **Pasa** si el foco cae dentro de `#global-modal`.
3. Navegá con `Tab`/`Shift+Tab`.
   - **Pasa** si el foco no escapa del modal (focus-trap activo).
4. Presioná `Escape`.
   - **Pasa** si el modal cierra y el foco vuelve al trigger que lo abrió.

#### 3) Tooltips en `icon-btn` (`data-tooltip`, `aria-describedby`)

1. Enfocá un botón con `.icon-btn` y `data-tooltip`.
2. **Pasa** si aparece tooltip al focus y el trigger queda asociado por `aria-describedby`.
3. Presioná `Escape`.
   - **Pasa** si el tooltip cierra sin disparar acciones no intencionales.

### C) Focus-visible

Validar ring visible (teclado) en:

- `.btn` (v2)
- `.icon-btn`
- `.card--action` (si existe en la pantalla)

**Falla** si ocurre cualquiera de estos casos:

- El foco no se ve.
- El foco se ve recortado por `overflow`/contenedor.
- El contraste del ring es insuficiente para distinguir el elemento activo.

### D) Reduced motion (`shouldReduceMotion` / motion guard)

Con reduced-motion activo:

1. Trigger de toast: **pasa** si aparece sin animación o con animación mínima.
2. Hover/press en botones/cards: **pasa** si no hay “saltos” bruscos.
3. Transiciones UI generales: **pasa** si se reducen claramente respecto al modo normal.

### E) Checklist Pasa/Falla (copiable)

- [ ] Header drawer: `Enter/Space` abre, foco entra y queda atrapado, `Escape` cierra y retorna foco a `#headerMenuToggle`.
- [ ] Modal global (`#global-modal`): foco inicial interno, trap con `Tab/Shift+Tab`, `Escape` + retorno al trigger.
- [ ] Tooltips (`data-tooltip`): aparecen con focus, asignan `aria-describedby`, `Escape` cierra sin efectos colaterales.
- [ ] Focus-visible correcto en `.btn`, `.icon-btn`, `.card--action`.
- [ ] Reduced motion activo: toast/transiciones/feedback sin animación invasiva.

### F) Registro de evidencia

Capturar por módulo (Products, Categories, Header):

- Screenshot o nota corta por cada bloque validado (drawer, modal, tooltip, focus, motion).
- Si falla, incluir selector/ID y paso exacto donde falla.

Formato recomendado (copiar/pegar en PR):

```md
### Evidencia A11y Smoke — Admin
- Módulo: <Products|Categories|Header>
- Fecha: <YYYY-MM-DD>
- Entorno: <local|staging> / <Chrome|Firefox>
- Reduced motion: <ON|OFF>

#### Resultado
- Drawer (`#headerDrawer`): <PASA|FALLA> — <nota breve>
- Modal (`#global-modal`): <PASA|FALLA> — <nota breve>
- Tooltips (`.icon-btn` + `data-tooltip`): <PASA|FALLA> — <nota breve>
- Focus-visible (`.btn`, `.icon-btn`, `.card--action`): <PASA|FALLA> — <nota breve>
- Motion guard (`shouldReduceMotion`): <PASA|FALLA> — <nota breve>

#### Hallazgos
- <si aplica>
```

### Checklist rápido (1 minuto)

- Abrir drawer con teclado (`#headerMenuToggle`) y cerrar con `Escape` verificando retorno de foco.
- Abrir un modal real (`#global-modal`) y comprobar trap con 3-4 tabs.
- Enfocar un `.icon-btn` con `data-tooltip` y confirmar `aria-describedby` + cierre con `Escape`.
- Confirmar que se ve focus ring en al menos `.btn` y `.icon-btn`.

### Checklist completo (5–8 min)

- Ejecutar Setup rápido + walkthrough completo de teclado (drawer, modal, tooltip).
- Validar focus-visible en `.btn`, `.icon-btn` y `.card--action`.
- Activar reduced-motion y repetir smoke corto de toast + hover/press + transiciones.
- Registrar evidencia por módulo con el formato recomendado.

---

## H) Convenciones BEM/scoping y anti-duplicación

- **BEM por módulo**: `products__*`, `users__*`, `categories__*`, etc.
- Reutilizable global va en `styles/components/components.css` (prefijos neutrales: `.btn`, `.card`, `.badge`, `.data-table`, `.view-state`, `.toast`, `.tooltip`).
- Estilos de módulo en su archivo (`styles/<modulo>.css`) sin redefinir tokens ni componentes base.
- Evitar “double source of truth”: si existe `.btn--*`, no crear `.miModulo__btn--primary` con mismos estilos.
- Mantener jerarquía de capas: `tokens -> base -> components -> css de módulo`.

### Checklist anti-duplicación por módulo

**Permitido (sí):**

- Layout, grillas, spacing específico del dominio (`.products__filters`, `.users__toolbar`).
- Composición de primitives (`.products__toolbar .btn { ... }`) con overrides mínimos y scoped.
- Ajustes puntuales de anchura/orden/visibilidad por breakpoint del módulo.

**No permitido (no):**

- Copiar estilos de `.btn`, `.card`, `.modal`, `.toast`, `.tooltip`, `.view-state` en CSS de módulo.
- Definir colores HEX/RGB directos para superficies y texto base.
- Crear variantes paralelas (`.users__btn-primary`) que dupliquen las existentes.

```css
.products__toolbar {
  display: flex;
  gap: var(--space-3);
  justify-content: space-between;
}

.products__toolbar .btn--ghost {
  min-width: 8rem;
}

/* NO: .products__btn-primary { background: #fdc300; ... } */
```

### Snippets copy/paste (10-25 líneas)

#### 1) Button + tooltip + icon

```html
<button
  class="btn btn--secondary btn--sm"
  type="button"
  data-tooltip="Recargar listado"
  data-tooltip-placement="bottom"
>
  <svg class="icon icon--sm" data-icon="refresh" aria-hidden="true"><use></use></svg>
  Recargar
</button>

<script type="module">
  import { mountIcons } from '@/utils/icons.js';
  import { initTooltips } from '@/utils/floating.js';
  mountIcons(document);
  initTooltips(document);
</script>
```

#### 2) Card action

```html
<button class="card card--action" type="button">
  <span class="card__icon">
    <svg class="icon" data-icon="users" aria-hidden="true"><use></use></svg>
  </span>
  <span>
    <p class="card__meta">Usuarios activos</p>
    <p class="card__value">128</p>
  </span>
</button>
```

#### 3) Inline alert (placeholder actual)

```html
<div class="card" role="status" aria-live="polite">
  <div class="card__body">
    <p class="products__inline-alert">
      Aún no existe primitive `.alert` global en `components.css`.
      Usá `toast.info()` para feedback temporal o card scoped para mensajes persistentes.
    </p>
  </div>
</div>
```

#### 4) View-state loading/empty

```html
<section class="view-state view-state--loading" role="status" aria-live="polite" aria-atomic="true">
  <div class="view-state__inner view-state__inner--center">
    <span class="view-state__spinner" aria-hidden="true"></span>
    <p class="view-state__text">Cargando usuarios…</p>
  </div>
</section>

<section class="view-state view-state--empty" aria-live="polite">
  <div class="view-state__inner view-state__inner--center">
    <p class="view-state__title">Sin resultados</p>
    <p class="view-state__text">Probá ajustando filtros.</p>
  </div>
</section>
```

---

## I) Checklist módulo nuevo/refactor (copy/paste)

```md
## Checklist módulo UI
- [ ] Ruta agregada/actualizada en `utils/router.js` (`viewHtmlPath`, `cssHref`, import dinámico JS).
- [ ] HTML del módulo con bloque BEM propio (`<modulo>__*`).
- [ ] CSS del módulo usa tokens (`var(--...)`) y reutiliza componentes globales (`.btn`, `.card`, etc.).
- [ ] Estados `loading/empty/error/success` cubiertos con patrón `view-state`.
- [ ] RBAC aplicado (`data-rbac-module`, `data-rbac-action`, `data-rbac-hide`) + `applyRBAC()` post-render.
- [ ] Feature flags (si aplica) evaluadas con `isFeatureEnabled()`.
- [ ] A11y validada (focus, aria-live, teclado, modal, tooltips).
- [ ] Smokes corridos y documentados en PR.
```

---

## J) Visual Smoke Checklist (Responsive + States + Network Throttling)

> Objetivo: validar en 10–15 minutos que la UI de Admin sea consistente en responsive, estados de vista y carga de estilos bajo red degradada (incluyendo FOUC).

### 1) Setup

#### DevTools (Chrome)

1. Abrí DevTools y activá Device Toolbar.
2. Ejecutá tres breakpoints:
   - Mobile: **390x844** (o ancho 390).
   - Tablet: **768x1024**.
   - Desktop: **1440x900**.
3. En Network, activá throttling:
   - **Slow 3G** y/o **Fast 3G** (al menos uno).
4. Opcional: activar **Disable cache** para hacer más visible el comportamiento inicial.

#### Qué observar en cada recorrido

- **FOUC**: contenido visible sin estilos.
- **Layout shift**: saltos grandes/reacomodos bruscos.
- **Overflow horizontal**: aparece scroll lateral cuando no debería.
- **Truncado/clamp de texto**: títulos, badges, tablas y CTAs cortados.
- **Contraste**: chips, alerts y feedback legibles en todos los breakpoints.

### 2) Matriz por módulo (success + estados UI)

Aplicar en: **Dashboard, Products, Users, Settings, Categories y Login**.

#### Revisión base (success)

- Header correcto y estable.
- Botones v2, `icon-btn` y tooltips visibles/legibles.
- Cards y tablas sin overflow horizontal.

#### Estados UI por módulo

- **Loading**: skeleton o `view-state` global coherente.
- **Empty**: alerta/info + CTA cuando aplique.
- **Error**: alerta/error + acción de retry.

Si un estado no es fácil de forzar, documentar 2 formas:

- **(A) DevTools**: bloquear request, simular offline o cambiar endpoint temporal.
- **(B) UI existente**: usar filtros/búsquedas que vacíen resultados o acciones que provoquen error controlado.

### 3) Throttling checklist (FOUC)

#### Paso a paso

1. Activar throttling en **Slow 3G**.
2. Navegar: **Dashboard -> Products -> Users -> Settings**.
3. Validar en cada cambio de ruta:
   - Loader global consistente (`view-state`, PR14).
   - CSS cargado antes del contenido por ruta (preload/ensure, PR16).
   - Ausencia de flashes de UI sin estilo.

#### Criterios de falla

- Texto sin estilos visible por más de **200ms**.
- Layout completamente roto durante carga.
- Botones o controles sin estilos durante la transición de ruta.

### 4) Checklist rápido (3–5 min)

Alcance mínimo para sanity check:

1. Breakpoint: **390**.
2. Módulos: **Dashboard + Products**.
3. Estados: **success + loading**.
4. Throttling: una pasada en **Slow 3G**.

Resultado esperado: PASS/FAIL por módulo con nota breve y evidencia mínima.

### 5) Checklist completo (10–15 min)

Cobertura estándar:

1. **3 breakpoints**: 390 / 768 / 1440.
2. **6 módulos**: Dashboard, Products, Users, Settings, Categories, Login.
3. **4 estados** cuando sea posible: success, loading, empty, error.
4. **Throttling** al menos una pasada completa con Slow 3G (o Fast 3G si hay limitación).

### 6) Formato de reporte (copy/paste)

```md
## Visual Smoke Report — Admin UI
- Fecha: <YYYY-MM-DD>
- Commit/Branch: <sha-corto> / <branch>
- Browser: <Chrome versión>

### Resultado por caso
- Breakpoint: <390|768|1440>
- Módulo: <Dashboard|Products|Users|Settings|Categories|Login>
- Estado: <success|loading|empty|error>
- Resultado: <PASS|FAIL>
- Evidencia: <link screenshot | nota>

### Hallazgos
- <Descripción breve del issue>
- <Impacto (alto/medio/bajo)>
- <Sugerencia o siguiente paso>
```

---

## K) Smokes obligatorios (copy/paste)

```bash
# 1) Lint/chequeo del workspace
pnpm -w lint

# 2) Test del admin (si existe script)
pnpm --filter admin test

# 3) Build del admin
pnpm --filter admin build

# 4) Auditoría rápida de estilos/tokens en el módulo tocado
rg -n "#[0-9a-fA-F]{3,8}|rgb\(|hsl\(" apps/admin/src/styles/<modulo>.css -S
```

Smokes manuales mínimos:

- Login → navegación a módulo → recarga de hash route.
- Caso sin permisos (`read`) redirige a `#not-authorized`.
- Botones con `data-rbac-action` se ocultan/deshabilitan correctamente.
- Modal abre/cierra con Escape y devuelve foco.
- Tooltip aparece con hover/focus y cierra con Escape.
- Toast muestra variante correcta (`success/error/info/warning`) y autocierre.

---

## Plantilla de PR UI

```md
## Scope ✅
- (qué sí cambia)

## Scope ❌
- (qué no cambia)

## Archivos tocados
- apps/admin/src/components/...
- apps/admin/src/styles/...
- apps/admin/src/utils/...

## Smokes
- [ ] pnpm -w lint
- [ ] pnpm --filter admin test
- [ ] pnpm --filter admin build
- [ ] Smokes manuales UI/RBAC/A11y

## Auditoría post-PR (comandos)
- `rg -n "view-state|data-rbac|data-tooltip" apps/admin/src/components apps/admin/src/utils -S`
- `rg -n "--c-|--space-|--radius-|--shadow-" apps/admin/src/styles -S`
- `nl -ba apps/admin/src/styles/components/components.css | sed -n '240,620p'`
```
