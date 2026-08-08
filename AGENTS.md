# La Fileto repository guide

## Repository knowledge

- Start at [docs/README.md](docs/README.md), the documentation portal.
- Read [current-state.md](docs/project/current-state.md) before assuming mutable project state.
- Use the decision register for durable decisions and the roadmap only for approved future work.
- Historical documents provide traceability; they do not govern new decisions.
- Executable behavior (code, schema, config, workflows, and tests run by their runners) is the primary evidence of current behavior.

## Repository shape

- `apps/client`: public Client.
- `apps/admin`: management Admin.
- `apps/backend`: API.
- `docs`: durable project knowledge.
- `packages`: shared packages.
- `.agents`: reusable procedures.

## Working rules

- Analyze with evidence and keep changes small: one PR, one theme.
- Do not expand scope without explicit approval.
- Use English for new code and identifiers; write user-facing documentation and reports in Spanish.
- Do not copy external code or assets.
- Follow the applicable app-level `AGENTS.md` before changing an app.

## Work Items

For work that results in a pull request, use the approved Work Item as the scope contract and read the [Work Item system](docs/work-items/README.md). Do not expand Scope or Acceptance Criteria silently; report scope gaps and wait for an approved amendment before implementing them. Use the [Codex result template](docs/templates/codex-result-template.md) for implementation reports. La Fileto audits compare the Work Item against the real diff and verification evidence.

## Git authority

Eduardo keeps manual control of commits, pushes, PR creation or closure, merges, and branch deletion unless explicitly instructed otherwise. Suggest commands when useful; do not perform those actions automatically.

## Safety and verification

- Never expose secrets or modify `.env` files without explicit need and approval.
- Read [env.md](docs/07-anexos/env.md), [testing.md](docs/05-procesos/testing.md), and [seguridad.md](docs/07-anexos/seguridad.md) before DB, migration, seed, reset, or smoke work.
- Do not describe a verification command as green without fresh evidence. Use the root `pnpm verify` script for complete repository verification and the application-level commands for narrower Work Item scopes.
- Use app-level scripts for routine checks; DB and smoke operations are opt-in and are not routine commands.

## Skills

For La Fileto audits, use the project-specific skills before equivalent general skills when they fit the task: `lafileto-project-context`, app audits, CI audit, pre-commit/post-PR audits, and `verification-before-completion`.
