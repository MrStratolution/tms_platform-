# CSS Architecture Decision Record

## Decision: Custom Token-Based CSS (not Tailwind)

**Status:** Accepted  
**Date:** 2026-03-31  
**Context:** The Final Master Document specifies Tailwind CSS as the styling technology. The actual platform uses a hand-crafted, token-based CSS system.

## Current Architecture

The platform styling is split across seven purpose-scoped files (3,900+ lines total):

| File | Purpose | Lines |
|---|---|---|
| `tma-tokens.css` | Design tokens as CSS custom properties | ~50 |
| `tma-base.css` | Reset, body, typography defaults | ~150 |
| `tma-layout.css` | Page shell, header, footer, navigation, responsive grid | ~540 |
| `tma-blocks.css` | All CMS block renderers (hero, CTA, FAQ, pricing, etc.) | ~1,580 |
| `tma-console.css` | Admin console UI (forms, tables, layout editor) | ~1,540 |
| `tma-licensed-fonts.css` | `@font-face` declarations | ~40 |
| `tma-rtl.css` | Right-to-left overrides | ~10 |

### Design Tokens

Global tokens live in `tma-tokens.css` and are extended dynamically by `siteSettingsToRootCss()` from the database. Tokens include:

- `--tma-color-primary`, `--tma-color-secondary`, `--tma-color-accent`, `--tma-color-surface`, `--tma-color-text`
- `--tma-font-heading`, `--tma-font-body`
- `--tma-radius-*`, `--tma-spacing-*`
- `--tma-max-width-*`

These tokens power the CMS settings editor — admins change branding values in the console and the public site updates immediately without code changes.

### Override Cascade

```
Global site settings (DB) → CSS custom properties on :root
  ↓ Page overrides (pageTheme, maxWidthMode, sectionSpacingPreset)
    ↓ Section chrome (sectionSpacingY, widthMode, customClass)
```

This cascade is implemented in `resolveSectionPresentation.ts` and `resolvePagePresentation.ts`.

## Why Not Tailwind

| Factor | Custom Tokens | Tailwind |
|---|---|---|
| **Migration effort** | 0 (already done) | 3,900+ lines to convert, high regression risk |
| **CMS token integration** | Native — CSS vars are the tokens | Requires `tailwind.config` plugin to bridge CSS vars → Tailwind classes |
| **Console vs public isolation** | Separate files, no class collision | Would need Tailwind prefix or layers to isolate console from public |
| **Bundle size** | Only what's written ships | PurgeCSS needed; CMS-injected classes (dynamic `customClass`) may be purged |
| **Dynamic class names** | `customClass` on sections works directly | Tailwind purges unknown dynamic classes unless safelisted |
| **Runtime token updates** | CSS vars update live from DB | `tailwind.config` is build-time; live updates need CSS var bridge anyway |
| **Team familiarity** | Everything is explicit, readable | Requires Tailwind knowledge |

### Key risk with Tailwind

The CMS allows admins to type arbitrary CSS class names into `customClass` fields on sections. Tailwind purges classes it doesn't see in source code at build time. This means admin-entered Tailwind classes would silently not work unless safelisted, which defeats purging.

## Recommendation

**Keep the custom token-based CSS system.** It is production-tested, directly integrated with the CMS settings model, and avoids the class-purging problem inherent in utility-first CSS with dynamic content.

If Tailwind is desired in the future, the recommended path is:

1. Add Tailwind alongside existing CSS (not as a replacement)
2. Use Tailwind only for new admin console components
3. Keep public-facing blocks on the token system
4. Never remove the CSS custom property layer — it's the bridge to the CMS
