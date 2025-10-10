---
status: Draft
owner: DevOps/Tech Lead
last_update: 2025-10-10
scope: Pipeline por workspace, caching, path filters, artefactos y gates.
---

# CI/CD

## Objetivos
- Reproducible: Node 20 + pnpm via `pnpm/action-setup`.
- Rápido: cache del _store_ de pnpm.
- Inteligente: **path filters** para ejecutar sólo lo necesario.
- Trazable: artefactos de `dist/`.

## Triggers
- `push` y `pull_request` a `main` + `workflow_dispatch` manual.
- Concurrency para evitar jobs superpuestos:
```yaml
concurrency:
  group: ci-${ github.ref }
  cancel-in-progress: true
```

## Instalación y cache (extracto del workflow)
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'

- uses: pnpm/action-setup@v4
  with:
    run_install: false

- name: Verify pnpm
  run: |
    which pnpm
    pnpm -v

- name: Resolve pnpm store path
  id: pnpm-cache
  run: echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT

- name: Setup pnpm cache
  uses: actions/cache@v4
  with:
    path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-${{ hashFiles('**/pnpm-lock.yaml') }}
    restore-keys: |
      ${{ runner.os }}-pnpm-
```

## Path filters por workspace (opcional)
```yaml
- uses: dorny/paths-filter@v3
  id: filter
  with:
    filters: |
      backend:
        - 'apps/backend/**'
      client:
        - 'apps/client/**'
      admin:
        - 'apps/admin/**'
      tooling:
        - '.github/**'
        - 'pnpm-lock.yaml'

- name: Build backend
  if: steps.filter.outputs.backend == 'true' || steps.filter.outputs.tooling == 'true'
  run: pnpm -F backend build

- name: Build client
  if: steps.filter.outputs.client == 'true' || steps.filter.outputs.tooling == 'true'
  run: pnpm -F client build

- name: Build admin
  if: steps.filter.outputs.admin == 'true' || steps.filter.outputs.tooling == 'true'
  run: pnpm -F admin build
```

## Artefactos de build
```yaml
- uses: actions/upload-artifact@v4
  with:
    name: client-dist
    path: apps/client/dist
- uses: actions/upload-artifact@v4
  with:
    name: admin-dist
    path: apps/admin/dist
```

## Gates y environments (staging/prod)
- Crear **Environments** en _Settings → Environments_: `staging`, `production`.
- Agregar gates (aprobación manual) y secretos por entorno.
- Job `deploy` condicionado a `environment` y a que el build esté verde.

## Reglas de protección de rama
- _Settings → Branches → Add rule_ para `main`:
  - PR obligatorio
  - Required status checks: **CI**
  - (Opcional) Require linear history

## Secretos
- **Actions → Secrets and variables → Actions** por entorno.
- Nunca almacenar secretos en el repo.
