---
name: cms-guard
description: Use this when implementing or reviewing TMA Platform changes that risk architecture drift. Enforces reuse-first behavior, CMS-driven delivery, DE/EN readiness, and avoidance of duplicate or hardcoded systems.
---

# CMS Guard

Use this skill as a gate before implementing new sections, pages, libraries, or admin flows.

## Reuse-first audit

Before building:
- inspect existing block types, libraries, routes, and editor flows
- confirm whether an existing model or block can be reused
- confirm whether the requested behavior belongs in the CMS instead of the frontend

## Blocked patterns

Do not allow:
- hardcoded frontend-only page content when the CMS should own it
- duplicate models if an existing entity already fits
- isolated admin-only configuration that bypasses the public CMS flow
- one-off render paths outside the current page/block architecture
- greenfield-style rebuilds inside the existing repo

## Required checks

Confirm that:
- PostgreSQL remains the source of truth
- backend-controlled logic stays centralized
- the public site remains CMS-driven
- DE/EN structure is preserved
- editor-facing behavior stays editable from the console where expected
- integrations do not become the source of truth

## Output standard

Call out:
- what can be reused
- what must be extended
- what should not be created
- any architecture drift risk before implementation continues
