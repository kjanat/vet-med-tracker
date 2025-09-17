# VetMed Tracker - Development Workflow

## Package Management

- **Primary**: Bun (package.json specifies bun@1.2.22)
- **Lock File**: bun.lock for dependency resolution
- **Node Version**: 22.x required (engines field)

## Development Scripts

### Core Development

```bash
# Start development server with Turbopack
bun dev

# Build for production
bun build

# Start production server
bun start

# Preview production build locally
bun preview

# Vercel development environment
bun preview:dev
```

### Database Management

```bash
# Generate Drizzle migrations from schema changes
bun db:generate

# Push schema changes to database
bun db:push

# Force push (destructive)
bun db:push:force

# Run migrations
bun db:migrate

# Production migrations
bun db:migrate:prod

# Staging migrations
bun db:migrate:staging

# Rollback migrations
bun db:rollback

# Open Drizzle Studio GUI
bun db:studio
```

### Code Quality

```bash
# TypeScript type checking
bun typecheck

# Biome linting (check only)
bun lint

# Biome linting with auto-fix
bun lint:fix

# Code formatting
bun format

# Markdown formatting
bun format:md
```

### Testing

```bash
# Unit tests with Bun test runner
bun test

# E2E tests with Playwright
bun test:e2e

# E2E tests with UI mode
bun test:e2e:ui

# Run all tests (unit + E2E)
bun test:all
```

### Performance & Monitoring

```bash
# Performance audit with Lighthouse
bun perf:audit

# Bundle analysis
bun build:stats
bun bundle:size

# Lighthouse CI
bun lighthouse:ci
```

### Deployment

```bash
# Deploy to staging
bun deploy:staging

# Deploy to production  
bun deploy:production
```

## Test Configuration

### Unit Testing (Bun)

- **Runner**: Bun test with Happy DOM
- **Framework**: React Testing Library + Jest compatibility layer
- **Coverage**: 70% threshold target (bunfig.toml)
- **Preload**: happydom.ts for DOM environment setup
- **Location**: tests/ directory

### E2E Testing (Playwright)

- **Browsers**: Chromium, Firefox, WebKit + Mobile variants
- **Configuration**: playwright.config.ts
- **Base URL**: <http://localhost:3000>
- **Features**: Screenshots, videos, traces on failure
- **Location**: tests/e2e (currently empty)

## Build Process

### Next.js Configuration

- **Version**: 15.6.0-canary with App Router
- **Turbopack**: Available for development (`--turbopack` flag)
- **TypeScript**: Strict mode with path mapping
- **Bundle Analysis**: @next/bundle-analyzer integration

### Environment Configuration

- **Development**: .env.local for local overrides
- **Production**: Environment variables via deployment platform
- **Required**: DATABASE_URL, STACK_AUTH credentials
- **Optional**: REDIS_URL, SENTRY_DSN

## Quality Gates

### Pre-commit Hooks (Husky)

- **Setup**: `bun prepare` installs husky hooks
- **Checks**: Likely includes linting, formatting, type checking
- **Configuration**: .husky/ directory

### Linting Configuration

- **Tool**: Biome (biomejs)
- **Config**: biome.jsonc with domain-specific rules
- **Features**: Auto-fix, import organization, class sorting
- **Coverage**: TypeScript, React, Next.js domains

### Type Checking

- **Tool**: TypeScript compiler (tsc)
- **Mode**: --noEmit (type checking only)
- **Configuration**: tsconfig.json with strict settings
- **Integration**: Required before commits/deployment

## Deployment Workflow

### Vercel Integration

- **Platform**: Vercel with Edge Runtime support
- **Staging**: Automatic deployments from feature branches
- **Production**: Manual promotion or master branch deploys
- **Features**: Bundle analysis, performance monitoring

### Database Deployment

- **Staging**: Separate DATABASE_URL for staging environment
- **Production**: Protected migrations with rollback capability
- **Monitoring**: Connection pooling and performance tracking

## Development Best Practices

### Git Workflow

- **Main Branch**: master (not main)
- **Feature Branches**: Branched from master
- **Commit Style**: Conventional commits recommended
- **Merge Strategy**: Likely squash merges for clean history

### Error Handling

- **Client**: Error boundaries for React components
- **Server**: tRPC error handling with type safety
- **Monitoring**: Optional Sentry integration
- **Logging**: Custom audit logging system

### Performance Considerations

- **Bundle Optimization**: Code splitting and tree shaking
- **Image Optimization**: Disabled for PWA compatibility  
- **Caching**: Redis integration for frequently accessed data
- **Analytics**: Vercel Analytics integration
