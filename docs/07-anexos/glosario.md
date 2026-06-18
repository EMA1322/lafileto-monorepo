---
status: Draft
owner: Product/UX
last_update: 2026-04-13
scope: Términos del proyecto y referencias cruzadas.
---

## Glosario

- **Catálogo (catalog)**: Conjunto de categorías y productos visibles en el Client SPA. Ver [`/docs/02-requisitos/requisitos.md`](../02-requisitos/requisitos.md).
- **Oferta (`offer`)**: Resumen embebido de una promocion activa asociada a un producto. Incluye `discountPercent`, `isActive` y `finalPrice`.
- **Filtro de oferta (`hasOffer`)**: Parametro canonico de Products para listar productos con o sin oferta.
- **Descuento (`discountPercent`)**: Porcentaje aplicado sobre `price` para calcular el precio final.
- **Precio final (`finalPrice`)**: Precio derivado de `price` y `discountPercent` cuando `isActive=true`; no se persiste desde la UI.
- **Oferta activa (`isActive`)**: Estado booleano expuesto por el resumen de oferta.
- **RBAC (Role-Based Access Control)**: Autorización por **módulo/acción** en Admin. Ver [`/docs/06-apis/endpoints.md`](../06-apis/endpoints.md).
- **Envelope**: Estructura estándar de respuesta `{ ok, data?, error?, meta? }`. Ver [`/docs/06-apis/api-guidelines.md`](../06-apis/api-guidelines.md).
- **Paginación (page/pageSize)**: Parámetros para dividir listados. Sugerido `pageSize` por defecto 20, máximo 100.
- **Orden (sort)**: Formato `field:asc|desc`; admite múltiples campos separados por coma.
- **Búsqueda (q)**: Texto libre; semántica por módulo.
- **VITE_DATA_SOURCE**: Flag heredado usado en Admin para compatibilidad/debug (`json` o `api`). En client público, la fuente productiva es API.
- **Staging / Producción (prod)**: Entornos previos/finales para pruebas y publicación.
- **CORS (Cross-Origin Resource Sharing)**: Lista de orígenes permitidos por entorno. Ver [`/docs/07-anexos/seguridad.md`](./seguridad.md).
- **JWT**: Token de autenticación usado **solo** en Admin SPA.
- **LCP (Largest Contentful Paint)**: Métrica de performance objetivo (≤ 2.5s p75 en 4G). Ver [`/docs/01-vision/vision.md`](../01-vision/vision.md).
