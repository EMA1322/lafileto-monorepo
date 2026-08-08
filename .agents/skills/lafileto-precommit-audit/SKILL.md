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

List untracked files separately:

```bash
git ls-files --others --exclude-standard
```

## Work Item

For pull requests that use the [Work Item workflow](../../../docs/work-items/README.md):

1. Locate the single Work Item for the PR.
2. Verify its ID and status. Pre-commit permits `active` or `completed`.
3. Compare the authorized Scope and Out of scope separately against staged, unstaged, and untracked files.
4. Evaluate every Acceptance Criterion as `PASS`, `FAIL`, or `NOT APPLICABLE` using observable evidence.
5. Treat a missing or ambiguous Work Item as `NO APTO`.
6. Treat work outside Scope as `NO APTO` unless a human-approved Scope amendment is already recorded.
7. Do not edit the Work Item during the audit.

The Work Item is the authority for scope. The diff is evidence and does not redefine authorization. Do not copy the Work Item template into this skill.

## Audit Checklist

- Identify the active branch and whether it matches the intended task.
- List all touched files, separating staged, unstaged, untracked, and deleted files.
- Confirm the real changed surface from the diff, then compare it with the authorized Work Item scope.
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
2. Work Item y status.
3. Archivos tocados, separados en staged, unstaged y untracked.
4. Scope match: sí/no.
5. Acceptance Criteria con resultado `PASS`, `FAIL` o `NOT APPLICABLE`.
6. Riesgos.
7. Contratos afectados.
8. Comandos ejecutados.
9. Evidencia relevante.
10. Dictamen final.

Use one of these verdicts:

- `APTO`: scope and checks are clean for Eduardo to decide whether to commit.
- `APTO CON OBSERVACIONES`: no blocking issue found, but there are explicit risks, missing checks, or follow-ups.
- `NO APTO`: blocking issue, scope violation, failed check, or unresolved risk.

Do not commit, push, create PRs, merge, or close PRs. Eduardo keeps manual control.
