---
status: Aprobado
owner: Tech Lead + Product/UX
last_update: 2026-04-13
scope: Índice operativo de /docs y criterios para mantener documentación vigente.
---

# Documentación — Menú Digital · La Fileto

## Propósito
Esta carpeta es la **fuente de verdad documental operativa** del monorepo `apps/{backend,admin,client}`.

Prioridades de mantenimiento:
1. Exactitud respecto al estado real del repositorio.
2. Coherencia entre documentos.
3. Eliminación de contradicciones y referencias obsoletas.

## Estado actual del producto (resumen)
- El **client público en React** es la base activa.
- El flujo público principal corre en React: **Home → Products → Cart → Confirm**.
- El flujo público productivo consume **API pública** (`/api/v1/public/*`).
- El frontend legacy del client quedó fuera del flujo productivo principal.

## Índice de documentación vigente

### 01-vision
- [vision.md](./01-vision/vision.md)

### 02-requisitos
- [requisitos.md](./02-requisitos/requisitos.md)
- [user-stories.md](./02-requisitos/user-stories.md)

### 03-arquitectura
- [client-react-architecture.md](./03-arquitectura/client-react-architecture.md)
- [admin-react-migration-evaluation.md](./03-arquitectura/admin-react-migration-evaluation.md)
- [c4-context.mmd](./03-arquitectura/c4-context.mmd)
- [c4-containers.mmd](./03-arquitectura/c4-containers.mmd)
- [c4-components-client.mmd](./03-arquitectura/c4-components-client.mmd)
- [c4-components-admin.mmd](./03-arquitectura/c4-components-admin.mmd)
- [datos-y-modelado.md](./03-arquitectura/datos-y-modelado.md)
- [despliegue.md](./03-arquitectura/despliegue.md)

#### Históricos de arquitectura (no normativos para nuevas decisiones)
- [acta-cierre-fase-0-migracion-client-react.md](./03-arquitectura/acta-cierre-fase-0-migracion-client-react.md)
- [cierre-fase-1-contratos-publicos.md](./03-arquitectura/cierre-fase-1-contratos-publicos.md)

### 04-ux-ui
- [ux-ui.md](./04-ux-ui/ux-ui.md)
- [design-system.md](./04-ux-ui/design-system.md)
- [accesibilidad.md](./04-ux-ui/accesibilidad.md)
- [admin-products.md](./04-ux-ui/admin-products.md)
- [admin-list-contract.md](./04-ux-ui/admin-list-contract.md)
- [img/admin-products.png](./04-ux-ui/img/admin-products.png)

### 05-procesos
- [procesos.md](./05-procesos/procesos.md)
- [git-branching.md](./05-procesos/git-branching.md)
- [coding-standards.md](./05-procesos/coding-standards.md)
- [testing.md](./05-procesos/testing.md)
- [ci-cd.md](./05-procesos/ci-cd.md)
- [debug-login.md](./05-procesos/debug-login.md)
- [validacion-usuarios.md](./05-procesos/validacion-usuarios.md)

### 06-apis
- [api-guidelines.md](./06-apis/api-guidelines.md)
- [endpoints.md](./06-apis/endpoints.md)
- [ejemplos.json](./06-apis/ejemplos.json)
- [postman_collection.json](./06-apis/postman_collection.json)

### 07-anexos
- [env.md](./07-anexos/env.md)
- [seguridad.md](./07-anexos/seguridad.md)
- [troubleshooting.md](./07-anexos/troubleshooting.md)
- [glosario.md](./07-anexos/glosario.md)
- [ui-kit.md](./07-anexos/ui-kit.md)

### Documento transversal
- [admin-ui.md](./admin-ui.md)

## Reglas de actualización
- Si cambia un contrato/flujo real, se actualiza `/docs` en la misma PR.
- Si un documento queda histórico, debe marcarse explícitamente como histórico.
- Evitar duplicar contenido: priorizar un documento fuente y referenciarlo.

## Ejecución local rápida
```bash
pnpm install
pnpm dev
```

URLs de desarrollo (por defecto):
- Client: `http://localhost:5173`
- Admin: `http://localhost:5174`
- API: `http://localhost:3000/api/v1/health`
