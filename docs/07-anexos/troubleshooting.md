---
status: Draft
owner: Tech Lead
last_update: 2025-10-08
scope: Problemas comunes y soluciones.
---

- **Vite/public**: usar rutas absolutas `/img/...` o `new URL(..., import.meta.url)`.
- **CORS**: agregar origen a `CORS_ALLOWLIST`; reiniciar API.
- **Carrito/discount**: validar 0–100; `offerPrice` derivado.
- **`VITE_DATA_SOURCE`**: `json|api` por módulo; revisar `VITE_API_BASE_URL`.
- **WhatsApp**: `encodeURIComponent` al generar el mensaje.
