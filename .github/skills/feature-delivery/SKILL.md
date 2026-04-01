---
name: feature-delivery
description: Use this when implementing a new feature or major change in the TMA Platform. Ensures structured planning, architecture alignment, clean implementation, and validation.
---

Workflow:

1. Restate the requirement clearly.
2. Identify affected modules:
   - frontend (Next.js)
   - backend (Node.js + TypeScript)
   - database (PostgreSQL)
   - CMS/admin
   - integrations
   - translations
3. Check architecture constraints from AGENTS.md.
4. Define:
   - DB changes
   - API changes
   - UI changes
   - admin UX impact
5. Implement in small, safe steps.
6. Validate:
   - functionality
   - responsive behavior
   - translation behavior
   - CMS behavior
7. Summarize:
   - what changed
   - what needs follow-up

Always check:
- CMS-driven logic
- German-first bilingual support
- admin usability
- booking and lead impact if relevant