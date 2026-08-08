---
status: CURRENT
verified_at: 2026-08-08
baseline_commit: 1fdff76b7875f0489478c5d0b75e1a80873d9768
scope: Snapshot operativo del conocimiento versionado de La Fileto.
---

# Current State — La Fileto

## Authority

Este documento resume el estado operativo verificado del repositorio. No reemplaza código, schema, configuración, workflows ni tests ejecutados por sus runners. `baseline_commit` identifica la revisión desde la que se verificó y construyó este snapshot; no afirma que ese commit contenga los cambios descritos. El estado vigente es el contenido de este documento en la revisión que se consulta. Si existe una contradicción, registrar la discrepancia y consultar el [decision register](./decision-register.md); no inferir intención de producto desde el comportamiento actual.

## Repository

La Fileto es un monorepo privado pnpm con `apps/client`, `apps/admin`, `apps/backend`, `packages`, `docs` y `.agents`. Los paquetes relevantes son `@lafileto/shared-utils`, el visualizador local de Rollup y `@lafileto/design`; este último no tiene archivos de implementación ni consumidores actuales.

## Client

El Client público usa React 18, Vite y `HashRouter`. El flujo productivo incluye Home, Products, Contact, Cart y Confirm, con aliases hash de compatibilidad. El shell, header y footer se montan en React; las páginas consumen la API pública `/api/v1/public/*` y no usan JSON local como fuente productiva. El carrito persiste localmente y sincroniza mediante `cart:updated`. Ver [arquitectura Client](../03-arquitectura/client-react-architecture.md) y [contratos API](../06-apis/endpoints.md).

## Admin

Admin usa React 18 y Vite. `main.js` inicializa un router hash propio que conserva la autoridad sobre navegación, auth y RBAC, y monta rutas React mediante `reactViewAdapter`. Las superficies React productivas son Login, Dashboard, Products, Categories, Users y Settings. No usa React Router. El fallback `#not-authorized` y algunas utilidades DOM/globales continúan como superficie transicional. Ver [arquitectura Admin](../03-arquitectura/admin-react-architecture.md).

## Backend

El backend es Node ESM con Express, Prisma y MySQL. La API vive bajo `/api/v1`; separa rutas públicas y protegidas, usa JWT y RBAC, y conserva Users/Roles/Modules para `role-admin`. Settings se persiste como `Setting` key/value JSON con proyecciones públicas. Los modelos principales son User, Role, Module, RolePermission, Setting, Category, Product y Offer. Ver [modelado](../03-arquitectura/datos-y-modelado.md) y [endpoints](../06-apis/endpoints.md).

## Testing

Los archivos existentes no equivalen automáticamente a cobertura ejecutada. El runner normal Backend usa Prisma stub e incluye Categories, Users, Settings y guards DB; Auth/RBAC reales son `test:db` opt-in. Los archivos de Products, Dashboard y `src/config/_tests_/_cors.test.js` existen, pero no forman parte de ese runner normal. Admin ejecuta un runner explícito de 13 suites y deja `rbac.integration.test.js` fuera. Client usa Vitest con nueve archivos y 66 tests. Ver [testing](../05-procesos/testing.md).

## CI

`ci.yml` ejecuta el script raíz `pnpm verify` en un único job sobre push/PR a `main` y `workflow_dispatch`; usa Node.js 22.23.2 desde `.nvmrc`, install frozen, cache pnpm y permisos de lectura. `secret-scan.yml` mantiene Gitleaks como check independiente en push/PR a `main`. Las Actions están fijadas por SHA y Dependabot sólo mantiene el ecosistema `github-actions`. No hay path filters, publicación de artefactos ni CD implementado. Ver [CI/CD](../05-procesos/ci-cd.md).

## Security

SEC-01 saneó material credencial versionado; SEC-02 alineó contratos de entorno; SEC-03 añadió guards fail-closed para tests, DB y smokes; SEC-04 añadió Gitleaks local y CI. El pre-commit ejecuta Gitleaks después de estabilizar el índice con lint-staged. El workflow declara que GitHub Secret Scanning y Push Protection se habilitan manualmente: su estado vivo no es verificable desde el repositorio. Ver [seguridad](../07-anexos/seguridad.md) y [entorno](../07-anexos/env.md).

## UX/UI

Los bloques visuales Client 9F y Admin 10C están completados en Git. Sus briefs continúan como referencia visual y están indexados desde [docs](../README.md); no son roadmap futuro.

## Known debt

- La cobertura efectiva de runners no incluye todos los archivos de test existentes.
- La reconciliación API/Postman permanece pendiente.
- CD y backup/restore no están implementados.
- El gate global de Prettier, la limpieza de warnings históricos y una eventual verificación por cambios permanecen diferidos.

## Completed major blocks

Client React, contratos públicos, foundation/rediseño Client, Admin React, Settings/Contact públicos, visual Client 9F, visual Admin 10C, SEC-01…SEC-04 y OPT-A…OPT-C están completados. Ver [roadmap](./roadmap.md) para la clasificación completa.
