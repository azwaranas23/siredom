---
name: siredom-task
description: Investigate and plan SIREDOM bugs or feature requests using the repository workflow. Use when the user reports a bug, issue, regression, or requests a non-trivial feature in SIREDOM.
---

# SIREDOM Task Workflow

Follow the repository `AGENTS.md`.

## Scope guard

If the user has not provided a concrete bug, issue, regression, or feature request:
- do not scan or analyze the repository broadly;
- ask for the specific problem, expected behavior, and observed behavior;
- wait for that information before investigating files or documentation.

When a concrete task is provided:
- use the information already supplied by the user;
- ask only for missing information that blocks investigation;
- do not request optional details before inspecting relevant code;
- if the affected route, component, or reproduction path is known, begin with that scope instead of scanning the repository.
- when an affected route or file path is known, inspect that exact path and its direct imports/dependencies first; use repository-wide search only if targeted inspection does not locate the relevant implementation.


For a non-trivial bug or feature:

1. Inspect the relevant implementation before proposing changes.
2. Read only the project documentation relevant to the task.
3. Prefer static inspection before starting development servers or broad runtime validation.
   - Do not run `npm run dev`, full builds, or long-running processes during planning unless runtime reproduction is necessary to identify the root cause.
   - Prefer targeted source inspection, type information, existing tests, and narrow commands first.
4. Determine the root cause, current implementation gap, or required behavior.
5. Produce a concise implementation plan containing:
   - findings;
   - intended solution;
   - files likely to change;
   - validation to run.
6. Create or update the corresponding devlog with status `Planned`.
7. Stop and wait for explicit user approval.

Do not modify implementation code before approval.

After approval:

1. Implement the approved plan.
2. Avoid unrelated refactoring.
3. Run the narrowest relevant validation first.
4. Run `npx tsc --noEmit` before declaring the code task complete.
5. Update the same devlog with actual changes and verification evidence.
6. Mark it `Done` or `Fixed` only after implementation validation succeeds.
7. Return the work to the user for manual testing.

Re-plan only if new evidence materially invalidates the approved plan.
