# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VetMed Tracker is a Progressive Web App (PWA) for managing veterinary medications for pets/animals. Built with Next.js 15, React 19, TypeScript, and Tailwind CSS v4, it's designed to work offline and provide medication tracking across multiple households and animals.

**Core Mission**: "Three taps to record" - Track medication administrations (not dosing calculations) for animals across households/organizations with inventory management, reminders, and actionable insights.

**Key Principles**:
- We track what was scheduled and what was actually given (not dosing advice)
- Multi-household, multi-animal, multi-caregiver support
- Offline-first with automatic sync
- Time-zone aware (UTC storage, local display per animal's home timezone)

## Development Commands

```bash
# Development
pnpm dev          # Start development server (default)
pnpm dev:turbo    # Start with Turbopack (experimental)

# Production
pnpm build        # Build for production
pnpm start        # Start production server

# Code Quality
pnpm lint         # Run ESLint
```

## Architecture Overview

### Tech Stack
- **Framework**: Next.js 15.4.4 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4 (using new @import syntax)
- **UI Components**: shadcn/ui components with Radix UI primitives
- **State Management**: React Context API (AppProvider) + React Query
- **API Layer**: tRPC (server + client) for type-safe APIs
- **Database**: Prisma + Postgres
- **Authentication**: OpenAuth.js (OAuth 2.0 with custom auth server)
- **Forms**: React Hook Form with Zod validation
- **Package Manager**: pnpm 10.13.1
- **Deployment**: Vercel (edge functions where beneficial)
- **PWA**: Service Worker with offline queue (IndexedDB)

### Key Architecture Patterns

1. **App Router Structure**:
   - `app/(authed)/` - Protected routes requiring authentication
   - `app/(dev)/` - Development-only routes
   - Layout nesting for shared UI (Header, BottomNav, LeftRail)

2. **Component Organization**:
   - `components/ui/` - Reusable UI components (shadcn/ui)
   - `components/layout/` - Layout components
   - `components/[feature]/` - Feature-specific components
   - `components/providers/` - React Context providers

3. **Offline-First PWA**:
   - Service Worker at `/public/sw.js` handles offline caching
   - `useOfflineQueue` hook manages offline data sync
   - `AppProvider` tracks online/offline state globally

4. **Multi-Tenancy**:
   - Household-based data isolation
   - Role-based access control (OWNER, CAREGIVER, VETREADONLY)
   - tRPC middleware for authorization

5. **State Management**:
   - Global state via `AppProvider` (household, animal selection, offline status)
   - Local state with React hooks
   - Offline queue for data persistence

### Important Implementation Details

1. **Tailwind CSS v4**:
   - Configuration is in `app/globals.css` using new @theme syntax
   - CSS variables for theming support dark mode
   - No traditional tailwind.config.js file

2. **TypeScript Path Aliases**:
   - `@/*` maps to project root
   - Used consistently across the codebase

3. **Build Configuration**:
   - ESLint errors ignored during build (see next.config.mjs)
   - TypeScript errors ignored during build
   - Images unoptimized for PWA compatibility

4. **API Security**:
   - tRPC middleware validates household membership
   - Resource access verification for animals, regimens, inventory
   - Audit logging for all data modifications

### Development Tips

1. When adding new routes, consider whether they need authentication (place in `app/(authed)/`)
2. Use existing UI components from `components/ui/` before creating new ones
3. All data operations should handle offline scenarios via `useOfflineQueue`
4. Maintain household context when implementing features
5. Follow the established pattern of feature-specific component folders

### Mobile-First Design

The app uses responsive design with distinct mobile and desktop layouts:
- Mobile: Header + Bottom Navigation
- Desktop: Left Rail + Header
- Components use `useMediaQuery` or CSS for responsive behavior

### Authentication

The app uses OpenAuth.js for authentication:
- **OAuth 2.0 Server**: [https://auth.kajkowalski.nl](https://auth.kajkowalski.nl) (custom OpenAuth server)
- **Protected Routes**: All routes under `app/(authed)/` require authentication
- **Auth Hooks**: `useAuth()` for client-side auth state
- **Token Storage**: httpOnly cookies for security
- **Auto-refresh**: Tokens are refreshed automatically when expired
- **User Creation**: New users are created on first login with a default household

See `docs/AUTH_SETUP.md` for detailed authentication setup instructions.

## Core Domain Concepts

### Terminology
- **Animal**: The patient (dog, cat, rabbit, etc.)
- **Regimen**: A medication plan (e.g., "Amoxicillin 250mg BID for 10 days")
- **Administration**: A recorded "gave medication" event
- **Household**: Organization unit (family, foster, shelter, clinic)
- **Caregiver**: User who can record administrations (can belong to multiple households)

### Role-Based Access Control
- **OWNER**: Full household management
- **CAREGIVER**: Record administrations, manage inventory
- **VETREADONLY**: View-only access for veterinary professionals

### Time Management
- Store all timestamps in UTC
- Display in animal's home timezone
- "Day" = 00:00-23:59 in animal's local timezone
- Each animal has a home timezone (can override per location)

## Key Features Implementation Guide

### 1. Record Administration Flow (/admin/record)
The core "three taps to record" experience:
1. **Select**: Animal + Regimen (pre-selected from context)
2. **Confirm**: Hold 3 seconds with progress ring
3. **Success**: Shows timestamp and caregiver

**Critical Implementation Details**:
- Idempotency key: `{animalId}:{regimenId}:{scheduledSlotLocalDay}:{index}`
- High-risk medications require co-sign within 10 minutes
- Must select inventory source if household has opened items
- Warn if inventory item is expired or wrong medication

### 2. Status Computation Rules
For scheduled doses (server-side calculation):
- **On-time**: ≤ +60 minutes from target
- **Late**: +61 to +180 minutes
- **Very Late**: >180 minutes until cutoff
- **Missed**: Auto-created at cutoff time (default 4 hours after target)
- **PRN**: As-needed doses never marked as missed

### 3. Compliance Calculation
Weekly/Monthly metrics:
- Numerator: All scheduled doses recorded before cutoff
- Denominator: Total scheduled slots in period
- PRN doses excluded from compliance

### 4. Inventory Management
- Track medications with expiry dates and assignment
- "In use" status for active inventory items
- Low stock warnings based on usage patterns
- Barcode scanning support (EAN/UPC/DataMatrix)

### 5. Smart Reminders
Notification schedule for each dose:
- Target - 15 minutes
- Target time
- Target + 15 minutes
- Target + 45 minutes (escalation to role group)
- Target + 90 minutes (final attempt)

Snooze: 10 minutes, max 3 times per dose

### 6. Offline Capabilities
- Service Worker caches app shell
- IndexedDB queues mutations when offline
- Idempotency prevents duplicate records on sync
- Optimistic UI updates

## Database Schema (Key Models)

```prisma
// Core entities
User, Household, Membership (many-to-many with roles)
Animal (belongs to household, has timezone)
MedicationCatalog (generic/brand names, routes, forms)
Regimen (links animal to medication with schedule)
Administration (actual recorded events with status)
InventoryItem (household medications with assignment)

// Key enums
Role: OWNER | CAREGIVER | VETREADONLY
ScheduleType: FIXED | PRN
AdminStatus: ON_TIME | LATE | VERY_LATE | MISSED | PRN
```

## tRPC Router Structure

```typescript
// Main routers
adminRouter    // Record administrations
inventoryRouter // Manage medication inventory
regimensRouter  // Create/edit medication schedules
animalRouter    // Animal profiles
householdRouter // Household management
insightsRouter  // Analytics and patterns
```

## Critical Security Patterns

1. **Authorization Middleware**:
   - Extract householdId from URL or input
   - Verify membership and role
   - Resource-level access checks

2. **Audit Logging**:
   - All mutations logged with who/when/what
   - Stored in audit_log table

3. **Data Isolation**:
   - Household-scoped queries
   - No cross-household data leakage

## Testing Checklist

Critical paths that must work:
- [ ] Offline recording syncs without duplicates
- [ ] Auto-missed entries appear at cutoff across DST
- [ ] Co-sign flow blocks completion until confirmed
- [ ] Inventory "in use" updates Record defaults
- [ ] Multi-household context switching
- [ ] Reminder escalation to correct role group
- [ ] Timezone handling for reports and displays

## UI/UX Patterns

### Navigation
- **Global nav**: Home, History, Inventory, Insights, Settings
- **Context switchers**: Household and Animal in header
- **Quick actions**: Record button always accessible

### Key Copy Strings
- Due: "{animal} – {med} due in {mm:ss}"
- Late: "{animal} – {med} late by {mm:ss}"
- Success: "Recorded at {HH:mm} by {caregiver}"
- Low stock: "{med} running low—about {n} days left"

### Safety Features
- 3-second hold to confirm administrations
- Visual warnings for expired medications
- Co-sign requirements for high-risk meds
- Duplicate prevention via idempotency

## Development Workflow

1. **Feature Development**:
   - Start with Prisma schema changes
   - Create tRPC router with Zod validation
   - Build UI components using existing patterns
   - Add offline support via useOfflineQueue
   - Test timezone and multi-household scenarios

2. **State Management**:
   - Global state in AppProvider
   - Server state via React Query + tRPC
   - Offline queue for resilience

3. **PWA Requirements**:
   - Update service worker cache list
   - Test offline scenarios
   - Verify background sync

## Next Steps for Implementation

Based on current state (UI components exist, tRPC setup started):

1. **Database Setup**:
   - Create Prisma schema file
   - Set up migrations
   - Seed with demo data

2. **tRPC Implementation**:
   - Complete server/trpc.ts setup
   - Implement core routers
   - Add authentication middleware

3. **Connect UI to Backend**:
   - Wire up existing components to tRPC
   - Add React Query providers
   - Implement offline queue

4. **Core Features**:
   - Record administration flow
   - Inventory management
   - Reminder system
   - Insights generation

5. **PWA Enhancement**:
   - Background sync
   - Push notifications
   - Camera/barcode integration
