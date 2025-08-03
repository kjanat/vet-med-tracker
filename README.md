# VetMed Tracker

A Progressive Web App (PWA) for managing veterinary medications for pets and animals. Built with Next.js 15, React 19, TypeScript, and Tailwind CSS v4, designed to work offline and provide medication tracking across multiple households and animals.

## Overview

**Mission**: "Three taps to record" - Track medication administrations (not dosing calculations) for animals across households/organizations with inventory management, reminders, and actionable insights.

**Key Features**:
- 🏠 Multi-household, multi-animal, multi-caregiver support
- 📱 Offline-first PWA with automatic sync
- 🌍 Time-zone aware (UTC storage, local display per animal's home timezone)
- 💊 Comprehensive medication tracking and inventory management
- 🔔 Smart reminders with escalation
- 📊 Compliance reporting and actionable insights
- 🔐 Role-based access control (OWNER, CAREGIVER, VETREADONLY)

## Quick Start

### Prerequisites
- Node.js 18+ and pnpm 10.13.1+
- PostgreSQL database (Neon recommended)
- Clerk account (for authentication)

### Installation

```bash
# Clone and install dependencies
git clone <repository-url>
cd vet-med-tracker
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your database and auth configurations

# Set up database
pnpm db:push
pnpm db:seed

# Start development server
pnpm dev
```

Visit `http://localhost:3000` to see the application.

### Development Commands

```bash
# Development
pnpm dev          # Start development server (default)
pnpm dev:turbo    # Start with Turbopack (experimental)

# Production
pnpm build        # Build for production
pnpm start        # Start production server

# Database
pnpm db:push      # Push schema changes to database
pnpm db:studio    # Open Drizzle Studio for database management
pnpm db:seed      # Seed database with sample data

# Code Quality
pnpm lint         # Run ESLint
pnpm type-check   # Run TypeScript checks
pnpm test         # Run test suite
pnpm test:e2e     # Run end-to-end tests
```

## Architecture

### Tech Stack
- **Framework**: Next.js 15.4.4 with App Router
- **Language**: TypeScript with strict mode
- **Styling**: Tailwind CSS v4 (using new @import syntax)
- **UI Components**: shadcn/ui components with Radix UI primitives
- **State Management**: React Context API (AppProvider) + React Query
- **API Layer**: tRPC (server + client) for type-safe APIs
- **Database**: Drizzle ORM + PostgreSQL (Neon)
- **Authentication**: Clerk (managed authentication service)
- **Forms**: React Hook Form with Zod validation
- **PWA**: Service Worker with offline queue (IndexedDB)
- **Package Manager**: pnpm 10.13.1

### Key Architecture Patterns

1. **App Router Structure**:
   - `app/(authed)/` - Protected routes requiring authentication
   - `app/(dev)/` - Development-only routes
   - Layout nesting for shared UI (Header, BottomNav, LeftRail)

2. **Component Organization**:
   - `components/ui/` - Reusable UI components (shadcn/ui)
   - `components/layout/` - Layout components
   - `components/[feature]/` - Feature-specific components

3. **Offline-First PWA**:
   - Service Worker handles offline caching
   - `useOfflineQueue` hook manages offline data sync
   - `AppProvider` tracks online/offline state globally

4. **Multi-Tenancy**:
   - Household-based data isolation
   - Role-based access control
   - tRPC middleware for authorization

## Core Features

### 🎯 Record Administration Flow
The core "three taps to record" experience:
1. **Select**: Animal + Regimen (pre-selected from context)
2. **Confirm**: Hold 3 seconds with progress ring
3. **Success**: Shows timestamp and caregiver

### 📊 Status & Compliance
- **On-time**: ≤ +60 minutes from target
- **Late**: +61 to +180 minutes
- **Very Late**: >180 minutes until cutoff
- **Missed**: Auto-created at cutoff time (default 4 hours after target)
- **PRN**: As-needed doses never marked as missed

### 📦 Inventory Management
- Track medications with expiry dates and assignment
- "In use" status for active inventory items
- Low stock warnings based on usage patterns
- Barcode scanning support (EAN/UPC/DataMatrix)

### 🔔 Smart Reminders
Notification schedule for each dose:
- Target - 15 minutes
- Target time
- Target + 15 minutes
- Target + 45 minutes (escalation to role group)
- Target + 90 minutes (final attempt)

### 📈 Insights & Analytics
- Weekly/Monthly compliance metrics
- Usage patterns and trends
- Low stock alerts
- Actionable suggestions for medication management

## Production Monitoring 🚀

VetMed Tracker includes a comprehensive production monitoring system designed for reliability and observability:

### Monitoring Features
- **Real-time Health Monitoring** - `/api/health` endpoint with detailed system status
- **Circuit Breaker Protection** - Automatic failure protection with graceful degradation
- **Rate Limiting** - API abuse prevention with adaptive thresholds
- **Connection Queue Management** - Intelligent database connection handling
- **Performance Metrics** - Response times, error rates, and resource usage
- **Load Testing Suite** - Comprehensive testing infrastructure for validation

### Quick Health Check
```bash
# Basic health status
curl http://localhost:3000/api/health

# Detailed system metrics
curl "http://localhost:3000/api/health?detailed=true"
```

### Monitoring Documentation
- 📚 **[Production Monitoring Guide](./docs/PRODUCTION_MONITORING.md)** - Comprehensive monitoring setup and best practices
- 🧪 **[Load Testing Results](./LOAD_TEST_RESULTS.md)** - Performance validation and safeguards verification
- 🔧 **[Quick Reference Guide](#monitoring-quick-reference)** - Essential monitoring commands and thresholds

**Status**: ✅ **Production Ready** - 95% safeguards test pass rate with comprehensive protection against common failure modes.

## Database Schema

### Core Entities
```typescript
// Key models
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

### Security Patterns
- Household-scoped data isolation
- Role-based access control
- Audit logging for all mutations
- Resource-level authorization checks

## API Structure

### tRPC Routers
```typescript
// Main API routers
adminRouter     // Record administrations
inventoryRouter // Manage medication inventory
regimensRouter  // Create/edit medication schedules
animalRouter    // Animal profiles
householdRouter // Household management
insightsRouter  // Analytics and patterns
```

All APIs include:
- Type-safe input/output validation with Zod
- Automatic authorization middleware
- Audit logging
- Error handling with circuit breakers

## Offline Support

### PWA Capabilities
- **Service Worker**: Caches app shell and API responses
- **Offline Queue**: IndexedDB-based mutation queue with auto-sync
- **Background Sync**: Automatic sync when connection restored
- **Idempotency**: Prevents duplicate records on sync

### Offline Features
- Record administrations offline
- View historical data
- Access inventory information
- Automatic sync when online

## Development Guide

### Project Structure
```
app/                 # Next.js App Router
├── (authed)/       # Protected routes
├── (dev)/          # Development routes
├── (public)/       # Public routes
└── api/            # API routes

components/         # React components
├── ui/            # shadcn/ui components
├── layout/        # Layout components
└── [feature]/     # Feature-specific components

server/            # tRPC server code
├── api/          # Router definitions
└── utils/        # Server utilities

lib/              # Shared utilities
├── trpc/        # tRPC client setup
├── offline/     # Offline support
└── schemas/     # Zod validation schemas

docs/             # Documentation
├── PRODUCTION_MONITORING.md  # Monitoring guide
├── AUTH_SETUP.md            # Authentication setup
└── implementation-workflow/ # Development guides
```

### Key Development Patterns

1. **When adding new routes**, consider authentication requirements
2. **Use existing UI components** from `components/ui/` before creating new ones
3. **All data operations** should handle offline scenarios via `useOfflineQueue`
4. **Maintain household context** when implementing features
5. **Follow established patterns** for component organization

### Testing

```bash
# Unit tests
pnpm test

# End-to-end tests
pnpm test:e2e

# Load testing
pnpm tsx scripts/load-test.ts all

# Test safeguards
pnpm tsx scripts/test-safeguards.ts
```

## Deployment

### Environment Setup
```bash
# Production environment variables
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="https://your-domain.com"

# Monitoring configuration
HEALTH_CHECK_INTERVAL=30000
CIRCUIT_BREAKER_ENABLED=true
RATE_LIMITING_ENABLED=true
```

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Health endpoint accessible
- [ ] Monitoring alerts configured
- [ ] Load testing completed
- [ ] Backup procedures verified

## Monitoring Quick Reference

### Essential Health Commands
```bash
# System health status
curl http://localhost:3000/api/health

# Database connection status
curl "http://localhost:3000/api/health?detailed=true" | jq '.components.database'

# Circuit breaker states
curl "http://localhost:3000/api/health?detailed=true" | jq '.components.circuitBreakers'

# Connection queue status
curl "http://localhost:3000/api/health?detailed=true" | jq '.metrics.queue'
```

### Performance Thresholds
- **Response Time**: P95 < 2000ms, P99 < 5000ms
- **Error Rate**: < 1% overall, < 0.5% for 5xx errors
- **Database Usage**: < 80% connection pool utilization
- **Queue Depth**: < 50 items in connection queue

### Alert Conditions
- 🚨 **Critical**: Health endpoint 503, circuit breakers open > 5min
- ⚠️ **Warning**: Response time P95 > 3s, queue depth > 100
- ℹ️ **Info**: Rate limit violations, performance trends

## Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`pnpm test && pnpm test:e2e`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Code Standards
- TypeScript strict mode required
- ESLint configuration must pass
- Components must handle offline scenarios
- All mutations require audit logging
- Tests required for new features

## Documentation

### Complete Documentation
- 🏗️ **[Architecture Guide](./CLAUDE.md)** - Comprehensive project overview
- 🔐 **[Authentication Setup](./docs/AUTH_SETUP.md)** - Clerk configuration
- 📊 **[Production Monitoring](./docs/PRODUCTION_MONITORING.md)** - Monitoring and observability
- 📱 **[Offline Support](./docs/OFFLINE_QUEUE.md)** - PWA and offline capabilities
- 🗄️ **[Database Guide](./docs/DATABASE_POOLING.md)** - Database optimization
- 🧪 **[Testing Infrastructure](./tests/README.md)** - Testing setup and guidelines
- 📋 **[Implementation Workflow](./docs/implementation-workflow/)** - Step-by-step development guides

### API Documentation
- tRPC routers provide automatic type safety
- Input/output schemas defined with Zod
- Authentication and authorization built-in
- Comprehensive error handling

## License

[License information here]

## Support

For support, please:
1. Check the [documentation](./docs/)
2. Review [existing issues](../../issues)
3. Create a new issue with detailed information

---

**Status**: 🚀 **Production Ready** with comprehensive monitoring and 95% safeguards test coverage.

Built with ❤️ for veterinary professionals and pet caregivers.