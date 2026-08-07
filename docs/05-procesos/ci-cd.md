---
status: CANONICAL
verified_at: 2026-08-07
---

# CI y escaneo de secretos

La automatización versionada se limita a validación; no hay CD documentado en los workflows actuales.

| Workflow          | Triggers                                                            | Qué verifica                                                    |
| ----------------- | ------------------------------------------------------------------- | --------------------------------------------------------------- |
| `ci.yml`          | `push` y `pull_request` sobre `main`, además de `workflow_dispatch` | instalación pnpm, lint por workspace y suites configuradas.     |
| `secret-scan.yml` | `push` y `pull_request` sobre `main`                                | Gitleaks verificado y escaneo fail-closed del rango disponible. |

Los workflows no usan path filters ni publican artifacts. La CI normal no ejecuta migraciones, reset, seed, DB tests ni smokes remotos.

El escaneo local es `pnpm secrets:scan` y requiere la versión de Gitleaks declarada por el script. Su alcance depende del estado Git disponible: un rango de commits vacío no cubre por sí solo contenido staged, y el workflow remoto no puede inspeccionar staging local. Ver [seguridad](../07-anexos/seguridad.md).
