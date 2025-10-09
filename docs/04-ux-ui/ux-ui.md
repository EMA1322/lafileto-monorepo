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
