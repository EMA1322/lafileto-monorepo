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

## Categorías

| Síntoma | Diagnóstico | Fix |
|---|---|---|
| 409 `CATEGORY_NAME_CONFLICT` | Nombre duplicado tras trim/casefold. | Ajustar copy en modal (máx. 50 chars) y volver a enviar con nombre único. |
| 409 `CATEGORY_SLUG_CONFLICT` | > NOTE: Slug aún no implementado; si se agrega, asegurar generación consistente. | Normalizar slug en backend antes de insertar. |
| 409 `CATEGORY_IN_USE` / error FK | (Pendiente) categoría asociada a productos. | Implementar conteo `productCount`; forzar reasignación antes de borrar. |
| 403 `PERMISSION_DENIED` | Usuario sin `categories:w/u/d`. | Revisar seeds/roles; asignar permisos y recargar sesión (logout/login). |
| 422 `VALIDATION_ERROR` | `name` <2 o >50, URL sin http(s). | Validar en modal (maxlength=50, pattern URL). |
| 400 paginación inválida | `page` <1 o `pageSize` <5. | Resetear filtros desde toolbar; el backend normaliza pero devuelve error si no es número. |
| SPA Cliente sin categorías | UI asume array plano. | Corregir `fetchPublicCategories` para usar `response.data.items`. |
