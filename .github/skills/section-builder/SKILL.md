---
name: section-builder
description: Use this when building or extending a CMS section in the TMA Platform. Reuse the existing block architecture, keep everything CMS-driven, and cover typing, presets, rendering, editor UI, localization, and validation.
---

# Section Builder

Use this skill for section and page-block work in the existing TMA platform.

## Start here

Inspect the current implementation before adding anything:
- `src/types/cms.ts`
- `src/lib/cms/layoutBlockPresets.ts`
- `src/lib/cms/hydrateContentLibraries.ts`
- `src/components/blocks/PageLayout.tsx`
- relevant editor files in `src/components/console/*`

Check `AGENTS.md` first for architecture, CMS, localization, admin UX, and quality constraints.

## Required workflow

1. Reuse-first audit
   - confirm whether an existing block already solves the request
   - confirm whether an existing library/entity already fits
   - do not create a parallel page, section, or content system
2. Extend the block contract only where needed
   - add or update the typed block shape in `src/types/cms.ts`
   - keep defaults concise and editor-safe
3. Register the block in presets
   - add sensible starter content in `src/lib/cms/layoutBlockPresets.ts`
4. Wire the public renderer
   - implement in `src/components/blocks/PageLayout.tsx`
   - preserve existing layout and localization conventions
5. Wire the console editor
   - add editor fields in the current page-builder flow
   - prefer toggles, presets, helper text, and guided fields over raw configuration
6. Preserve DE/EN readiness
   - section copy and labels must work for German-first, English-secondary flows
   - do not hardcode single-language assumptions
7. Validate
   - typecheck
   - relevant tests
   - build
   - verify public rendering and console editability

## Guardrails

Never:
- hardcode frontend-only content for a CMS section
- bypass the current page builder or hydration flow
- duplicate storage or introduce a new section system
- assume a greenfield app

Always:
- keep PostgreSQL/CMS as source of truth
- preserve existing block chrome, responsive behavior, and editor usability
- keep changes small, typed, and maintainable
