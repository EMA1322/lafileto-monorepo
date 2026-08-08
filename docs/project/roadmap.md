---
status: CURRENT
verified_at: 2026-08-08
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
- **OPT-C / OPT-07 — Verification & CI Foundation:** runtime Node compartido, lint raíz corregido, verificación local/CI canónica, pre-commit con Gitleaks y mantenimiento de Actions.

## Active

No hay bloques activos versionados.

## Next

No hay bloques en estado `next`.

## Deferred / debt

- Ejecutar integración DB en CI solo con estrategia segura aprobada.
- CD y backup/restore.
- Reconciliar documentación API, Postman y ejemplos en una tarea contractual dedicada.
- Revisar documentos clasificados `NEEDS REVIEW` en el portal de docs.
- Evaluar por separado un gate global de Prettier, limpieza de warnings históricos o `verify:changed`; no forman parte de OPT-C.

## Needs decision

- Cualquier nueva fase visual de Client o Admin: 9F/10C no son trabajo futuro.
- Separar `products:changeStatus` como permiso runtime o mantener el comportamiento actual basado en `products:u`.
