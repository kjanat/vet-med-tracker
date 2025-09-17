# VetMed Tracker - Project Overview

## Core Purpose

Progressive Web App for managing veterinary medications for pets and animals. Track medications, schedules, and inventory across multiple households with offline support.

## Architecture Summary

### Tech Stack

- **Framework**: Next.js 15.6.0-canary with App Router
- **Language**: TypeScript 5.9 with strict mode  
- **Styling**: Tailwind CSS v4
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Stack Auth with OAuth support
- **API Layer**: tRPC for type-safe APIs
- **State Management**: React Context + React Query
- **Forms**: React Hook Form with Zod validation
- **Testing**: Bun Test + Happy DOM + React Testing Library
- **E2E Testing**: Playwright (configured but no tests)
- **Code Quality**: Biome for linting/formatting
- **Package Manager**: Bun
- **Deployment**: Vercel with Edge Runtime

### Project Structure

#### Core Directories

- **`app/`** - Next.js App Router pages and API routes
  - `(authed)/` - Protected routes requiring authentication
  - `(public)/` - Public pages and landing
  - `(legal)/` - Privacy, terms, cookies pages
  - `(support)/` - Help and FAQ pages
  - `api/` - API routes and tRPC endpoints

- **`components/`** - React components organized by feature
  - `auth/` - Authentication components (login, user menus)
  - `ui/` - Reusable UI components (shadcn/ui based)
  - `layout/` - Layout and navigation components
  - `dashboard/` - Dashboard widgets and layouts
  - `[feature]/` - Feature-specific components (inventory, medications, etc.)

- **`lib/`** - Utilities, schemas, and business logic
  - `schemas/` - Zod validation schemas
  - `calculators/` - Dosage and unit conversion logic
  - `services/` - Data transformers and form validators
  - `utils/` - Utility functions and helpers
  - `monitoring/`, `security/`, `logging/` - Infrastructure code

- **`hooks/`** - Custom React hooks
  - `forms/` - Form management hooks (useAnimalForm, useInventoryForm)
  - `shared/` - Shared utility hooks

- **`server/`** - Server-side code and tRPC routers
- **`db/`** - Database schema and configuration
- **`tests/`** - Test files (unit tests, no E2E tests yet)

#### Key Features

- **Multi-Household Support**: Role-based access across households
- **Animal Management**: Track multiple pets with medical info
- **Medication Tracking**: Comprehensive catalog with dosage calculations
- **Schedule Management**: Medication regimens with reminders
- **Inventory Management**: Stock tracking with expiry dates
- **Analytics & Insights**: Compliance rates and medication patterns
- **Multi-Timezone Support**: Handle pets in different timezones

#### Recent Simplification

Project underwent major simplification campaign:

- Removed over-engineered offline infrastructure (4,000+ lines)
- Eliminated caching layer (12,000+ lines)
- Simplified medication catalog to hybrid approach
- Maintained tRPC for type safety despite complexity
- Achieved 40-60% complexity reduction as planned
- All core functionality preserved

#### Current State

- **Development Phase**: No production users yet
- **Build Status**: Successfully compiles with Next.js 15
- **Test Coverage**: 36.52% (below 70% target)
- **Test Status**: 296 pass, 70 fail (auth context issues)
- **Linting**: Clean (no errors after recent fixes)
- **TypeScript**: No compilation errors

#### Development Workflow

- **Development**: `bun dev` (with Turbopack support)
- **Building**: `bun build`
- **Testing**: `bun test` (unit), `playwright test` (E2E)
- **Database**: Drizzle Studio, migrations, seeding
- **Code Quality**: Biome checks, TypeScript validation
- **Git**: Feature branches, conventional commits
