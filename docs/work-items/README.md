---
status: CANONICAL
verified_at: 2026-08-07
scope: Contrato operativo versionado para una sola pull request.
---

# Work Items

## Purpose

Un Work Item es el contrato operativo versionado de una sola PR. Define el objetivo, el scope autorizado, los límites, los criterios de aceptación y la verificación específica de esa tarea.

No es un documento de arquitectura, una transcripción de chat, un plan de implementación gigante, una copia de [AGENTS.md](../../AGENTS.md), un GitHub Issue obligatorio ni un reporte de resultados. La plantilla reutilizable vive en [TEMPLATE.md](./TEMPLATE.md), y los resultados se informan con la [salida estándar de Codex](../templates/codex-result-template.md).

## Authority

La jerarquía operativa del proyecto es:

1. instrucciones de plataforma y usuario;
2. `AGENTS.md` aplicables;
3. Work Item aprobado;
4. prompt operativo;
5. diff real como evidencia;
6. salida Codex y PR body como reportes.

`AGENTS.md` conserva reglas durables. El Work Item gobierna el scope y los Acceptance Criteria de la PR. El prompt selecciona la operación, pero no amplía el Work Item silenciosamente. El diff demuestra lo ocurrido, pero no autoriza scope. La salida Codex y el PR resumen resultados; no redefinen el contrato.

Ante un conflicto, se detiene la parte afectada. Un Work Item no puede debilitar un `AGENTS.md`, y un PR body contradictorio debe corregirse para coincidir con el Work Item.

## IDs and filenames

- ID: `WI-0001`.
- Archivo: `docs/work-items/WI-0001-short-kebab-slug.md`.
- Asignación: máximo ID versionado más uno.
- La secuencia es global y usa cuatro dígitos.
- Antes de aprobar, se comprueba que no exista una colisión.
- Un ID nunca se reutiliza, incluso si su Work Item termina `cancelled`.

La asignación es manual. OPT-B no añade automatización, registry ni índice generado.

## Branch naming

Los Work Items posteriores a OPT-B usan:

```text
<type>/wi-NNNN-short-kebab-slug
```

Tipos compatibles: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build` y `ci`. El tipo describe el tema principal; no obliga a inventar un scope de commit.

`WI-0001` es la excepción bootstrap y conserva la rama existente `chore/opt-b-development-workflow-standardization`. No debe renombrarse para aplicar retroactivamente esta convención.

## Status

- `draft`: diseño todavía no aprobado.
- `active`: scope aprobado y ejecutable.
- `blocked`: no puede progresar por una decisión, permiso o dependencia.
- `completed`: contrato local satisfecho y verificaciones obligatorias resueltas. No significa que el PR ya esté mergeado.
- `cancelled`: trabajo abandonado; el ID queda reservado permanentemente.

No existe status `merged`. El merge pertenece al lifecycle de GitHub.

## Lifecycle

```text
idea
→ análisis read-only
→ draft
→ aprobación humana
→ active
→ implementación
→ blocked/active si aplica
→ verificaciones
→ completed
→ pre-commit audit
→ commit/push manual
→ PR
→ CI
→ post-PR audit
→ squash merge manual
```

El pre-commit audit normalmente ocurre cuando el Work Item ya refleja el contrato final y puede comprobar si merece `completed`. Si una verificación bloqueante falla, se mantiene `active` o pasa a `blocked`, según la causa.

Los Work Items permanecen en `docs/work-items/`; no se mueven a carpetas de activos o completados. La ruta estable evita enlaces rotos y commits administrativos después del merge.

## Definition of Ready

Un Work Item puede pasar a `active` cuando:

- tiene un objetivo único y una razón suficiente;
- Scope y Out of scope son inequívocos;
- Current evidence contiene al menos una referencia verificable;
- identifica Protected contracts o justifica `N/A`;
- sus Acceptance Criteria son observables y verificables;
- Verification referencia perfiles canónicos y agrega solo casos específicos;
- Risks and dependencies están declarados o justifican `N/A`;
- una instrucción humana aprobó el scope.

`N/A` siempre incluye una razón. No se admite en Objective, Scope, Out of scope, Current evidence ni Acceptance criteria.

## Acceptance Criteria

- Usan IDs estables: `AC-01`, `AC-02`, etc.
- Describen resultados observables y verificables.
- Evitan detalles de implementación que no sean necesarios para definir el resultado.
- No incluyen `PASS` o `FAIL`; el Work Item define criterios y el reporte externo registra resultados.
- Un criterio aplicable que no pudo evaluarse no puede quedar oculto como `NOT RUN`: debe resultar `FAIL` o impedir el estado `COMPLETADO`.

## Verification contract

El Work Item referencia primero las verificaciones canónicas de los `AGENTS.md` de aplicación y de la documentación de procesos. Solo incluye comandos exactos cuando una comprobación específica no tiene fuente canónica.

Ejemplo:

```text
- Required: Client routine verification — see `apps/client/AGENTS.md`.
- Required: manual smoke — cart persistence after reload.
- Not applicable: Backend DB verification — no Backend or DB changes.
```

No se copian comandos rutinarios ni se convierten smokes, builds o checks de otras áreas en requisitos universales.

## Scope gaps

Si Codex descubre trabajo necesario fuera de Scope:

1. detiene esa parte;
2. reporta el scope gap;
3. no edita Scope ni Acceptance Criteria automáticamente;
4. el usuario decide entre ampliar el Work Item, crear otro Work Item/PR o cancelar;
5. si la ampliación se aprueba, se actualiza el Work Item y se registra un Scope amendment antes de implementar.

Cada amendment registra una fecha verificable, el resumen, la instrucción humana que lo aprobó y su impacto en Scope, Out of scope o Acceptance Criteria. No almacena la conversación completa.

## Adjustments within the same scope

Un ajuste puntual continúa en el mismo Work Item cuando mantiene el objetivo, respeta Out of scope, no cambia un contrato sustancial y no incorpora una superficie nueva no autorizada.

Si alguna condición deja de cumplirse, se requiere un Scope amendment aprobado o un nuevo Work Item/PR para preservar la regla de un tema por PR.

## Prompt snippets

### Analyze

```text
Analizá en modo read-only el objetivo o Work Item indicado contra el repositorio. Seguí AGENTS.md y devolvé evidencia, scope gaps, contratos, riesgos, plan y verificaciones. No implementes ni hagas operaciones Git.
```

### Implement

```text
Implementá el Work Item <ruta>. Seguí AGENTS.md, verificá primero el estado actual y limitate al scope aprobado. Si aparece un scope gap, detené esa parte. No hagas commit, push, PR ni merge. Al finalizar usá la salida estándar de Codex.
```

### Adjust

```text
En el Work Item <ID>, ajustá únicamente <cambio>. Confirmá que sigue dentro del scope; si lo amplía, no lo implementes y reportá el gap. Reejecutá las verificaciones afectadas y usá la salida estándar. Sin operaciones Git.
```

## Relationship to GitHub Issues

Los Work Items tienen una estructura issue-like, pero GitHub Issues es opcional. Un Issue externo puede enlazarse desde References; el Work Item versionado sigue siendo el contrato de la PR. La Fileto no mantiene un segundo sistema obligatorio ni Issue Forms para este flujo.

## Scaling

No se mantiene un índice manual de todos los Work Items. Los archivos, sus IDs estables y la búsqueda del repositorio son suficientes tanto para pocas PR como para cientos de ellas. Codex debe cargar el Work Item específico, no el historial completo.
