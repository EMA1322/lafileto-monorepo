---
name: lafileto-post-pr-audit
description: Pull request audit workflow for La Fileto branches against origin/main. Use to inspect branch diff, real scope, touched files, CI, conflicts, mergeability, risks, and produce an APTO, APTO CON OBSERVACIONES, or NO APTO verdict without modifying GitHub state.
---

# La Fileto Post-PR Audit

Use this skill to audit a PR branch against `origin/main` after a PR exists or before final review.

## Required Evidence

Refresh repository metadata when appropriate, then inspect:

```bash
git branch --show-current
git status --short
git fetch origin
git diff --stat origin/main...HEAD
git diff --name-status origin/main...HEAD
git diff origin/main...HEAD
git diff --check origin/main...HEAD
```

Check mergeability without editing files:

```bash
git merge-tree --write-tree origin/main HEAD
```

When a GitHub PR number or branch is available, inspect CI with `gh` or the available GitHub tool. Prefer read-only commands.

## Work Item

For pull requests that use the [Work Item workflow](../../../docs/work-items/README.md):

1. Resolve the single Work Item referenced by the PR.
2. Verify that the Work Item exists in the available base or PR diff and record its ID and status.
3. Record the PR number, base SHA, head SHA, and exact SHA audited.
4. Compare the complete remote diff with Scope and Out of scope.
5. Evaluate every Acceptance Criterion as `PASS`, `FAIL`, or `NOT APPLICABLE` using observable evidence.
6. Confirm that CI checks correspond to the applicable head SHA.
7. Compare the PR body with the Work Item; the PR body does not redefine scope.
8. Treat work outside Scope as `NO APTO` unless a human-approved Scope amendment is already recorded.
9. Treat a missing or ambiguous Work Item as `NO APTO` for PRs under this workflow.

Do not edit the Work Item or copy its template into this skill.

## Audit Checklist

- Confirm branch and compare it to `origin/main`.
- Identify the real PR scope from `origin/main...HEAD`.
- List files touched and classify them by project area.
- Confirm whether CI is passing, failing, pending, missing, or unavailable.
- Check for conflicts or mergeability problems.
- Check `git diff --check origin/main...HEAD`.
- Identify protected contracts affected by the PR.
- Identify risks, missing tests, missing smokes, and review assumptions.

## Output Format

Write the report in Spanish:

1. PR, rama, base SHA, head SHA y SHA exacto auditado.
2. Work Item y status.
3. Scope match: sí/no.
4. Acceptance Criteria con resultado `PASS`, `FAIL` o `NOT APPLICABLE`.
5. Archivos tocados.
6. Checks, CI y mergeability.
7. Comparación del PR body con el Work Item.
8. Riesgos y contratos afectados.
9. Comandos ejecutados y evidencia relevante.
10. Dictamen final y recomendación explícita sobre squash merge.

Use one of these verdicts:

- `APTO`: ready for Eduardo's manual GitHub decision.
- `APTO CON OBSERVACIONES`: reviewable, with explicit non-blocking caveats.
- `NO APTO`: blocked by failed checks, conflicts, scope violation, or unresolved risk.

Do not commit, push, create PRs, merge, close PRs, resolve threads, or change GitHub state unless Eduardo explicitly asks.
