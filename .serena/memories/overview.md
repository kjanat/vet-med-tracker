# VetMed Tracker Overview

- Next.js 15 App Router PWA for managing veterinary medications, schedules, and inventory for multi-household pet care.
- TypeScript-first codebase with strict typing and heavy use of tRPC, React Query, and Stack Auth for secure, multi-tenant workflows.
- Structure centers on `app/` for routes, `server/api` for tRPC routers, `db/` + Drizzle for schema/migrations, and shared utilities in `lib/`, `components/`, and `hooks/`.
- Supports offline-friendly PWA features, analytics, and multi-timezone logic; deployment target is Vercel with Edge runtime support.
