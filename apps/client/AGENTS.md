# Client guide

Scope: `apps/client/**`.

Read [current-state.md](../../docs/project/current-state.md), [client-react-architecture.md](../../docs/03-arquitectura/client-react-architecture.md), [endpoints.md](../../docs/06-apis/endpoints.md), and the Client visual brief before changing public behavior or UI.

## High-risk contracts

- Keep the React `HashRouter` routes and compatibility aliases stable.
- Preserve `localStorage['cart']` and the cart payload: `id`, `name`, `price`, `image`, `source`, `quantity`.
- Preserve the `cart:updated` event and the `#cart-count` integration.
- Preserve `.btn-add-to-cart` and the tested attributes `data-id`, `data-name`, `data-price`, `data-image`, and `data-source`.
- Consume the versioned public API; do not introduce local JSON as a production data source.

## Routine verification

```bash
pnpm -F client lint
pnpm -F client test
pnpm -F client build
```

Use `lafileto-client-audit` for scoped Client audits. Root rules remain in force.
