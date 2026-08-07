# La Fileto

Monorepo pnpm para el menú digital público, la administración interna y su API.
El estado verificable del proyecto vive en la documentación versionada, con el código,
tests, esquema y configuración como evidencia ejecutable.

## Inicio seguro

Revisá primero [la guía del repositorio](AGENTS.md), el [portal de documentación](docs/README.md)
y el [estado actual](docs/project/current-state.md). Los contratos de entorno y las
operaciones de base de datos están en [env.md](docs/07-anexos/env.md): no ejecutes
migraciones, seed, reset ni smokes remotos como parte del inicio normal.

Requisitos de desarrollo: Node.js compatible con el `package.json` raíz, pnpm y una
base MySQL solo cuando una tarea documentada lo requiera. Instalación habitual:

```bash
pnpm install
```

## Aplicaciones

| Área     | Ubicación      | Rol                                                     |
| -------- | -------------- | ------------------------------------------------------- |
| Client   | `apps/client`  | Aplicación pública React + Vite con rutas hash.         |
| Admin    | `apps/admin`   | Aplicación interna React + Vite con router hash propio. |
| Backend  | `apps/backend` | API Express + Prisma/MySQL bajo `/api/v1`.              |
| Paquetes | `packages/*`   | Utilidades compartidas y soporte de tooling.            |

Comandos de alcance acotado:

```bash
pnpm -F client dev
pnpm -F admin dev
pnpm -F backend dev
pnpm -F client test
pnpm -F admin test
pnpm -F backend test
```

Los comandos de DB y los smokes requieren opt-ins explícitos; consultá la documentación
de entorno antes de usarlos. El backend no tiene un paso de compilación productiva.

## Verificación y contribución

Cada cambio debe verificar el área afectada y sus contratos. `pnpm -r lint` tiene una
deuda conocida en el visualizador local de Rollup; no debe declararse verde sin
comprobar la salida real. Las decisiones, el roadmap y la deuda vigente se mantienen en
[`docs/project/`](docs/project/). El control de commit, push, PR y merge permanece
manual.
