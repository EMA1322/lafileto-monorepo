---
id: WI-0001
status: completed
---

# WI-0001 — Development Workflow Standardization

## Objective

Implementar OPT-05 y OPT-06 para que cada PR de La Fileto tenga un contrato de scope versionado, una salida Codex verificable y un PR body operativo, evitando que prompts, skills y documentos repitan reglas durables o reconstruyan la autorización únicamente desde el diff.

## Scope

- Crear la especificación y la plantilla de Work Items.
- Crear la salida estándar de Codex para implementaciones.
- Integrar Work Items en `AGENTS.md` y el portal documental.
- Actualizar el proceso de desarrollo y la convención de branches.
- Reemplazar el Pull Request template actual.
- Integrar el Work Item y sus Acceptance Criteria en las auditorías pre-commit y post-PR.
- Registrar DEC-019 y actualizar el roadmap de OPT-A, OPT-B y OPT-C.
- Crear WI-0001 como contrato real y excepción bootstrap de esta PR.

## Out of scope

- Código o contratos runtime bajo `apps/**` o `packages/**`.
- Manifests, lockfile, dependencias, ESLint, Prettier, Husky, tests, runners, Prisma, migraciones, seed, scripts, Gitleaks o Secret Scanning.
- Workflows, CODEOWNERS, branch protection, required reviewers o cualquier enforcement automático.
- `current-state.md`, `coding-standards.md`, `testing.md`, `ci-cd.md`, skills generales o OPT-C.
- GitHub Issues, Issue Forms, registries, índices generados, validadores o directorios `active/` y `completed/`.
- Commit, push, creación/cierre de PR, merge, rename o eliminación de branches.

## Current evidence

- En el HEAD inicial `4c466bd9aebb56e17ee557a6bf50dfc8241a33bd`, [AGENTS.md](../../AGENTS.md) ya gobernaba autoridad documental, un tema por PR, Git manual, seguridad y verificaciones.
- En ese baseline, [procesos.md](../05-procesos/procesos.md) permanecía Draft y exigía verificaciones universales que no correspondían a todas las tareas.
- En ese baseline, [git-branching.md](../05-procesos/git-branching.md) mezclaba convenciones con settings de GitHub no verificadas y SemVer no demostrado como proceso activo.
- En ese baseline, [PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md) no referenciaba scope ni Work Item y exigía dev, health y builds universales.
- En ese baseline, los skills [pre-commit](../../.agents/skills/lafileto-precommit-audit/SKILL.md) y [post-PR](../../.agents/skills/lafileto-post-pr-audit/SKILL.md) auditaban el diff, pero no consumían un contrato de scope versionado.
- En ese baseline, el [roadmap](../project/roadmap.md) clasificaba OPT-A como activo y OPT-B como pendiente de decisión.

## Protected contracts

- La jerarquía de instrucciones y la autoridad documental de `AGENTS.md`.
- La regla de una PR por tema y el control manual de Git por Eduardo.
- El diff como evidencia, no como autorización de scope.
- La separación entre docs durables, skills procedimentales, salida Codex y PR body.
- La ausencia de cambios en runtime, tooling, CI, seguridad automática y governance de GitHub.

## Acceptance criteria

- AC-01: Existe una estructura Work Item canónica, con ruta estable, estados definidos y campos obligatorios claros.
- AC-02: WI-0001 instancia correctamente el template y satisface Definition of Ready.
- AC-03: La salida estándar Codex soporta `COMPLETADO`, `PARCIAL`, `BLOQUEADO`, `PASS`, `FAIL`, `NOT RUN` y `NOT APPLICABLE` sin chain-of-thought.
- AC-04: AGENTS y procesos establecen al Work Item aprobado como contrato de scope por PR sin duplicar reglas durables.
- AC-05: La auditoría pre-commit compara el diff local contra el Work Item y sus Acceptance Criteria.
- AC-06: La auditoría post-PR compara el diff remoto, checks y SHA contra el mismo Work Item.
- AC-07: El PR template referencia el Work Item y recoge resultado y verificación sin duplicar el contrato completo.
- AC-08: Procesos y git-branching dejan de afirmar como universales `pnpm dev`, health, builds globales, required reviews o branch protection no verificada.
- AC-09: No existe modificación fuera del allowlist y no se altera tooling, CI, CODEOWNERS ni aplicaciones.
- AC-10: Todos los enlaces relativos nuevos o modificados resuelven.

## Verification

- Required: documentation structure, terminology and relative-link verification.
- Required: Work Item template, Definition of Ready, result report, PR body and scope-gap simulations.
- Required: Prettier check limitado a los trece archivos Markdown modificados o creados.
- Required: residual search sobre los documentos canónicos tocados.
- Required: final Git allowlist, status and diff checks without staging.
- Required: La Fileto pre-commit audit readiness review.
- Conditional: `pnpm secrets:scan` si Gitleaks 8.30.1 está disponible; registrar la limitación del contenido unstaged.
- Not applicable: application tests, builds, smokes and database verification — this Work Item changes documentation and procedures only.

## Risks and dependencies

- WI-0001 autoaplica un workflow que todavía no está en `main`; la revisión debe considerar esta excepción bootstrap.
- El nuevo PR template no se autoinyectará necesariamente en el propio PR OPT-B y deberá usarse manualmente.
- `CODEOWNERS` conserva owners placeholder y no demuestra review enforcement; corregirlo requiere una tarea de governance separada.
- Branch protection y required reviews son settings externos y deben verificarse live cuando una tarea futura dependa de ellos.

## Deferred

- OPT-C: tooling, runners y CI foundation.
- CODEOWNERS, branch protection y required reviews: governance separada.
- Automatización futura de IDs, estados, enlaces o validación de Work Items.

## Scope amendments

- N/A — no approved amendments.

## References

- [Work Item system](./README.md)
- [Work Item template](./TEMPLATE.md)
- [Codex result template](../templates/codex-result-template.md)
- [Decision register](../project/decision-register.md)
- [Roadmap](../project/roadmap.md)
