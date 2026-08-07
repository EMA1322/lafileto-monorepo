---
status: CANONICAL
verified_at: 2026-08-07
---

# Arquitectura actual de Client

`apps/client` es la aplicación pública React + JSX + Vite. Su entrada es `src/main.js`: carga estilos y monta por separado Header, Footer y el shell React mediante sus bootstraps. `App.jsx` renderiza `AppRouter`, que usa `HashRouter` para las rutas.

## Rutas y superficies

| Hash route   | Página     | Rol                                  |
| ------------ | ---------- | ------------------------------------ |
| `#/`         | `Home`     | menú y acceso principal al catálogo. |
| `#/products` | `Products` | catálogo público.                    |
| `#/contact`  | `Contact`  | información de contacto.             |
| `#/cart`     | `Cart`     | carrito persistente.                 |
| `#/confirm`  | `Confirm`  | confirmación del flujo de pedido.    |

El shell y la navegación deben conservar hash routing: no hay routing del servidor para estas rutas.

## Integración y estado local

El cliente público consume la API bajo la base configurada por `VITE_API_BASE_URL`. El carrito se conserva en `localStorage['cart']` y anuncia cambios mediante el evento `cart:updated`. Los botones de compra y los datos de catálogo conservan los contratos de compatibilidad `.btn-add-to-cart` y los atributos `data-id`, `data-name`, `data-price`, `data-image` y `data-source`.

No son detalles intercambiables de UI: cambios en estos contratos requieren auditoría de consumidores y pruebas de compatibilidad.

## Pruebas y límites

La configuración Vitest incluye `test/**/*.test.{js,jsx}`; la suite actual cubre componentes, rutas, API pública y carrito. No hay evidencia de componentes legacy activos que gobiernen la navegación o el carrito; cualquier vestigio debe contrastarse antes de retirarlo.

Para cambios de Client, leer [estado actual](../project/current-state.md), [endpoints](../06-apis/endpoints.md), [testing](../05-procesos/testing.md) y el `AGENTS.md` local.
