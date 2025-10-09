---
status: Draft
owner: Product/UX
last_update: 2025-10-08
scope: Términos del proyecto y referencias cruzadas.
---

## Glosario

- **Catálogo (catalog)**: Conjunto de categorías y productos visibles en el Client SPA. Ver [`/docs/02-requisitos/requisitos.md`](../02-requisitos/requisitos.md).
- **Oferta (offer / isOffer)**: Bandera que indica si un producto está en promoción.
- **Descuento (discount)**: Porcentaje (0–100). Se aplica sobre `price` para derivar `offerPrice`.
- **Precio de oferta (offerPrice)**: `price - (price * discount/100)`. No se persiste en DB.
- **RBAC (Role-Based Access Control)**: Autorización por **módulo/acción** en Admin. Ver [`/docs/06-apis/endpoints.md`](../06-apis/endpoints.md).
- **Envelope**: Estructura estándar de respuesta `{ ok, data?, error?, meta? }`. Ver [`/docs/06-apis/api-guidelines.md`](../06-apis/api-guidelines.md).
- **Paginación (page/pageSize)**: Parámetros para dividir listados. Sugerido `pageSize` por defecto 20, máximo 100.
- **Orden (sort)**: Formato `field:asc|desc`; admite múltiples campos separados por coma.
- **Búsqueda (q)**: Texto libre; semántica por módulo.
- **VITE_DATA_SOURCE**: Flag de frontend: `json` o `api`, conmutado por **módulo** durante la migración.
- **Staging / Producción (prod)**: Entornos previos/finales para pruebas y publicación.
- **CORS (Cross-Origin Resource Sharing)**: Lista de orígenes permitidos por entorno. Ver [`/docs/07-anexos/seguridad.md`](./seguridad.md).
- **JWT**: Token de autenticación usado **solo** en Admin SPA.
- **LCP (Largest Contentful Paint)**: Métrica de performance objetivo (≤ 2.5s p75 en 4G). Ver [`/docs/01-vision/vision.md`](../01-vision/vision.md).
