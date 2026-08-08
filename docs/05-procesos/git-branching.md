---
status: CANONICAL
verified_at: 2026-08-07
scope: Convenciones de ramas, commits, publicación y merge.
---

# Git branching

## Branch naming

Los Work Items posteriores a OPT-B usan:

```text
<type>/wi-NNNN-short-kebab-slug
```

Tipos compatibles: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `build` y `ci`.

`WI-0001` es la excepción bootstrap y conserva `chore/opt-b-development-workflow-standardization`. La rama no se renombra para aplicar retroactivamente la convención.

## Conventional Commits

Los commits y el título final de squash usan cuando corresponda:

```text
type(scope): summary
```

Tipos razonables: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `build` y `ci`. El scope es opcional cuando no aporta precisión; no se inventan scopes ficticios.

## Publication authority

Eduardo conserva el control manual de commit, push, creación o cierre de PR, merge y cleanup de ramas. Codex solo realiza estas operaciones mediante una instrucción explícita que las autorice.

## Pull requests

- Una PR contiene un tema y un Work Item.
- El Work Item gobierna Scope y Acceptance Criteria.
- El PR resume el resultado y la evidencia.
- La convención de integración es squash merge manual a `main`.

## Branch protection and reviews

Branch protection, required checks y required reviews son settings o rulesets de GitHub. No se consideran activos únicamente por estar mencionados en documentación o por existir `CODEOWNERS`; deben verificarse live cuando una decisión dependa de ellos.

## Releases

No existe evidencia durable de un proceso activo de releases SemVer. Una política de versionado o release requiere una decisión y un workflow futuros; no es una obligación de este proceso.
