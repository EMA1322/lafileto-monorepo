---
status: Draft
owner: Product/UX + Tech Lead
last_update: 2025-10-08
scope: RF y RNF, reglas de negocio, supuestos, criterios de aceptación.
---

## Requisitos funcionales (RF)
- **RF-01**: Listar categorías y productos con filtros.
- **RF-02**: Agregar/editar ítems del carrito y ver total.
- **RF-03**: Confirmar pedido por **WhatsApp** con mensaje armado.
- **RF-04**: Admin login (JWT) y acceso a Dashboard.
- **RF-05**: CRUD de categorías y productos (RBAC).
- **RF-06**: Gestión de usuarios/roles/permissions (RBAC).
- **RF-07**: `settings.isOpen` para habilitar/inhabilitar compras.

## Requisitos no funcionales (RNF)
- **RNF-01**: LCP ≤ 2.5s p75 (mobile).
- **RNF-02**: Accesibilidad mínima (roles/aria, focus).
- **RNF-03**: API estable con envelope y códigos de error fijos.
- **RNF-04**: Mobile-first y CSS BEM.

## Reglas de negocio
- `discount ∈ [0,100]`; `offerPrice` es **derivado** (no persistido).
- Vigencia de oferta: activa si `(startAt && endAt && startAt ≤ now ≤ endAt)` o si sólo `startAt` y `startAt ≤ now`, o
  si sólo `endAt` y `now ≤ endAt`; sin fechas → siempre activa.
- Si `settings.isOpen=false`, CTA de compra deshabilitados.

## Supuestos / dependencias
- WhatsApp disponible en dispositivo del usuario.
- Migración gradual `json→api` por módulo.

## Criterios de aceptación (Gherkin)
```gherkin
Scenario: Agregar producto al carrito
  Given estoy en Products
  When presiono "Agregar al carrito"
  Then el producto se agrega con cantidad 1
  And el total se actualiza
```
