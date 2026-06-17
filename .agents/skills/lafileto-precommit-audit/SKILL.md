---
name: lafileto-precommit-audit
description: Pre-commit audit workflow for La Fileto local changes. Use before committing local work to inspect branch, status, diff, touched files, scope, risks, verification commands, and produce an APTO, APTO CON OBSERVACIONES, or NO APTO verdict without committing, pushing, or merging.
---

# La Fileto Precommit Audit

Use this skill to audit local uncommitted or staged changes before a commit.

## Required Evidence

Run or request current output for:

```bash
git branch --show-current
git status --short
git diff --stat
git diff
git diff --check
```

If staged changes exist, inspect them too:

```bash
git diff --cached --stat
git diff --cached
git diff --cached --check
```

## Audit Checklist

- Identify the active branch and whether it matches the intended task.
- List all touched files, separating staged, unstaged, untracked, and deleted files.
- Confirm the real scope from the diff, not from branch name or intent.
- Check whether changes touch forbidden or unrelated areas.
- Check whitespace with `git diff --check` and, when relevant, `git diff --cached --check`.
- Identify protected contracts affected by the diff.
- Identify missing tests, missing smokes, or unverified runtime behavior.
- Record commands executed and their results.

## Scope Review

Classify touched files by area:

- `apps/client`: Client UI, routing, cart, public flow, API consumption.
- `apps/admin`: Admin modules, routes, permissions, backend integration.
- `apps/backend`: endpoints, validation, RBAC, Prisma, database behavior.
- `.github` or workflow files: CI/CD behavior.
- root workspace files: monorepo commands, dependency graph, lockfiles, tooling.
- `docs`: documentation only, unless docs define project contracts.

Call out any file outside the approved scope.

## Output Format

Write the report in Spanish:

1. Rama y estado.
2. Archivos tocados.
3. Scope real.
4. Riesgos.
5. Contratos afectados.
6. Comandos ejecutados.
7. Evidencia relevante.
8. Dictamen final.

Use one of these verdicts:

- `APTO`: scope and checks are clean for Eduardo to decide whether to commit.
- `APTO CON OBSERVACIONES`: no blocking issue found, but there are explicit risks, missing checks, or follow-ups.
- `NO APTO`: blocking issue, scope violation, failed check, or unresolved risk.

Do not commit, push, create PRs, merge, or close PRs. Eduardo keeps manual control.
