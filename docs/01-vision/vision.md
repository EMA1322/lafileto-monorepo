---
status: Draft
owner: Product/UX
last_update: 2025-10-08
scope: Propuesta de valor, KPIs, alcance, audiencias, riesgos y definición de éxito.
---

## Propuesta de valor
Menú digital rápido y claro, optimizado para **mobile**, que permite a clientes navegar el catálogo, armar carrito y confirmar por **WhatsApp**. Admin gestiona catálogo y estado del negocio con **RBAC**.

## Objetivos medibles (KPIs)
- LCP ≤ **2.5s** p75 en mobile.
- Error rate API < **1%** en operaciones normales.
- Conversión “Agregar al carrito → Confirmar WhatsApp” ≥ **30%**.
- Tiempo de alta de un producto < **60s** en Admin.

## Alcance
**IN**: catálogo, ofertas (Swiper solo Home), carrito, confirmación WhatsApp, Admin con Login/CRUD básico y RBAC.  
**OUT**: pagos online, delivery propio, auditorías históricas.

## Roles y audiencias
- **Cliente**: navegación y confirmación simple.
- **Administrador**: CRUD y configuración (isOpen, contacto).

## Riesgos y mitigaciones
- Contratos desalineados → OpenAPI como fuente de verdad y endpoints sincronizados.
- Performance mobile → imágenes optimizadas y JS minimalista.

## Definición de éxito
Catálogo estable con API v1, Admin con RBAC, métricas de performance cumplidas.

## Checklist
- [x] Principios UX/UI definidos
- [x] API v1 documentada
- [x] Procesos de PR/CI definidos
