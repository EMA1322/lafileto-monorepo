---
status: CANONICAL
verified_at: 2026-08-08
scope: Decisiones durables verificadas en el repositorio.
---

# Decision Register — La Fileto

Las decisiones registradas son durables. `verified_at` identifica la verificación de evidencia, no inventa la fecha histórica de aprobación. Estados permitidos: `accepted`, `proposed`, `superseded`, `rejected`.

| ID      | Estado   | Decisión                                                | Contexto                                                   | Consecuencia                                            | Evidencia                                    | Supersedes |
| ------- | -------- | ------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------- | ---------- |
| DEC-001 | accepted | Monorepo pnpm                                           | Tres aplicaciones y paquetes comparten workspace           | Los comandos deben ser workspace-aware                  | `package.json`, `pnpm-workspace.yaml`        | —          |
| DEC-002 | accepted | Client usa React, Vite y HashRouter                     | Frontend público está migrado                              | Mantener rutas hash y aliases                           | `apps/client/src/react/router/AppRouter.jsx` | —          |
| DEC-003 | accepted | Admin usa React con router hash propio                  | La migración funcional ya ocurrió sin React Router         | El router mantiene guards y lifecycle                   | `apps/admin/src/utils/router.js`             | —          |
| DEC-004 | accepted | Backend usa Express, Prisma y MySQL                     | Persistencia y API actuales                                | Mantener contratos `/api/v1`                            | `apps/backend/package.json`, `schema.prisma` | —          |
| DEC-005 | accepted | Separar API pública y protegida                         | Client y Admin tienen superficies distintas                | No exponer contratos Admin al Client                    | `public.routes.js`, `routes/index.js`        | —          |
| DEC-006 | accepted | Envelope API uniforme                                   | Consumidores dependen de `ok/data/meta` o `ok:false/error` | Preservar shapes y códigos estables                     | `utils/envelope.js`, error handler           | —          |
| DEC-007 | accepted | JWT y RBAC protegen Admin                               | Auth y permisos son contratos transversales                | Revisar compatibilidad antes de cambiar rutas sensibles | auth/RBAC middleware y routes                | —          |
| DEC-008 | accepted | Users, Roles y Modules exigen `role-admin`              | Administración de identidad y permisos es sensible         | No tratarlos como RBAC genérico de módulo               | rutas users/roles/modules                    | —          |
| DEC-009 | accepted | Carrito local con evento estable                        | Client no tiene checkout persistido en backend             | Mantener storage, payload y `cart:updated`              | `cartService.js`, tests Client               | —          |
| DEC-010 | accepted | Settings usa `siteConfig` key/value JSON                | Configuración heterogénea no tiene columnas tipadas        | Cambios requieren sanitización y proyección pública     | schema, settings service                     | —          |
| DEC-011 | accepted | Product y Offer son relación uno-a-uno                  | Oferta se persiste por producto y expone precio derivado   | No persistir `finalPrice` desde UI                      | schema, product/offer services               | —          |
| DEC-012 | accepted | Tests normales Backend son DB-free                      | CI no usa DB real                                          | DB real requiere opt-in explícito                       | `scripts/test.mjs`, `db-safety.mjs`          | —          |
| DEC-013 | accepted | Operaciones DB son fail-closed                          | Reset, seed, migración y smokes son sensibles              | Exigir allowlists, opt-ins y confirmaciones             | `db-safety.mjs`                              | —          |
| DEC-014 | accepted | Gitleaks local y CI previenen secretos                  | SEC-04 añadió scan de rango/index y workflow               | Mantener configuración y redacción                      | secret scan script/workflow                  | —          |
| DEC-015 | accepted | Una PR, un tema; Git manual                             | Disciplina operativa del proyecto                          | No automatizar publicación sin instrucción              | AGENTS y skills La Fileto                    | —          |
| DEC-016 | accepted | Docs son conocimiento durable; skills son procedimiento | Evitar snapshots mutables duplicados                       | Enlazar docs desde AGENTS/skills                        | `docs/README.md`, AGENTS                     | —          |
| DEC-017 | accepted | Históricos no son normativos                            | Actas y evaluaciones preservan trazabilidad                | Marcarlos e indicar reemplazo                           | índice documental                            | —          |
| DEC-018 | accepted | No copiar código ni assets externos                     | Restricción visual y de propiedad                          | Usar referencias solo como inspiración                  | AGENTS y briefs visuales                     | —          |
| DEC-019 | accepted | Work Item versionado gobierna scope y aceptación        | Prompts tenían scope mutable; auditoría infería del diff   | WI gobierna scope/AC; prompts y reportes no lo amplían  | `AGENTS.md`, Work Items y audit skills       | —          |
| DEC-020 | accepted | `pnpm verify` es la verificación completa local y de CI | Root lint y CI tenían semánticas distintas                 | Humanos, Codex y CI comparten una definición DB-free    | `package.json`, `ci.yml`, `.nvmrc`           | —          |
