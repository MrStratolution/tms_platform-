# Strategy document vs this repository (stack)

Some TMA strategy papers mention **Tailwind CSS** for layout and tokens.

**This codebase intentionally uses:**

- **CSS custom properties** and global styles — [`src/styles/tma-tokens.css`](../src/styles/tma-tokens.css) (public marketing) and [`src/styles/tma-console.css`](../src/styles/tma-console.css) (`/console`).
- **Framer Motion** for motion — see public block components.
- **No Tailwind dependency** in [`package.json`](../package.json).

When sharing the strategy with engineers, treat “Tailwind” as “**design system + utility-friendly CSS**” unless you decide to migrate the UI to Tailwind in a dedicated effort.

Functional alignment (Next.js, Node/TS APIs, PostgreSQL `tma_custom`, custom `/console`, Zoho/Calendly optional) matches the updated custom-backend direction regardless of this styling choice.
