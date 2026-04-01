---
name: translation-workflow
description: Use this when implementing or reviewing bilingual content (German and English) across the TMA Platform.
---

Rules:

- German is the default language.
- English is the secondary language.
- All relevant content must support DE and EN.

Checklist:

1. Field-level translations:
   - title
   - content
   - CTA
   - SEO

2. Missing translations:
   - flagged clearly in admin
   - not silently ignored

3. Fallback logic:
   - German fallback if English is missing

4. SEO:
   - localized meta title
   - localized description

5. UI:
   - language switch works
   - no layout breaks

6. CMS:
   - editor can easily edit both languages
   - no confusion between DE and EN fields

7. AI translation:
   - suggestions allowed
   - must be reviewable

Never:
- hardcode only one language
- mix languages unintentionally