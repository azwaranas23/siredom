# SIREDOM — Implementation Rules

Use this file only when implementing or modifying SIREDOM code.
Product requirements live in `PRD.md`; architecture in `ARCHITECTURE.md`;
scoring rules in `SKILLS.md`; workflow in `WORKFLOW.md`.

## Core invariants

1. Preserve ruleset isolation.
   - Never mix PB PORDI, PB ORADO, and Casual scoring behavior.
   - For scoring work, read `SKILLS.md` before modifying calculation logic.

2. Persist scoring changes.
   - Zustand is for transient/optimistic UI state.
   - Completed round mutations must persist through Server Actions.
   - `roundsHistory` is the authoritative history.
   - `playersData` scores must remain reconstructible from `roundsHistory`.

3. Preserve zero-redundancy scorer flow.
   - Do not introduce a persistent "Simpan & Lanjut" step.
   - Commit at the final action/modal step defined by the ruleset flow.

4. Preserve role isolation.
   - Wasit: `(wasit)/play/*`
   - Admin: `/admin/*`
   - Super Admin: `/superadmin/*`
   - Do not introduce a shared universal role navigation/layout.

5. Preserve type and tenant safety.
   - Avoid `any`.
   - Domain JSON types belong in `src/types/domino.ts`.
   - Tenant-owned database operations must be scoped by `tenantId`.

6. Preserve architectural decisions.
   - If a requested implementation conflicts with an existing ADR, surface the conflict before changing the architecture.
