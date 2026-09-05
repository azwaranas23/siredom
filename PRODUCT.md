# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user is an on-site referee operating one table during a live domino match. Organizers and admins are secondary operational users who manage tables, rules, tenants, and match records. TV and spectator viewers are secondary read-only users.

## Product Purpose

SIREDOM is a web system for recording domino matches quickly, accurately, and consistently in cafe, warkop, and tournament environments. It makes live match scoring, administration, and spectator monitoring dependable without relying on manual scorekeeping.

## Positioning

SIREDOM combines ruleset-specific scoring for Casual, PB PORDI, and PB ORADO with automatic round and result handling, isolated live sessions for each table, synchronized leaderboard views, and auditable match and scoring history.

## Operating Context

Referees use a touch-first interface at a single live table, primarily on phones and tablets in landscape orientation. Organizers configure tenants, tables, rules, and records. Spectators consume synchronized standings and match telemetry through read-only TV or leaderboard views.

## Capabilities and Constraints

- Separate scoring workflows and rules for Casual, PB PORDI, and PB ORADO.
- Automatic, consistent round and result handling with auditability of match history and scoring events.
- Per-table live-session isolation and synchronized spectator/leaderboard views.
- Indonesian-language product terminology.
- Touch-first responsive web UI, especially for referee use on phone and tablet landscape layouts.
- High legibility and clear visual hierarchy for live operation.
- Strong keyboard and focus accessibility for admin interfaces, plus reduced-motion support.
- Critical scoring states and actions must not rely on color alone; ruleset and player/seat identities must remain visually distinguishable.
- Visual work must not change business logic, scoring rules, tenant isolation, authentication, persistence, or routing behavior.
- Prefer reusable components, semantic design tokens, and consistent UI patterns that remain maintainable and scalable.

## Brand Commitments

The product should feel professional, operational, modern, and restrained, prioritizing reliability, clarity, speed of operation, and consistency over decorative or gamified visuals. Avoid generic AI or gaming-template aesthetics, including excessive gradients, glow, glassmorphism, nested cards, oversized rounding, decorative animation, and gratuitous color.

## Evidence on Hand

- Product requirements: `docs/PRD.md`.
- Existing Next.js implementation and UI components: `src/`.
- The repository contains real ruleset engines and scoring workflows for Casual, PB PORDI, and PB ORADO.

## Product Principles

1. Make live scoring fast, unambiguous, and reliable under match conditions.
2. Keep each table's operational state isolated, persistent, and auditable.
3. Express differences between rulesets through purposeful workflows, not added complexity.
4. Serve referees, organizers, and spectators with interfaces appropriate to their distinct roles.
5. Favor durable, accessible operational clarity over visual novelty.

## Accessibility & Inclusion

- Referee interfaces must be touch-friendly and legible on phones and tablets in landscape orientation.
- Admin interfaces require clear keyboard operation and visible focus states.
- Respect reduced-motion preferences.
- Do not use color as the sole indicator of scoring state, critical action, ruleset, or player/seat identity.
