---
status: Draft
owner: Tech Lead
last_update: 2026-04-13
scope: Problemas comunes y soluciones.
---

- **Vite/public**: usar rutas absolutas `/img/...` o `new URL(..., import.meta.url)`.
- **CORS**: agregar origen a `CORS_ALLOWLIST`; reiniciar API.
- **Carrito/discount**: validar 0–100; `offerPrice` derivado.
- **`VITE_DATA_SOURCE` (admin)**: usar `api` por defecto; `json` solo para debug puntual. Revisar también `VITE_API_BASE`.
- **WhatsApp**: `encodeURIComponent` al generar el mensaje.

## Categorías

| Síntoma | Diagnóstico | Fix |
|---|---|---|
| 409 `CATEGORY_NAME_CONFLICT` | Nombre duplicado tras trim/casefold. | Ajustar copy en modal (máx. 50 chars) y volver a enviar con nombre único. |
| 409 `CATEGORY_SLUG_CONFLICT` | > NOTE: Slug aún no implementado; si se agrega, asegurar generación consistente. | Normalizar slug en backend antes de insertar. |
| 409 `CATEGORY_IN_USE` / error FK | (Pendiente) categoría asociada a productos. | Implementar conteo `productCount`; forzar reasignación antes de borrar. |
| 403 `PERMISSION_DENIED` | Usuario sin `categories:w/u/d`. | Revisar seeds/roles; asignar permisos y recargar sesión (logout/login). |
| 422 `VALIDATION_ERROR` | `name` <2 o >50, URL sin http(s). | Validar en modal (maxlength=50, pattern URL). |
| 400 paginación inválida | `page` <1 o `pageSize` <5. | Resetear filtros desde toolbar; el backend normaliza pero devuelve error si no es número. |
| SPA cliente sin categorías visibles | Respuesta vacía o filtro activo no esperado en Products. | Verificar `GET /api/v1/public/categories` y limpiar filtros locales antes de descartar problema de API. |
