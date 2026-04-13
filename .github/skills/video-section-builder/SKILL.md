---
name: video-section-builder
description: Use this when building or upgrading a premium CMS-driven video showcase section in the TMA Platform, with simple admin UX, existing block architecture reuse, and localization-safe content fields.
---

# Video Section Builder

Use this skill when the request is specifically about a CMS-managed video section.

## Reuse-first check

Inspect the current section/block architecture before changing anything:
- `src/types/cms.ts`
- `src/lib/cms/layoutBlockPresets.ts`
- `src/components/blocks/PageLayout.tsx`
- `src/components/console/*`

If an existing `video` block already covers most of the need, extend it instead of creating a new parallel section.

## Required capabilities

Support the current TMA CMS flow for:
- uploaded media or external URL
- poster image
- eyebrow
- title
- description
- caption
- CTA
- autoplay
- muted
- loop
- controls
- layout/aspect-ratio presets

## Admin UX rules

Keep the editor simple:
- use toggles for playback behavior
- use presets for aspect ratio/layout
- provide helper text for autoplay/muted/controls interactions
- use the existing media picker/upload flow where possible
- avoid raw technical fields unless the current architecture requires them

## Rendering rules

- preserve TMA’s premium dark design language
- keep motion subtle and preset-based
- support missing-media fallbacks cleanly
- keep DE/EN-safe text structure
- do not hardcode page-specific content into the renderer

## Validation

Verify:
- console editability
- public rendering
- poster/media fallback behavior
- responsive behavior
- DE/EN safety
- typecheck/build/test readiness
