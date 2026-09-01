# SIREDOM

## Working rules

- Inspect relevant code before editing; do not guess existing behavior.
- Make the smallest correct change. Do not modify unrelated files.
- Preserve existing architecture, conventions, and dependencies.
- Do not read all project documentation by default.
- Load only documentation relevant to the current task.

## Development workflow

- For bug fixes, regressions, and non-trivial feature requests, invoke the project skill `$siredom-task` before investigating.
- For non-trivial work, present an implementation plan before changing code.
- Before requesting implementation approval, create or update the relevant devlog as `Planned` with findings and the proposed implementation.
- Do not implement until the user explicitly approves the plan.
- After approval, implement without re-planning unless new evidence requires a material change.
- After implementation, validate the change and update the same devlog with actual changes and verification evidence.
- Mark the devlog `Done` or `Fixed` only after implementation validation succeeds.
- User manual testing is the final acceptance gate.
## Agent usage

- Prefer a single agent for normal bug fixes and features.
- Use subagents or parallel investigation only for clearly independent workstreams or when explicitly requested.

## Documentation routing

- Product behavior / requirements → `docs/PRD.md`
- Architecture / data flow / database → `docs/ARCHITECTURE.md` + relevant `docs/adr/*`
- PORDI / ORADO / Casual scoring rules → `docs/SKILLS.md`
- Current implementation status / next work → `docs/ROADMAP.md`
- Development, Git, Prisma, testing, deployment → `docs/WORKFLOW.md`
- Coding implementation rules → `docs/AGENTS.md`
- GitHub issue operations → `docs/agents/issue-tracker.md`
- Issue triage only → `docs/agents/triage-labels.md`
- Domain terminology only when needed → `docs/agents/domain.md`

## Validation

For code changes, run the narrowest relevant validation first.
Before declaring implementation complete, run `npx tsc --noEmit`.
Report changed files, validation performed, and unresolved issues concisely.
