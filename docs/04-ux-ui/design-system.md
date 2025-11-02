---
status: Draft
owner: Front Lead + UX
last_update: 2025-10-08
scope: Tokens, BEM, componentes base y pautas de assets.
---

## Tokens
- Colores: `--color-primary-500`, neutrales, estados.
- Tipografía: base 16px; escala sm=14, lg=18, xl=24.
- Spacing 8px grid; radios/sombras.

## BEM / Mobile-first
Bloques claros, elementos `__`, modificadores `--`. Media queries progresivas.

## Componentes
Button (primary/secondary/danger/ghost), Input/Field, Card, Nav, Modal, Snackbar.

## Imágenes/íconos
WebP/AVIF preferido; SVG inline para íconos; peso <150KB.

## Categorías — pautas específicas

- **Tokens**: usar `var(--space-4)` en toolbar y `var(--space-3)` entre filas; badges activos `--c-success-500`, inactivos `--c-neutral-400`.
- **Tabla**: clases `table table--dense`; columna estado con `badge badge--success` / `badge badge--muted`.
- **Modales**: `form-control--dense`, `form-group--vertical`; botones primario `btn btn--primary`, secundario `btn btn--ghost`, danger `btn btn--danger`.
- **Toasts**: `toast toast--success` / `toast--error` con `aria-live="polite"`; duración 4 s.
- **Switch activo**: componente `switch` con `data-state="on|off"`, se apoya en tokens `--ring-width` y `--ring-color` para focus visible.
- **Estados**: `state-card state-card--empty` (borde dashed) y `state-card--error` (color-mix con `--c-error`).
- **Responsive**: en mobile, toolbar se apila `flex-direction: column`, botones con `width: 100%`; tabla usa scroll horizontal con `data-table-scroll`.
- > NOTE: Alinear `maxlength=50` en input nombre para evitar 422 del backend.
