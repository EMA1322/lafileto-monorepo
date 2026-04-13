---
status: Draft
owner: Front Lead + Backend Lead
last_update: 2026-04-13
scope: Nombres en inglés, comentarios en español, SPA structure, CSS BEM, logs/envelope.
---

## Nombres
- **HTML/JS/CSS** en inglés; comentarios en español.

## SPA (Vite)
- Client público: React + HashRouter (`apps/client/src/react/*`) con flujo Home/Products/Cart/Confirm.
- Admin: router hash + `renderView`/imports dinámicos según contrato vigente en `docs/admin-ui.md`.

## CSS
- BEM, mobile-first, assets en `/public` cuando sea global.

## Backend
- Envelope `{ ok, data?, error?, meta? }`; errores con códigos estables.
