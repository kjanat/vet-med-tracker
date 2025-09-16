# Style & Conventions

- Use TypeScript with strict types; avoid `any` except where suppressed (tests allow relaxed rules).
- Formatting, linting, and import organization handled by Biome (`biome.jsonc` enforces 2-space indentation, double quotes, cognitive complexity limits, and className sorting helpers).
- ESLint flat config extends Next.js core-web-vitals; `_` prefix allowed for intentionally unused vars; prefer React 19 conventions and Tailwind v4 utility classes.
- Database files under `db/` and Drizzle artifacts skip Biome formatting/linting; tests permit non-null assertions and loose typing when required.
