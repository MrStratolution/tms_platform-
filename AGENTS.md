# TMA Platform Repo Guidance

## Product Overview
TMA is a Shopify-style, section-driven, backend-controlled revenue platform.

It is built to manage:
- website pages
- landing pages
- product pages
- lead capture
- booking flows
- optional CRM sync
- bilingual content
- admin operations
- AI-assisted workflows

## Approved Stack
- Frontend: Next.js
- Backend: Node.js + TypeScript
- Database: PostgreSQL
- Admin Panel: Custom CMS
- Styling: Tailwind CSS
- Motion: Framer Motion

## Optional Integrations
- Zoho CRM as optional downstream CRM
- Calendly as optional external booking fallback
- Email provider such as Resend
- Tracking integrations such as GA4, Meta Pixel, and LinkedIn Insight Tag

## Core Architecture Rules
- Frontend is a renderer, not the owner of business logic
- Backend controls business logic
- PostgreSQL is the single source of truth
- CRM is never the source of truth
- Booking must remain provider-agnostic
- Content and layout must remain CMS-driven
- Avoid hardcoded page logic
- Avoid fixed layouts when the CMS should control structure
- Use reusable typed modules instead of one-off implementations
- Keep responsibilities separated across frontend, backend, integrations, and data layers

## CMS and Admin UX Rules
- Admin must stay easy to use like WordPress, Shopify, and Webflow
- Prefer section-based editing over uncontrolled freeform editing
- Prefer toggles, presets, helper text, and guided controls over raw configuration
- Common actions must be fast and obvious
- Always consider editor usability before adding complexity
- Preserve responsive behavior through system rules where possible

## Localization Rules
- Default language is German
- Secondary language is English
- Design all translatable content for DE and EN from the beginning
- Do not hardcode single-language assumptions
- Support field-level translations where relevant
- Translation completeness must be considered in feature design

## Booking and CRM Rules
- Native/custom booking is the default platform direction
- Calendly is optional and must remain replaceable
- Zoho is optional and downstream only
- Website -> PostgreSQL -> Zoho is the required CRM data flow
- Booking logic must not be tightly coupled to a single provider

## Lead and Form Rules
- All leads must be stored in PostgreSQL first
- Forms must include validation, spam protection, and rate limiting where relevant
- Lead flows must support source attribution, ownership, notes, and status tracking
- Features touching leads, forms, auth, booking, or integrations must be reviewed carefully for edge cases

## AI Rules
- AI should improve admin efficiency and workflow quality
- Prefer practical AI features such as lead summaries, scoring, next-action suggestions, translation help, SEO suggestions, and admin summaries
- All AI outputs must be reviewable and overridable by humans
- Do not add gimmick AI features without clear operational value

## Security and Compliance Rules
- Protect personal data carefully
- Use role-based access control
- Validate input
- Protect uploads and integrations
- Use audit logs where relevant
- Do not take shortcuts in auth, lead handling, booking, or external integrations
- Consider German and EU compliance requirements in architecture decisions

## Quality Rules
- Maintain strong typing
- Keep validation and API contracts aligned
- Add or update tests where relevant
- Think through responsive behavior, translation impact, and admin UX impact
- Flag assumptions and open questions explicitly
- Prefer safe, maintainable implementation over quick hacks

## Delivery Workflow
For each feature:
1. summarize the task
2. identify impacted modules
3. confirm architecture alignment
4. identify DB, API, UI, translation, and integration impact
5. implement in clean small steps
6. validate behavior
7. summarize changes and follow-up items

## Preferred Review Flow
For major features:
1. Platform Architect plans the change
2. Fullstack Implementer builds it
3. QA Review Agent reviews it
4. CMS Admin UX Agent reviews admin/editor usability
5. Add security, integration, or AI review when relevant

## Definition of Good Implementation
A good implementation:
- matches the approved architecture
- is CMS-driven where expected
- is bilingual-ready
- is responsive
- is maintainable
- avoids provider lock-in
- does not break admin usability
- keeps PostgreSQL as the source of truth
