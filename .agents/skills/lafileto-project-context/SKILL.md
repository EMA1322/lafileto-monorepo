---
name: lafileto-project-context
description: Stable project context for La Fileto. Use when working in the La Fileto monorepo to align on repository structure, stack boundaries, protected contracts, small PR discipline, and Eduardo's manual control of commit, push, pull request, and merge operations.
---

# La Fileto Project Context

Use this skill to establish stable context before planning, auditing, or implementing work in the La Fileto repository.

## Repository Shape

- Treat the repository as a pnpm monorepo.
- Recognize `apps/client` as the public Client application.
- Recognize `apps/admin` as the Admin application.
- Recognize `apps/backend` as the API backend.
- Recognize `docs` as project documentation.
- Prefer workspace-aware pnpm commands when verifying a scoped change.

## Stack

- Client: React, JSX, Vite, hash routing, CSS Modules, design tokens, local foundation primitives, and selective lightweight UI libraries when already approved.
- Admin: existing modular Vite SPA. Do not assume a migration or framework change unless Eduardo explicitly confirms it.
- Backend: Node, Express, Prisma, MySQL, and `/api/v1` API routes.

## Protected Contracts

Before changing behavior, identify whether the task touches any protected contract:

- Client hash routes and navigation.
- Cart persistence through `localStorage['cart']`.
- Cart synchronization through `cart:updated`.
- Public add-to-cart hooks such as `.btn-add-to-cart`.
- Critical `data-*` attributes.
- API request and response contracts shared by Client, Admin, and Backend.
- Authentication, authorization, RBAC, and permission-sensitive flows.

Do not remove or rename protected contracts unless the user explicitly approves the change and the compatibility impact is audited.

## Git And PR Discipline

- Keep PRs small: one PR, one theme.
- Keep implementation scope aligned to the user-approved task.
- Do not commit, push, create PRs, merge, or close PRs automatically. Eduardo keeps manual control of Git and GitHub actions unless he explicitly asks otherwise.
- Report local changes and suggested commands, but leave Git publication decisions to Eduardo.

## Operating Rules

- Use English for code, identifiers, filenames, and comments unless the existing code requires otherwise.
- Use Spanish for explanations, audit reports, and documentation addressed to Eduardo.
- Analyze with evidence before implementing.
- Prefer minimal edits in the affected surface instead of broad refactors.
- Do not copy external code, images, or assets. External visual references may inform patterns only when Eduardo approves visual work.
