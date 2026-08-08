---
status: CURRENT
verified_at: 2026-08-07
scope: Trabajo aprobado, deuda demostrada y decisiones pendientes.
---

# Roadmap — La Fileto

Estados: `completed`, `active`, `next`, `planned`, `optional`, `blocked`, `deferred`, `superseded`, `needs-decision`. El roadmap no redefine el estado actual: consultar [current-state](./current-state.md).

## Completed

- Client React y contratos públicos versionados.
- Foundation y rediseño principal del Client.
- Admin React con router hash propio.
- Settings y Contact públicos.
- Bloques visuales Client 9F y Admin 10C.
- SEC-01, SEC-02, SEC-03 y SEC-04.
- **OPT-A — Project Knowledge Foundation:** docs, AGENTS y skills como sistema navegable de conocimiento durable.
- **OPT-B — Development Workflow Standardization:** Work Items versionados y Pull Request template operativo.

## Active

No hay bloques activos versionados.

## Next

OPT-C permanece en `needs-decision` hasta que una instrucción aprobada se registre en este repositorio.

## Deferred / debt

- **OPT-07/tooling:** integración local adicional de secret scan/Husky y actualizaciones Dependabot de Actions.
- Ejecutar integración DB en CI solo con estrategia segura aprobada.
- CD y backup/restore.
- Reconciliar documentación API, Postman y ejemplos en una tarea contractual dedicada.
- Revisar documentos clasificados `NEEDS REVIEW` en el portal de docs.
- Resolver la deuda del visualizador/lint raíz en OPT-C/OPT-07, sin declararlo verde hasta verificarlo.

## Needs decision

- Alcance y compromiso de OPT-C — Verification & CI Foundation.
- Cualquier nueva fase visual de Client o Admin: 9F/10C no son trabajo futuro.
- Separar `products:changeStatus` como permiso runtime o mantener el comportamiento actual basado en `products:u`.
