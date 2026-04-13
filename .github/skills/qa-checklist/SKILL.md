---
name: qa-checklist
description: Use this when reviewing a completed TMA Platform feature to verify CMS editability, responsive behavior, localization, media fallback handling, build safety, and missing user or editor actions.
---

# QA Checklist

Use this after implementation or during review.

## Validate the real TMA contract

1. Requirement coverage
   - does the feature match the requested scope and success criteria?

2. CMS editability
   - can editors control the feature through the existing console/CMS flow?
   - are helper text, toggles, presets, and defaults understandable?
   - is there any hidden state or missing action that would confuse editors?

3. Public UX and responsiveness
   - mobile
   - tablet
   - desktop
   - spacing, alignment, CTA clarity, and missing actions

4. Media and fallbacks
   - missing image/video/media fallback behavior is safe
   - no broken placeholders or clipped media layouts

5. Localization
   - German-first behavior works
   - English-secondary behavior works
   - no accidental mixed-language output
   - missing translations are handled intentionally

6. Forms, leads, and booking when relevant
   - validation
   - success/error handling
   - attribution/storage flow
   - booking/provider behavior

7. Permissions and admin safety
   - role-based access still works
   - no write path bypasses the intended console rules

8. Regression and readiness
   - nothing important regressed
   - `typecheck`
   - relevant tests
   - `build`

## Output format

- Critical
- Major
- Minor
- Follow-up
