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

## G) Convenciones BEM/scoping y anti-duplicación

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

## H) Checklist módulo nuevo/refactor (copy/paste)

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

## I) Smokes obligatorios (copy/paste)

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
