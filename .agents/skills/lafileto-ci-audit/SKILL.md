---
name: lafileto-ci-audit
description: CI/CD audit workflow for La Fileto. Use when a task affects GitHub Actions, workflow jobs, monorepo scripts, package commands, pipeline failures, check interpretation, or minimal CI fixes that require a plan before modifying workflows.
---

# La Fileto CI Audit

Use this skill when auditing or planning work that affects CI/CD.

## CI Scope

Inspect the task against:

- GitHub Actions workflow files.
- Jobs, steps, permissions, caching, artifacts, and environment variables.
- pnpm workspace install and command behavior.
- Package scripts used by Client, Admin, Backend, and repository-level checks.
- Pipeline failures and logs.
- Branch protection expectations when visible.

Do not modify workflows automatically. Propose minimal changes first and wait for Eduardo's approval before editing CI/CD files.

## Evidence To Gather

Use read-only inspection first:

```bash
git branch --show-current
git status --short
git diff --stat origin/main...HEAD
git diff --name-status origin/main...HEAD -- .github package.json pnpm-workspace.yaml pnpm-lock.yaml
git diff origin/main...HEAD -- .github package.json pnpm-workspace.yaml pnpm-lock.yaml
git diff --check origin/main...HEAD
```

When a PR or run is available, inspect checks and logs with `gh` or the available GitHub tool using read-only commands.

## Audit Checklist

- Identify changed workflows, jobs, and scripts.
- Confirm commands match the pnpm monorepo structure.
- Confirm each job has the required setup, install, cache, and working directory assumptions.
- Confirm permissions are no broader than needed.
- Identify failing jobs and the first actionable error from logs.
- Propose the smallest viable change when a fix is needed.
- Separate confirmed failures from hypotheses.

## Output Format

Write the report in Spanish:

1. Scope CI real.
2. Workflows/jobs/scripts afectados.
3. Estado de checks o pipeline.
4. Error raíz confirmado, si existe.
5. Cambio mínimo propuesto, si aplica.
6. Riesgos.
7. Comandos ejecutados.
8. Dictamen final.

Use one of these verdicts:

- `APTO`: CI/CD scope is clean or the pipeline is healthy.
- `APTO CON OBSERVACIONES`: non-blocking risks or missing evidence remain.
- `NO APTO`: failing pipeline, unsafe workflow change, scope violation, or unresolved blocker.

Do not commit, push, create PRs, merge, close PRs, rerun production-affecting jobs, or modify workflows without Eduardo's explicit approval.
