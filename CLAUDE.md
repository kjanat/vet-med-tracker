# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VetMed Tracker is a Progressive Web App (PWA) for managing veterinary medications for pets and animals. Built with Next.js 15, React 19, TypeScript, and Tailwind CSS v4, it's designed to work offline and provide medication tracking across multiple households and animals.

## Tech Stack

- **Framework**: Next.js 15.4.5 with App Router, React 19
- **Language**: TypeScript with strict mode and noUncheckedIndexedAccess
- **Styling**: Tailwind CSS v4 (using new @import syntax in globals.css)
- **UI Components**: shadcn/ui components with Radix UI primitives
- **Database**: PostgreSQL with Drizzle ORM (Neon hosting)
- **Authentication**: Stack Auth (managed authentication service)
- **API Layer**: tRPC for type-safe APIs
- **State Management**: React Context (AppProvider) + React Query
- **Forms**: React Hook Form with Zod validation
- **Code Quality**: Biome for linting/formatting
- **Testing**: Vitest (unit/integration) + Playwright (E2E)
- **Package Manager**: pnpm (v10.14.0)

## Development Commands

```bash
# Development
pnpm dev          # Start development server
pnpm dev:turbo    # Start with Turbopack (experimental)

# Building & Production
pnpm build        # Build for production
pnpm start        # Start production server
pnpm preview      # Build and start production locally

# Code Quality
pnpm check        # Run Biome checks
pnpm check:write  # Run Biome with auto-fix (or: biome check --write)
pnpm lint         # Run Biome lint + Next.js lint
pnpm format       # Format code with Biome
pnpm typecheck    # Type check with TypeScript

# Database Management
pnpm db:generate  # Generate Drizzle migrations
pnpm db:migrate   # Run migrations
pnpm db:push      # Push schema to database
pnpm db:studio    # Open Drizzle Studio GUI
pnpm db:seed      # Seed database with test data

# Testing
pnpm test         # Run unit tests
pnpm test:watch   # Run tests in watch mode
pnpm test:coverage # Run tests with coverage
pnpm test:e2e     # Run Playwright E2E tests
pnpm test:e2e:ui  # Run Playwright with UI mode
```

## Architecture Overview

### Directory Structure

```
app/
├── (authed)/        # Protected routes requiring authentication
│   ├── (app)/       # Main app routes with shared layout
│   └── (standalone)/# Standalone authenticated pages
├── (public)/        # Public pages (landing, privacy, terms)
├── (dev)/           # Development-only routes
├── api/             # API routes and tRPC endpoints
└── layout.tsx       # Root layout with providers

components/
├── ui/              # Reusable UI components (shadcn/ui)
├── layout/          # Layout components (Header, BottomNav, Sidebar)
├── providers/       # React Context providers
└── [feature]/       # Feature-specific components

server/
├── api/
│   ├── routers/     # tRPC routers (animals, households, admin, etc.)
│   └── trpc.ts      # tRPC initialization and middleware
└── trpc/            # tRPC client configuration

db/
├── schema.ts        # Drizzle schema definitions
├── drizzle.ts       # Database connection
└── relations.ts     # Drizzle relations

hooks/               # Custom React hooks (organized by feature)
├── admin/           # Administration-related hooks
├── history/         # History tracking hooks
├── insights/        # Analytics and insights hooks
├── inventory/       # Inventory management hooks
├── offline/         # Offline functionality hooks
├── settings/        # Settings-related hooks
└── shared/          # Shared/common hooks

lib/                 # Utilities and shared logic
├── infrastructure/  # System-level code (circuit breakers, middleware, health checks)
├── logging/         # Logging infrastructure
├── navigation/      # Navigation configuration
├── offline/         # Offline database functionality
├── redis/           # Redis client and caching
├── schemas/         # Zod validation schemas (organized by feature)
├── trpc/            # tRPC client setup
└── utils/           # Generic utility functions
```

### Key Architecture Patterns

1. **App Router Structure**:
   - Protected routes under `app/(authed)/` require Stack Auth authentication
   - Nested layouts for shared UI components
   - Parallel routes for modals and overlays

2. **Authentication Flow**:
   - Stack Auth handles all auth (OAuth, email/password, social)
   - Middleware protects routes via Stack Auth
   - Users synced to database on first login via webhook
   - Multi-household support with role-based access (OWNER, CAREGIVER, VETREADONLY)

3. **Database Architecture**:
   - All tables prefixed with `vetmed_` 
   - Drizzle ORM with PostgreSQL (Neon)
   - Three database branches: production, development, test
   - Schema-first approach with type generation

4. **tRPC API Layer**:
   - Type-safe API with automatic TypeScript inference
   - Procedures with Zod validation
   - Middleware for authentication and authorization
   - Household-scoped data access

5. **Offline-First PWA**:
   - Service Worker at `/public/sw.js`
   - IndexedDB for offline queue (`useOfflineQueue` hook)
   - Optimistic UI updates with eventual consistency
   - Idempotency keys prevent duplicate submissions

6. **State Management**:
   - Global state via `AppProvider` (household, animal selection)
   - Server state with React Query + tRPC
   - Form state with React Hook Form
   - Offline queue for resilience

### Code Organization Patterns

1. **Feature-Based Hook Organization**:
   - Hooks are organized by feature domain (inventory, history, admin, etc.)
   - Shared hooks in `hooks/shared/` for cross-cutting concerns
   - Tests co-located with their hooks

2. **Clear Library Structure**:
   - `lib/infrastructure/` - System-level code (middleware, circuit breakers, health checks)
   - `lib/utils/` - Pure utility functions (no side effects)
   - `lib/schemas/` - Zod schemas organized by feature
   - Infrastructure concerns separated from business logic

### Critical Implementation Details

1. **TypeScript Path Aliases**:
   - `@/*` maps to project root
   - `@/db/*` for database files
   - `@/trpc/*` for tRPC server files

2. **Tailwind CSS v4**:
   - Configuration in `app/globals.css` using @theme syntax
   - No traditional tailwind.config.js file
   - CSS variables for theming and dark mode

3. **Multi-Tenancy**:
   - Household-based data isolation
   - Role-based access control per household
   - Resource-level authorization checks

4. **Time Management**:
   - All timestamps stored in UTC
   - Display in animal's home timezone
   - Each animal has configurable timezone

## Core Domain Model

### Key Entities

- **User**: Authenticated user via Stack Auth
- **Household**: Organization unit (family, clinic, shelter)
- **Membership**: User's role in household (OWNER, CAREGIVER, VETREADONLY)
- **Animal**: Pet/patient with medical information
- **MedicationCatalog**: Generic medication database
- **Regimen**: Medication schedule for an animal
- **Administration**: Recorded medication event
- **InventoryItem**: Household's medication stock

### tRPC Router Structure

```typescript
appRouter
├── animal        // Animal CRUD operations
├── household     // Household management
├── regimen       // Medication schedules
├── admin         // Record administrations
├── inventory     // Medication inventory
├── medication    // Medication catalog
├── insights      // Analytics and patterns
├── reports       // Reporting features
└── user          // User preferences
```

## Testing Strategy

- **Unit Tests**: Vitest for components and utilities
- **Integration Tests**: Vitest for API routes and database operations
- **E2E Tests**: Playwright for critical user flows
- **Test Database**: Separate test branch in Neon
- **Coverage Goals**: 80% unit, 70% integration

## Security Patterns

1. **Authorization Middleware**: Every tRPC procedure validates household membership
2. **Resource Checks**: Verify ownership before operations
3. **Audit Logging**: Track all data modifications
4. **Data Isolation**: Queries scoped to user's households
5. **Input Validation**: Zod schemas on all inputs

## Performance Considerations

- Images unoptimized for PWA compatibility
- TypeScript build errors currently ignored (migration in progress)
- Database uses connection pooling via Neon
- React Compiler enabled in CI for optimizations
- Lazy loading for code splitting

## Development Workflow

1. **Feature Development**:
   - Create/modify Drizzle schema
   - Generate types with `pnpm db:generate`
   - Implement tRPC router with Zod validation
   - Build UI components using existing patterns
   - Add offline support if needed
   - Write tests for critical paths

2. **Database Changes**:
   - Modify `db/schema.ts`
   - Run `pnpm db:generate` to create migration
   - Test with `pnpm db:push` (development branch)
   - Apply to production via migration

3. **API Development**:
   - Add router in `server/api/routers/`
   - Use appropriate procedure (public, protected, household, owner)
   - Add to `_app.ts` router
   - Types auto-generated for client

## Common Patterns

### Creating a Protected Page
```typescript
// app/(authed)/(app)/feature/page.tsx
import { stackServerApp } from "@/stack";

export default async function FeaturePage() {
  const user = await stackServerApp.getUser({ or: "redirect" });
  // Page content
}
```

### Adding a tRPC Procedure
```typescript
// server/api/routers/feature.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const featureRouter = createTRPCRouter({
  getData: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Implementation
    }),
});
```

### Using tRPC in Components
```typescript
import { trpc } from "@/server/trpc/client";

function Component() {
  const { data, isLoading } = trpc.feature.getData.useQuery({ id: "123" });
  // Component logic
}
```

### Using Feature-Organized Hooks
```typescript
// Import feature-specific hooks
import { useHistoryFilters } from "@/hooks/history/useHistoryFilters";
import { useDaysOfSupply } from "@/hooks/inventory/useDaysOfSupply";
import { useOfflineQueue } from "@/hooks/offline/useOfflineQueue";

// Import shared hooks
import { useMediaQuery } from "@/hooks/shared/useMediaQuery";
import { useToast } from "@/hooks/shared/use-toast";
```

### Using Organized Utilities
```typescript
// Import infrastructure code
import { withCircuitBreaker } from "@/lib/infrastructure/circuit-breaker";
import { withConnectionQueue } from "@/lib/infrastructure/connection-queue";

// Import generic utilities
import { cn } from "@/lib/utils/general";
import { formatDate } from "@/lib/utils/general";

// Import schemas
import { animalSchema } from "@/lib/schemas/animal";
import { inventorySchema } from "@/lib/schemas/inventory";
```

## AI Assistant Workflow Guidelines

### Delegation-First Approach for Major Refactors

When handling large-scale refactoring or complex multi-phase projects, adopt a **Project Manager (PM) role** and delegate all implementation work to specialized sub-agents. This approach has proven highly effective for maintaining clarity, preventing context overload, and ensuring systematic progress.

#### When to Use Delegation Workflow

Use this approach for:
- **Major refactors** affecting >30% of the codebase
- **Multi-phase projects** with distinct deliverables
- **Complex architectural changes** requiring coordination
- **Performance optimizations** needing systematic analysis
- **Technical debt reduction** campaigns

#### Project Manager Responsibilities

As the PM, you should:
1. **Create comprehensive task breakdowns** for all phases
2. **Orchestrate parallel sub-agents** for independent tasks
3. **Monitor progress** and coordinate dependencies
4. **Validate results** from each sub-agent
5. **Maintain documentation** of changes and outcomes
6. **Ensure quality gates** are met at each phase

**Critical**: As PM, you should NOT write any code directly. All implementation must be delegated.

#### Effective Delegation Pattern

```markdown
## Phase [N]: [Phase Name]

### Task [N.M]: [Task Description]
**Objective**: [Clear goal]
**Dependencies**: [Prerequisites if any]
**Success Criteria**: [Measurable outcomes]

[Spawn sub-agent with specific expertise and clear instructions]
```

#### Example: Architecture Simplification Refactor

This project successfully used the delegation workflow to achieve 62% complexity reduction:

1. **Phase 1: Quick Wins** (22% reduction)
   - Task 1.1: Remove duplicate components → Frontend specialist
   - Task 1.2: Clean up unused endpoints → Backend specialist
   - Task 1.3: Consolidate mobile detection → UI specialist
   - Task 1.4: Remove test utilities → Testing specialist

2. **Phase 2: Provider Consolidation** (42% total reduction)
   - Task 2.1: Design consolidated provider → Architecture specialist
   - Task 2.2: Implement new provider → Frontend specialist
   - Task 2.3: Migrate components → Migration specialist
   - Task 2.4: Update tests → Testing specialist

3. **Phase 3: Structure Refactor** (62% final reduction)
   - Task 3.1: Component reorganization → Frontend specialist
   - Task 3.2: Route flattening → Architecture specialist
   - Task 3.3: tRPC cleanup → Backend specialist
   - Task 3.4: Naming standardization → Code quality specialist

4. **Validation Phase**
   - Validation 1: TypeScript checking → TypeScript specialist
   - Validation 2: Linting → Code quality specialist
   - Validation 3: Build verification → Build specialist
   - Validation 4: Test fixing → Testing specialist
   - Validation 5: Metrics collection → Analytics specialist

#### Quality Gates

Each phase must pass these gates before proceeding:
1. ✅ **No TypeScript errors** (`pnpm typecheck`)
2. ✅ **Clean linting** (`pnpm lint`)
3. ✅ **Successful build** (`pnpm build`)
4. ✅ **Tests passing** (or properly updated)
5. ✅ **Metrics documented** (complexity reduction %)

#### Sub-Agent Instructions Template

When spawning sub-agents, provide:
```
You are a [specialization] specialist. Your task is to:

1. [Specific objective]
2. [Detailed requirements]
3. [Constraints/guidelines]

Context:
- [Relevant background]
- [Dependencies]
- [Expected outcomes]

Execute this task and report results with:
- Summary of changes
- Files modified
- Metrics/measurements
- Any issues encountered
```

#### Success Metrics

Track these metrics throughout the refactor:
- **Complexity reduction**: Target vs achieved
- **File count changes**: Additions vs deletions
- **Import path updates**: Number of files affected
- **Provider count**: Before vs after
- **Build time**: Before vs after
- **Bundle size**: Before vs after
- **Type safety**: Errors eliminated

### Benefits of This Approach

1. **Clear separation of concerns**: PM focuses on orchestration, sub-agents on implementation
2. **Parallel execution**: Multiple tasks can progress simultaneously
3. **Specialized expertise**: Each sub-agent can focus on their domain
4. **Better context management**: Prevents overwhelming single context
5. **Systematic progress**: Clear phases with measurable outcomes
6. **Quality assurance**: Built-in validation at each step

### Common Pitfalls to Avoid

- ❌ **Don't code as PM**: Maintain role separation
- ❌ **Don't skip validation**: Always verify before proceeding
- ❌ **Don't batch too much**: Keep tasks focused and atomic
- ❌ **Don't ignore dependencies**: Coordinate sequential tasks properly
- ❌ **Don't forget documentation**: Update CLAUDE.md with learnings