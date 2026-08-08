---
status: CANONICAL
verified_at: 2026-08-07
scope: Workflow de una PR, Definition of Ready, Definition of Done y coordinación.
---

# Proceso de desarrollo

## Workflow

```text
análisis read-only
→ Work Item
→ aprobación humana
→ implementación
→ verificación
→ pre-commit audit
→ commit/push manual
→ PR
→ CI
→ post-PR audit
→ squash merge manual
→ actualización y cleanup manual de main
```

## Roles de las fuentes

- `AGENTS.md`: reglas durables, seguridad, autoridad y verificaciones por área.
- [Work Item](../work-items/README.md): contrato de scope y Acceptance Criteria de una PR.
- [Salida Codex](../templates/codex-result-template.md): reporte local de cambios y evidencia.
- PR body: resumen para review; no redefine el Work Item.
- CI: evidencia automatizada de los workflows vigentes.
- Auditorías: comparación independiente entre autorización, diff y evidencia.

El diff demuestra lo ocurrido, pero no autoriza scope.

## Definition of Ready

La tarea puede implementarse cuando su Work Item satisface la [Definition of Ready canónica](../work-items/README.md#definition-of-ready) y tiene status `active`.

## Definition of Done — implementación

- Todos los Acceptance Criteria aplicables están satisfechos.
- Las verificaciones obligatorias están resueltas o existe un waiver humano registrado.
- El diff permanece dentro del Scope y respeta Out of scope.
- La documentación se actualizó cuando cambió un contrato durable.
- La salida estándar Codex reporta resultados, verificaciones y Git final con evidencia fresca.

Un `NOT RUN` aplicable o un criterio fallido impide declarar `COMPLETADO` salvo la resolución explícita definida por el Work Item.

## Definition of Done — PR

- La auditoría pre-commit tiene un dictamen aceptable para la decisión manual de Eduardo.
- Commit, push y creación del PR fueron realizados manualmente.
- El PR resume el Work Item y el resultado sin redefinir scope.
- Los checks corresponden al SHA que se revisa.
- La auditoría post-PR tiene un dictamen aceptable y recomienda el siguiente paso.
- El merge se realiza por squash de forma manual.
- `main` y el cleanup de la rama se actualizan manualmente después del merge.

## Scope gaps

Ante trabajo necesario fuera de Scope, detener esa parte y seguir el [procedimiento de scope gaps](../work-items/README.md#scope-gaps). Codex no edita Scope ni Acceptance Criteria sin una ampliación humana aprobada y registrada.

## Review and governance

La convención del proyecto es una PR por tema y un Work Item por PR. GitHub settings y rulesets determinan el enforcement real de branch protection, required checks y reviews; deben verificarse live cuando sean relevantes.

`CODEOWNERS` por sí solo no demuestra reviewers obligatorios ni aprobación requerida. Este proceso no afirma settings de GitHub que no estén verificados.

## Verification and tooling

Cada Work Item selecciona verificaciones mediante los `AGENTS.md` y documentos canónicos aplicables. `pnpm dev`, health, builds, root lint y smokes no son requisitos universales.

La deuda de tooling y CI pertenece a OPT-C/OPT-07. Este proceso no presenta `pnpm -r lint` como universalmente verde ni corrige tooling.
