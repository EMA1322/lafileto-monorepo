---
id: WI-0002
status: completed
---

# WI-0002 — Verification & CI Foundation

## Objective

Establecer una única definición completa, reproducible y confiable de que una tarea está lista, compartida por el entorno local, Codex, CI y las auditorías, con Node.js 22.23.2 como runtime versionado y corrigiendo el drift comprobado de lint y CI sin convertir OPT-C/OPT-07 en una reescritura masiva de tooling.

## Scope

- Declarar Node.js 22.23.2 como runtime compartido por desarrollo local y CI mediante `.nvmrc`, consumido por el workflow sin una segunda declaración de versión.
- Corregir la asignación de entornos y globals de ESLint para validar correctamente código Node y browser, sin broad ignores ni cambios funcionales al visualizador.
- Hacer que `pnpm lint` sea el lint raíz canónico y verificable sobre la superficie JS-family versionada.
- Agregar un único script raíz `pnpm verify` que ejecute lint raíz, tests normales DB-free y builds reales de Admin y Client.
- Alinear `.github/workflows/ci.yml` con `pnpm verify` mediante un único job, un único install/cache y permisos explícitos de lectura.
- Conservar en CI los triggers sobre `main`, `workflow_dispatch`, concurrency, cancelación de runs obsoletos, frozen install y cache actual de pnpm.
- Fijar por SHA completa las Actions consumidas por CI, con comentario de la versión verificada, sin actualizar sus majors.
- Crear una configuración mínima de Dependabot, semanal y exclusiva para `github-actions` desde `/`.
- Ejecutar `pnpm secrets:scan` en pre-commit después de `lint-staged`, preservando la propagación de fallos.
- Mantener Gitleaks 8.30.1, su commit scan, el snapshot completo del índice staged, la redacción y el workflow `Gitleaks` independiente.
- Actualizar únicamente comentarios y documentación durable afectados por la nueva semántica de verificación, CI, seguridad y roadmap.
- Corregir la matriz documental de testing para que coincida con los runners y archivos realmente existentes.
- Limitar cualquier normalización de Prettier a archivos modificados y autorizados por este Work Item.

## Out of scope

- Features, UX/UI o refactors funcionales de Client, Admin o Backend.
- Endpoints, contratos API, Prisma schema, migrations, seed, reset, smokes o datos persistentes.
- Integración de `test:db` en CI o incorporación de suites que actualmente están fuera de los runners normales.
- Nuevos tests funcionales de alcance amplio.
- CD, deployment, backup/restore o reconciliación de Postman y documentación API.
- CODEOWNERS, branch protection, rulesets live, required checks, required reviewers o políticas externas de GitHub.
- Actualizaciones major de Actions, Dependabot para npm o upgrades generales de dependencias.
- Formateo completo del repositorio, limpieza global de warnings o incorporación de un plugin ESLint de React.
- `verify:changed`, `format:check` global o scripts `verify:*` por aplicación.
- Modificar o ignorar `packages/rollup-plugin-visualizer` para ocultar el error de configuración ESLint.
- Eliminar scripts placeholder existentes o redefinir el build no-op de Backend.
- Commit, push, creación o cierre de PR, merge, modificación de ramas o publicación externa.

## Current evidence

- En el baseline `1fdff76b7875f0489478c5d0b75e1a80873d9768`, [package.json](../../package.json) define `pnpm lint`, pero no existe un script raíz `verify` ni una declaración versionada compartida del runtime; el runtime aprobado para WI-0002 es Node.js 22.23.2.
- En ese baseline, [eslint.config.mjs](../../eslint.config.mjs) aplica globals browser y Node a toda la superficie JS-family; `pnpm lint` falla por `Buffer` en `packages/rollup-plugin-visualizer/src/index.js`, mientras `pnpm -r lint` sale 0 porque no cubre esa superficie raíz.
- En ese baseline, [ci.yml](../../.github/workflows/ci.yml) declara el runtime directamente y usa tres jobs secuenciales con instalaciones repetidas; lint ejecuta `pnpm -r lint`, no el lint raíz que reproduce el fallo.
- [pre-commit](../../.husky/pre-commit) ejecuta únicamente `pnpm lint-staged`; [scan-secrets.ps1](../../scripts/security/scan-secrets.ps1) ya implementa Gitleaks 8.30.1 fail-closed para commits y el índice staged completo, pero declara diferida su integración con Husky.
- [secret-scan.yml](../../.github/workflows/secret-scan.yml) mantiene `Gitleaks` como check independiente y fija checkout por SHA; el resto de las Actions de CI usa tags `v4` mutables.
- El test CORS Backend [\_cors.test.js](../../apps/backend/src/config/_tests_/_cors.test.js) existe y está versionado, pero no forma parte de la lista `isolatedTestFiles` del runner normal [test.mjs](../../apps/backend/scripts/test.mjs); este Work Item no autoriza incorporarlo al runner ni ampliar cobertura.
- [roadmap.md](../project/roadmap.md) mantiene OPT-C/OPT-07 en `needs-decision` y registra la deuda del lint raíz previa a este Work Item.

## Protected contracts

- Los tests normales de Backend siguen siendo DB-free y las operaciones DB continúan fail-closed y opt-in.
- `pnpm verify` es una verificación completa manual/CI; no se incorpora al hook pre-commit.
- `lint-staged` conserva su rol de formatter/fixer rápido y mutante; no sustituye a `pnpm verify`.
- SEC-04 conserva Gitleaks 8.30.1, redacción total, commit scan, snapshot completo del índice staged y fallo cerrado.
- `Gitleaks` continúa como workflow/check independiente de CI.
- La verificación canónica no presenta el build no-op de Backend como compilación real.
- La CI normal no ejecuta DB, migrations, seed, reset ni smokes.
- El control de Git, GitHub y settings externos permanece manual bajo autoridad de Eduardo.

## Acceptance criteria

- AC-01: Node.js 22.23.2 tiene una única declaración versionada en `.nvmrc` y CI consume ese archivo en lugar de declarar otra versión.
- AC-02: `pnpm lint` sale 0 y cubre la superficie JS-family versionada sin ignorar el visualizador.
- AC-03: El visualizador recibe globals Node y las superficies Client/Admin reciben sólo los globals browser aplicables.
- AC-04: Los warnings existentes no se convierten en bloqueo ni generan una limpieza masiva fuera del objetivo.
- AC-05: `pnpm verify` ejecuta root lint, tests normales DB-free y builds reales de Admin y Client.
- AC-06: El build no-op de Backend no se presenta como compilación ni forma parte de `pnpm verify`.
- AC-07: CI tiene un único job `verify`, un único install/cache y ejecuta exactamente `pnpm verify`.
- AC-08: CI conserva sus triggers, concurrency y `workflow_dispatch`, usa frozen install y declara `permissions: contents: read`.
- AC-09: Todas las Actions consumidas por CI quedan fijadas por SHA completa con comentario de la versión verificada, sin upgrades major.
- AC-10: Dependabot monitorea exclusivamente `github-actions`, semanalmente y desde `/`.
- AC-11: Pre-commit ejecuta `lint-staged` y después `pnpm secrets:scan`, propagando el primer fallo aplicable.
- AC-12: La integración local conserva Gitleaks 8.30.1, commit scan, snapshot completo del índice staged, redacción total y comportamiento fail-closed.
- AC-13: `Gitleaks` continúa como workflow/check independiente y no se debilita la lógica de SEC-04.
- AC-14: La implementación y sus verificaciones rutinarias no ejecutan DB tests, migrations, seed, reset ni smokes.
- AC-15: No se introducen `verify:changed`, un `format:check` global ni scripts `verify:*` adicionales.
- AC-16: Prettier sólo normaliza archivos modificados y autorizados por este Work Item.
- AC-17: La documentación describe la semántica y enlaza los scripts canónicos sin copiar su implementación.
- AC-18: Ningún archivo fuera del Scope aprobado se modifica sin un Scope amendment humano previamente registrado.

## Verification

- Required: `node --version` y `pnpm --version` — confirmar exactamente Node.js `v22.23.2` y el pnpm fijado por el repositorio.
- Required: `pnpm lint` y `pnpm -r lint` — confirmar lint raíz canónico y compatibilidad de scripts workspace existentes.
- Required: `pnpm verify` — confirmar lint, tests normales DB-free y builds Admin/Client con la misma semántica que CI.
- Required: Prettier check limitado a archivos modificados compatibles con Prettier.
- Required: validación estructural de los YAML modificados y comprobación de que Dependabot contiene sólo `github-actions`.
- Required: resolución de cada SHA de Action contra su repositorio oficial y comprobación de correspondencia con la versión comentada.
- Required: `sh -n .husky/pre-commit` y comprobación observable del orden `lint-staged` → `secrets:scan` y de la propagación de fallos.
- Required: pruebas sintéticas en un repositorio temporal para confirmar scan staged, rechazo de un valor sintético sin imprimirlo y fallo cerrado si Gitleaks falta o no es 8.30.1.
- Required: equivalencia observable entre el comando ejecutado por CI y el script raíz de `package.json`.
- Required: verificación documental de estructura, terminología, referencias relativas, estado del roadmap y decisión durable.
- Required: `git diff --check`, allowlist del diff, ausencia de staging y `git status --short` final.
- Required after PR: checks `verify` y `Gitleaks` exitosos sobre el mismo SHA revisado, más auditoría post-PR y mergeabilidad.
- Not applicable: DB tests, migrations, seed, reset and smokes — este Work Item conserva la CI normal DB-free y no cambia contratos de datos.
- Not applicable: browser or UX/UI smoke — no hay cambios de interfaz ni flujos de producto.

## Risks and dependencies

- El cambio de CI reduce la granularidad visual de tres jobs a uno; los comandos encadenados y logs deben conservar la identificación de la fase fallida.
- El hook local depende de PowerShell, Git for Windows y Gitleaks 8.30.1 disponible en PATH; una precondición ausente debe bloquear de forma explícita.
- Prettier mutante puede ampliar diffs en archivos legacy tocados; la revisión debe permanecer limitada al allowlist.
- El runtime local observado antes de implementar puede no ser Node.js 22.23.2; la verificación completa requiere ejecutar con la versión exacta declarada.
- Los SHA de Actions deben resolverse y comprobarse nuevamente al implementar; no se aceptan valores inventados ni inferidos sólo desde tags.
- Dependabot puede generar PRs periódicos; su ecosistema queda limitado a GitHub Actions para controlar el ruido.

## Deferred

- Activación o corrección de branch protection, rulesets y required checks live.
- Integración de tests DB reales en CI.
- `verify:changed` y cualquier optimización basada en un grafo de dependencias.
- Gate global de Prettier y limpieza de deuda histórica de formato o warnings.
- Cobertura de suites existentes fuera de los runners normales.
- Upgrades major de Actions y actualizaciones automáticas de dependencias npm.

## Scope amendments

- 2026-08-08 — Corrección factual aprobada por instrucción humana: `apps/backend/src/config/_tests_/_cors.test.js` existe y está versionado, pero no forma parte del runner normal `apps/backend/scripts/test.mjs`. Se corrige únicamente Current evidence; AC-18 conserva su función original, sin incorporar el test al runner, modificar Backend, ampliar cobertura ni expandir funcionalmente el Scope.
- 2026-08-08 — Corrección de runtime aprobada por instrucción humana: Node.js 22.23.2 es la versión LTS aprobada para WI-0002 y reemplaza la declaración anterior. Se actualizan `.nvmrc`, el contrato y la documentación afectada sin duplicar la versión en CI, migrar a Node 24, cambiar dependencias ni expandir funcionalmente el Scope.
- 2026-08-08 — Corrección de provenance documental aprobada por el usuario: `current-state.md` sustituye `verified_commit` por `baseline_commit` para distinguir la revisión base de la revisión que contiene el snapshot. No existe expansión funcional del Scope.

## References

- [Work Item system](./README.md)
- [Work Item template](./TEMPLATE.md)
- [Current state](../project/current-state.md)
- [Decision register](../project/decision-register.md)
- [Roadmap](../project/roadmap.md)
- [Testing](../05-procesos/testing.md)
- [CI/CD](../05-procesos/ci-cd.md)
- [Development process](../05-procesos/procesos.md)
- [Security](../07-anexos/seguridad.md)
