---
status: CANONICAL
verified_at: 2026-08-07
---

# Testing actual y límites de cobertura

Los comandos de test normales son seguros por diseño: Backend usa el stub de Prisma para la suite no DB. Una suite que exista en el árbol no está necesariamente incluida por el runner; la matriz siguiente es la fuente operativa.

| Área           | Comando                   | Cobertura ejecutada                                                                           | Límites conocidos                                                                                        |
| -------------- | ------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Backend normal | `pnpm -F backend test`    | 47 pruebas: categorías API/RBAC, users, settings (servicios/rutas/validación) y seguridad DB. | No incluye actualmente productos, dashboard ni configuración CORS, aunque existan tests para esas áreas. |
| Backend DB     | `pnpm -F backend test:db` | auth y RBAC contra una DB de pruebas.                                                         | Requiere `NODE_ENV=test`, DB desechable y opt-ins; no es CI normal.                                      |
| Admin          | `pnpm -F admin test`      | 13 suites declaradas por su runner.                                                           | `test/rbac.integration.test.js` existe pero no es invocado por ese runner.                               |
| Client         | `pnpm -F client test`     | Vitest detecta `test/**/*.test.{js,jsx}`; actualmente 9 archivos.                             | Cobertura funcional, no prueba por sí sola todo un navegador o backend real.                             |
| CI             | workflows                 | lint y suites indicadas por workflow.                                                         | La CI normal es deliberadamente DB-free.                                                                 |

## DB, smokes y comandos sensibles

No ejecutar migrations, seed, reset ni smokes como verificación rutinaria. Los scripts de Backend validan URL, entorno, opt-ins y confirmaciones antes de operaciones sensibles. Consultar [env](../07-anexos/env.md) y [seguridad](../07-anexos/seguridad.md) para las precondiciones.

Antes de afirmar cobertura de una suite, confirmar que el comando realmente la incluye. Para cambios de contratos de Backend, Admin o Client usar el skill de auditoría correspondiente y ejecutar la verificación de alcance apropiado.
