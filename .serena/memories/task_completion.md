# Task Completion Checklist

- Ensure dependencies installed (`bun install`) and migrations or seeds applied when needed.
- Run quality gates before handing off: `bun typecheck`, `bun lint` (or `bun lint:fix` if writing changes), and relevant `bun test` suites.
- For UI or integration changes, include targeted Vitest or Playwright coverage as appropriate and update docs if workflows change.
- Verify formatting via Biome (`bun format`) if modifying styles or Markdown.
