# Phase 2B Visual Asset Pack

This prompt pack maps the current CMS-driven public pages to premium replacement visuals without changing the TMA content model or media flow. Each asset is meant to be uploaded through the existing media manager and swapped on the relevant page block or library entity.

## Baseline direction
- Look: dark, editorial, premium, high-contrast, modern creative-tech
- Tone: calm, precise, future-facing, no glossy startup-stock cliches
- Exclusions: no visible logos, no UI lorem ipsum, no random neon rainbow palette, no low-end generic AI faces
- Negative prompt: cheesy stock photo, oversaturated cyberpunk, extra fingers, distorted typography, watermarks, fake dashboards, noisy collage clutter

## Homepage hero
- CMS destination: `home` page hero `backgroundMediaUrl`
- Purpose: premium first impression
- Ratio: `16:10`
- Alt text: `Abstrakte Creative-Tech Visualisierung in dunkler Premium-Asthetik`
- Prompt:
  `Abstract premium creative-tech hero image, dark editorial composition, deep black and graphite surface, restrained lime highlights, subtle luminous geometry, layered atmosphere, cinematic contrast, refined and calm, no people, no text, no logos`

## Homepage supporting visual / Contact intro
- CMS destination: `home` intro `textMedia.imageUrl`, `contact` intro `textMedia.imageUrl`
- Purpose: premium supporting section visual
- Ratio: `4:3`
- Alt text: `Ruhige Creative-Tech Visualisierung fur Positionierung und Kontakt`
- Prompt:
  `Premium creative-tech studio visual, dark editorial interface fragments, quiet lime accents, layered glass reflections, modern structured composition, high contrast, calm and trustworthy, no text, no logos`

## Services / What We Do focal visual
- CMS destination: `services` intro and services-related `textMedia` visuals
- Purpose: focal section visual for capability positioning
- Ratio: `4:3`
- Alt text: `Creative-Tech Visualisierung fur Leistungen und Positionierung`
- Prompt:
  `Dark premium service positioning artwork, abstract digital systems, editorial layout energy, precise grid structures, soft glow accents, creative-tech atmosphere, sophisticated and minimal, no text, no people`

## Work / Projects card image set
- CMS destination: `cms_case_study.featuredImage`, `cms_product.featuredImage`
- Purpose: consistent project thumbnail system
- Ratio: `16:9`
- Alt text: `Editoriale Projektvisualisierung fur das TMA Portfolio`
- Prompt:
  `Editorial creative-tech project showcase image, dark premium interface fragments, subtle motion cues, layered product surfaces, high contrast, refined composition, modern and believable, no cheesy stock look, no text`

## News / Resource card image set
- CMS destination: `resource` pages hero/background or card artwork
- Purpose: editorial article thumbnails
- Ratio: `16:9`
- Alt text: `Editoriale Visualisierung fur einen Studio-Beitrag`
- Prompt:
  `Premium editorial creative-tech article artwork, dark high-contrast composition, thoughtful studio perspective, restrained abstract geometry, subtle glow, modern and calm, no text, no logos`

## About page story visual
- CMS destination: `about` story or mission `textMedia.imageUrl`
- Purpose: studio story / mission atmosphere
- Ratio: `3:2`
- Alt text: `Atmospharische Visualisierung fur die Studio-Geschichte`
- Prompt:
  `Dark premium creative-tech studio atmosphere, abstract but human, refined light falloff, calm editorial depth, subtle structural geometry, modern and cultural, no text`

## Team portrait set
- CMS destination: `cms_team_member.photoMediaId`
- Purpose: consistent premium team placeholders
- Ratio: `4:5`
- Alt text: `Portrat eines Teammitglieds von The Modesty Argument`
- Prompt:
  `Premium studio portrait, dark refined background, soft editorial lighting, calm confident expression, modern creative-tech professional, consistent lighting setup, realistic and understated, no text, no logos`

## Contact hero / reassurance visual
- CMS destination: `contact` hero or supporting `textMedia` media
- Purpose: calm collaboration-first visual
- Ratio: `16:10`
- Alt text: `Ruhige Creative-Tech Visualisierung fur die Kontaktseite`
- Prompt:
  `Abstract premium contact-page artwork, dark editorial composition, calm luminous geometry, subtle structured glow, high contrast, trustworthy and modern, no text, no logos`

## Current placeholder policy
- Keep all current demo assets CMS-editable.
- Replace weak demo visuals first on:
  - home
  - services
  - work
  - projects
  - news
  - about
  - contact
- Until true bitmap assets are generated and uploaded, the upgraded SVG placeholders in `public/demo/placeholders/` are the shipping-safe fallback baseline.
