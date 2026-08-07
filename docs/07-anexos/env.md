---
status: CANONICAL
verified_at: 2026-08-07
---

# Contratos de entorno

Este documento enumera nombres y reglas, nunca valores secretos. Los `.env.example` por aplicación son el punto de partida; el código y los scripts validan las precondiciones finales.

| Área    | Variables/contrato                                                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client  | `VITE_API_BASE_URL` define la base de API pública.                                                                                                                        |
| Admin   | `VITE_API_BASE`, `VITE_API_PROXY_TARGET`, `VITE_DATA_SOURCE` y `VITE_FEATURE_SETTINGS` configuran cliente, proxy y flags Vite; la configuración carga env explícitamente. |
| Backend | `DATABASE_URL`, `JWT_SECRET`, CORS/orígenes y configuración de puerto se validan desde el entorno de Backend.                                                             |
| Prisma  | `DATABASE_URL`; `SHADOW_DATABASE_URL` solo cuando un flujo Prisma lo requiera.                                                                                            |

## Operaciones de DB y smoke

Los comandos sensibles son opt-in y requieren una DB de prueba permitida. `test:db` exige entorno `test`, `ALLOW_DB_TESTS=1` y URL segura; los wrappers verifican hosts/nombres permitidos. `migrate deploy`, reset y seed añaden sus propios flags `ALLOW_DB_MIGRATE_DEPLOY`, `ALLOW_DB_RESET`, `CONFIRM_DB_RESET=RESET_TEST_DATABASE` y/o `ALLOW_DB_SEED` según la operación.

Los smokes locales y remotos se habilitan por separado con sus flags `ALLOW_LOCAL_SMOKE` o `ALLOW_REMOTE_SMOKE`; el remoto además valida el host esperado. No usar `pnpm -F backend prisma <subcomando>` como atajo para omitir estas protecciones.

Para valores, orden de carga y ejemplos vigentes consultar `apps/*/.env.example` y los scripts de Backend; no copiar secretos a documentación ni a tests.
