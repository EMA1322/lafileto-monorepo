---
name: lafileto-client-audit
description: Client audit workflow for La Fileto apps/client changes. Use when a task affects the public Client React + Vite app, including routes, navigation, UI/UX after Eduardo confirms visual work, cart state, public flows, API contracts, and protected DOM/data contracts.
---

# La Fileto Client Audit

Use this skill when auditing or planning work that affects `apps/client`.

## Client Scope

Inspect the task against:

- React + JSX + Vite behavior.
- Hash routes and navigation.
- Public menu, product, category, cart, checkout, and related user flows.
- UI/UX only when Eduardo confirms a visual task or review.
- Cart state and persistence.
- API consumption and compatibility with backend contracts.
- CSS Modules, design tokens, foundation primitives, and approved visual stack.

## Protected Contracts

Before approving Client changes, check whether they affect:

- Hash route URLs.
- `localStorage['cart']`.
- `cart:updated`.
- `.btn-add-to-cart`.
- Critical `data-*` attributes.
- Existing public API request/response expectations.
- Checkout or cart payload shape.

Do not assume visual direction, colors, layout priorities, animations, or component migrations unless Eduardo explicitly approves them.

## Evidence To Gather

Use the narrowest commands that prove the task:

```bash
git diff --stat origin/main...HEAD
git diff --name-status origin/main...HEAD -- apps/client
git diff origin/main...HEAD -- apps/client
git diff --check origin/main...HEAD
pnpm -F client test
pnpm -F client build
```

Adapt commands to the package names and scripts actually present in the repository.

For UI work, add a browser smoke when practical and report the route, viewport, and visible signals checked.

## Output Format

Write the report in Spanish:

1. Scope Client real.
2. Rutas y navegación.
3. Estado, carrito y flujo público.
4. Contratos API/DOM afectados.
5. UI/UX, solo si aplica.
6. Tests, build y smokes.
7. Riesgos.
8. Dictamen final.

Use `APTO`, `APTO CON OBSERVACIONES`, or `NO APTO` when this is an audit.

Do not commit, push, create PRs, merge, or close PRs. Eduardo keeps manual control.
