---
name: design-system-enforcer
description: Use this when adding or reviewing UI in the TMA Platform to keep sections aligned with the existing tokens, spacing, typography, motion presets, and premium dark visual language.
---

# Design System Enforcer

Use this skill when building or reviewing new sections, cards, forms, or page layouts.

## Preserve the current TMA language

Reuse the existing:
- tokens
- spacing rhythm
- typography patterns
- CTA styles
- card treatments
- dark premium aesthetic
- subtle preset-based motion

Inspect the current implementation before adding new styles:
- shared TMA CSS files
- current block renderers
- existing public section patterns

## Do not introduce

- a second visual system
- bright or generic marketing UI that clashes with TMA
- uncontrolled animation behavior
- inconsistent section/card/button styling
- page-specific ad hoc style islands when shared styles should be reused

## Required review points

Check:
- desktop, tablet, and mobile behavior
- spacing consistency between sections
- readable hierarchy and CTA clarity
- media/card proportions
- no visual drift from existing premium dark direction

## Implementation bias

Prefer:
- shared classes and tokens
- small extensions to existing styles
- preset-based options over freeform styling

Avoid:
- one-off style hacks that editors must work around later
