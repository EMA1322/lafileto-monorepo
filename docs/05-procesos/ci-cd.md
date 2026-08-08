---
status: CANONICAL
verified_at: 2026-08-08
---

# CI y escaneo de secretos

La automatización versionada se limita a validación; no hay CD documentado en los workflows actuales.

| Workflow          | Triggers                                                            | Qué verifica                                                                  |
| ----------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `ci.yml`          | `push` y `pull_request` sobre `main`, además de `workflow_dispatch` | un único install/cache y la semántica completa del script raíz `pnpm verify`. |
| `secret-scan.yml` | `push` y `pull_request` sobre `main`                                | Gitleaks verificado y escaneo fail-closed del rango disponible.               |

CI consume Node.js 22.23.2 exclusivamente desde `.nvmrc`, instala con lockfile congelado y declara permisos `contents: read`. Las Actions se referencian mediante SHA completa y Dependabot mantiene semanalmente sólo el ecosistema `github-actions`.

Los workflows no usan path filters ni publican artifacts. La CI normal no ejecuta migraciones, reset, seed, DB tests ni smokes remotos. El check `Gitleaks` permanece independiente del job `verify`.

El pre-commit ejecuta lint-staged y después `pnpm secrets:scan`, que requiere la versión de Gitleaks declarada por el script. Su alcance depende del estado Git disponible: un rango de commits vacío no cubre por sí solo contenido staged, por lo que el wrapper también exporta y escanea el índice staged completo. El workflow remoto no puede inspeccionar staging local. Ver [seguridad](../07-anexos/seguridad.md).
