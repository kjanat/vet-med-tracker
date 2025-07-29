# VetMed Tracker - TODO List

## Critical Security Issues
- [ ] Implement NextAuth authentication - complete setup with email/Google/Apple SSO
- [ ] Enable authorization checks - uncomment and implement membership verification in tRPC middleware
- [ ] Fix household ID security - move from headers to secure session/token-based approach
- [ ] Add CSRF protection - implement token validation for all mutations
- [ ] Implement rate limiting - add API endpoint protection against abuse
- [ ] Secure audit logs - add proper access checks for sensitive data

## Database & Backend Issues
- [ ] Connect tRPC to real database - replace all mock data with actual Drizzle queries
- [ ] Set up database migrations - implement Drizzle migration strategy
- [ ] Fix PRN idempotency - use deterministic keys instead of random UUIDs
- [ ] Add transaction handling - wrap critical operations in database transactions
- [ ] Add database indexes - optimize schema with performance-critical indexes
- [ ] Configure connection pooling - optimize database connection management

## State Management & Performance
- [ ] Integrate React Query with tRPC - implement proper data fetching in AppProvider
- [ ] Add caching/invalidation strategy - configure React Query for optimal performance
- [ ] Implement code splitting - lazy load routes and heavy components
- [ ] Optimize bundle size - configure tree shaking and analyze imports
- [ ] Add virtualization for long lists - implement react-window for performance
- [ ] Add memoization - cache expensive computations with useMemo/React.memo

## PWA & Offline Issues
- [ ] Implement offline queue - add IndexedDB-based queue for offline mutations
- [ ] Add background sync - implement service worker background sync API
- [ ] Set up IndexedDB - add local data persistence layer
- [ ] Implement push notifications - connect notification UI to real push service
- [ ] Create manifest.json - add PWA manifest for installation
- [ ] Add service worker update strategy - implement update notifications

## Code Quality & TypeScript
- [ ] Remove all 'any' types - replace 28 instances with proper types
- [ ] Enable TypeScript strict mode - update tsconfig.json settings
- [ ] Add error boundaries - implement React error boundaries for graceful failures
- [ ] Standardize component patterns - consistent file structure and naming
- [ ] Remove dead code - clean up placeholder.svg and unused imports
- [ ] Add JSDoc documentation - document complex functions and components

## Accessibility & UX
- [ ] Add comprehensive ARIA labels - improve screen reader support
- [ ] Implement keyboard navigation - add proper tab order and focus management
- [ ] Add loading states - implement skeleton screens and progress indicators
- [ ] Improve error messages - user-friendly error handling and display
- [ ] Add i18n support - implement internationalization framework
- [ ] Improve mobile UX - larger touch targets, swipe gestures, responsive design

## Missing Core Features
- [ ] Implement barcode scanning - complete useBarcodeScanner hook
- [ ] Add camera integration - medication photo capture and storage
- [ ] Implement data export - connect export UI to actual export functionality
- [ ] Build reminder system - backend for notification scheduling
- [ ] Complete timezone handling - implement timezone-aware date operations
- [ ] Add analytics - implement privacy-respecting usage tracking

## DevOps & Infrastructure
- [ ] Set up CI/CD pipeline - GitHub Actions for testing and deployment
- [ ] Add env validation - type and validate environment variables with zod
- [ ] Implement monitoring - add Sentry or similar for error tracking
- [ ] Add security headers - CSP, HSTS, X-Frame-Options, etc.
- [ ] Implement API versioning - version tRPC routes for backward compatibility
- [ ] Create backup strategy - automated database backups

## Testing
- [ ] Add unit tests - test utilities, hooks, and business logic
- [ ] Add integration tests - test API endpoints and database operations
- [ ] Add E2E tests - critical user flows with Playwright
- [ ] Add accessibility tests - automated a11y testing
- [ ] Add performance tests - bundle size and runtime performance monitoring