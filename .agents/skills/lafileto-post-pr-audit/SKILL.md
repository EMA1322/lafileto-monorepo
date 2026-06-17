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

1. Rama/base.
2. Scope real del PR.
3. Archivos tocados.
4. CI y mergeability.
5. Riesgos.
6. Contratos afectados.
7. Comandos ejecutados.
8. Dictamen final.

Use one of these verdicts:

- `APTO`: ready for Eduardo's manual GitHub decision.
- `APTO CON OBSERVACIONES`: reviewable, with explicit non-blocking caveats.
- `NO APTO`: blocked by failed checks, conflicts, scope violation, or unresolved risk.

Do not commit, push, create PRs, merge, close PRs, resolve threads, or change GitHub state unless Eduardo explicitly asks.
