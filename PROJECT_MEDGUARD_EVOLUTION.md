# Project MedGuard Evolution - Task List

## Week 1: Foundation & Quick Wins

### Photo Management System

#### Complete Photo Upload Infrastructure

**Time**: 4 hours

- [ ] Test `/api/upload` endpoint - verify it works with test files
- [ ] Add browser-side image compression using canvas API (target < 500KB)
- [ ] Create `PhotoUploader.tsx` component with drag-and-drop
- [ ] Store photos in IndexedDB when offline, sync when online
- [ ] Show upload progress bar using XMLHttpRequest.upload events

**Done when**: Can upload photos, see progress, works offline, images compressed

#### Animal Photo Gallery

**Time**: 4 hours

- [ ] Create `PhotoGallery.tsx` with CSS grid layout
- [ ] Add lightbox modal for full-size viewing
- [ ] Implement swipe gestures using touch events
- [ ] Add delete photo button with confirmation
- [ ] Set primary photo functionality
- [ ] Lazy load images using Intersection Observer

**Done when**: Gallery shows all photos, can view/delete/set primary, smooth scrolling

#### Administration Photo Evidence

**Time**: 4 hours

- [ ] Add `photo_urls text[]` to administrations table
- [ ] Update TypeScript types in `db/schema.ts`
- [ ] Add camera button to administration form
- [ ] Show photo thumbnails after capture
- [ ] Display photos in administration history timeline

**Done when**: Can attach photos to medication records, visible in history

---

### Co-signing Workflow

#### Co-signer Backend

**Time**: 3 hours

- [ ] Create tRPC endpoints:
  ```typescript
  // server/api/routers/cosigner.ts
  createRequest: protectedProcedure
    .input(z.object({ administrationId, cosignerId }))
    .mutation(async ({ ctx, input }) => {
      // Send notification, create pending record
    })
  
  approve: protectedProcedure
    .input(z.object({ requestId, signature }))
    .mutation(async ({ ctx, input }) => {
      // Validate, store signature, update status
    })
  ```
- [ ] Add co-signer notification to queue
- [ ] Validate co-signer has appropriate role (not VETREADONLY)

**Done when**: API endpoints work, notifications sent, validation enforced

#### Co-signing UI

**Time**: 4 hours

- [ ] Create `CoSignerSelect.tsx` - dropdown of eligible household members
- [ ] Build `SignaturePad.tsx` using canvas:
  ```typescript
  const SignaturePad = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    // Handle mouse/touch events for drawing
    // Export as base64 string
  }
  ```
- [ ] Add pending indicator icon to administrations needing co-signature
- [ ] Show signature with timestamp when approved

**Done when**: Can request co-signer, capture signature, see status

---

### Bulk Operations

#### Bulk Selection Infrastructure

**Time**: 3 hours

- [ ] Create `BulkSelectionProvider` context:
  ```typescript
  interface BulkSelectionContext {
    selectedIds: Set<string>;
    toggle: (id: string) => void;
    selectAll: () => void;
    clearSelection: () => void;
  }
  ```
- [ ] Add checkbox column to data tables
- [ ] Show floating action bar when items selected
- [ ] Add "Select All" checkbox in header

**Done when**: Can select multiple items, see count, bulk actions appear

#### Bulk Administration Recording

**Time**: 4 hours

- [ ] Create bulk tRPC mutation:
  ```typescript
  recordBulk: protectedProcedure
    .input(z.object({
      animalIds: z.array(z.string()),
      medicationId: z.string(),
      timestamp: z.date(),
      // ... other fields
    }))
    .mutation(async ({ ctx, input }) => {
      // Use transaction, return results array
    })
  ```
- [ ] Build bulk recording form
- [ ] Show progress during submission (X of Y completed)
- [ ] Handle partial failures gracefully

**Done when**: Can record same medication for multiple animals at once

---

## Week 2-3: Core Features

### Dosage Calculator

#### Calculation Engine

**Time**: 6 hours

- [ ] Create `DosageCalculator` class:
  ```typescript
  class DosageCalculator {
    calculate(weight: number, weightUnit: string, 
             medicationId: string, species: string): DosageResult {
      // mg/kg calculations
      // species-specific adjustments  
      // safety range validation
    }
  }
  ```
- [ ] Add dosage ranges to medication catalog table
- [ ] Implement unit conversions (kg/lbs, mg/mL, etc.)
- [ ] Add maximum safe dose validation
- [ ] Return warnings for out-of-range doses

**Done when**: Calculator returns correct doses with safety warnings

#### Calculator UI

**Time**: 6 hours

- [ ] Build `DosageCalculator.tsx` component
- [ ] Real-time calculation as user types
- [ ] Color-code results: green (safe), yellow (caution), red (danger)
- [ ] Show reference range below result
- [ ] Add "Apply to Regimen" button
- [ ] Save calculation to history

**Done when**: UI calculates in real-time, shows warnings, can apply to regimen

---

### Push Notifications

#### Web Push Setup

**Time**: 6 hours

- [ ] Generate VAPID keys and add to .env
- [ ] Create service worker registration:
  ```javascript
  // public/sw.js additions
  self.addEventListener('push', (event) => {
    const data = event.data.json();
    self.registration.showNotification(data.title, data.options);
  });
  ```
- [ ] Create subscription endpoint:
  ```typescript
  subscribe: protectedProcedure
    .input(z.object({ subscription: pushSubscriptionSchema }))
    .mutation(async ({ ctx, input }) => {
      // Store subscription in database
    })
  ```
- [ ] Build notification scheduler using node-cron
- [ ] Calculate notification times based on regimens

**Done when**: Can subscribe to push, notifications arrive on schedule

#### User Preferences

**Time**: 4 hours

- [ ] Add notification settings to user profile page
- [ ] Create toggles for each notification type
- [ ] Add quiet hours setting (e.g., no notifications 10pm-7am)
- [ ] Per-animal notification overrides
- [ ] Store preferences in user JSONB column

**Done when**: User can control what notifications they receive and when

---

### Reporting Dashboard

#### Dashboard Infrastructure

**Time**: 6 hours

- [ ] Install and configure Chart.js or Recharts
- [ ] Create `DashboardLayout.tsx` with CSS Grid
- [ ] Build data fetching hooks:
  ```typescript
  const useComplianceData = (dateRange: DateRange) => {
    return trpc.insights.compliance.useQuery({ dateRange });
  };
  ```
- [ ] Add loading skeletons for each widget
- [ ] Implement error boundaries for widget failures

**Done when**: Dashboard layout renders, charts display data

#### Compliance Analytics

**Time**: 5 hours

- [ ] Calculate compliance percentage:
  ```typescript
  const compliance = (onTime + late) / total * 100;
  ```
- [ ] Create line chart for trends over time
- [ ] Build heat map calendar showing daily compliance
- [ ] Add drill-down to see specific administrations
- [ ] Cache calculations in Redis for performance

**Done when**: Charts show real compliance data, can drill down for details

#### Export Functionality

**Time**: 5 hours

- [ ] Generate PDF using jsPDF:
  ```typescript
  const generatePDF = async (reportData: ReportData) => {
    const pdf = new jsPDF();
    // Add charts as images
    // Add data tables
    // Format for printing
  };
  ```
- [ ] Create CSV export for raw data
- [ ] Add date range selector
- [ ] Include filters in export

**Done when**: Can export reports as PDF/CSV with selected data

---

## Week 4: Database Optimization

### Table Partitioning

**Time**: 8 hours

- [ ] Create partitioned tables:
  ```sql
  -- Partition administrations by month
  CREATE TABLE vetmed_administrations_2024_01 
    PARTITION OF vetmed_administrations
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
  ```
- [ ] Write migration script to move existing data
- [ ] Update queries to use partition pruning
- [ ] Create cron job to auto-create future partitions
- [ ] Test query performance improvement

**Done when**: Tables partitioned, queries faster, auto-maintenance working

### Materialized Views

**Time**: 8 hours

- [ ] Create compliance stats view:
  ```sql
  CREATE MATERIALIZED VIEW mv_compliance_stats AS
  SELECT 
    animal_id,
    date_trunc('day', scheduled_time) as day,
    COUNT(*) FILTER (WHERE status = 'ON_TIME') as on_time,
    COUNT(*) as total
  FROM vetmed_administrations
  GROUP BY animal_id, day;
  ```
- [ ] Set up refresh strategy (CONCURRENTLY every hour)
- [ ] Update dashboard queries to use views
- [ ] Monitor refresh performance

**Done when**: Views created, refreshing automatically, dashboards faster

### Query Optimization

**Time**: 6 hours

- [ ] Add missing indexes based on slow query log:
  ```sql
  CREATE INDEX idx_administrations_animal_scheduled 
    ON vetmed_administrations(animal_id, scheduled_time);
  ```
- [ ] Add GIN indexes for JSONB columns:
  ```sql
  CREATE INDEX idx_users_preferences 
    ON vetmed_users USING gin(preferences);
  ```
- [ ] Rewrite slow queries identified in monitoring
- [ ] Test EXPLAIN ANALYZE shows index usage

**Done when**: All queries < 100ms, indexes being used

---

## Week 5: Testing

### Unit Tests

**Time**: 10 hours

Create test files with actual test cases:

```typescript
// tests/unit/calculators/dosage.test.ts
describe('DosageCalculator', () => {
  it('calculates correct mg/kg dose', () => {
    const result = calculator.calculate(10, 'kg', 'med-123', 'dog');
    expect(result.dose).toBe(25);
    expect(result.unit).toBe('mg');
  });
  
  it('warns when dose exceeds safe range', () => {
    const result = calculator.calculate(50, 'kg', 'med-123', 'dog');
    expect(result.warnings).toContain('Exceeds maximum safe dose');
  });
});
```

**Done when**: 80% coverage on business logic, all edge cases tested

### Visual Regression Tests

**Time**: 8 hours

- [ ] Set up Percy:
  ```typescript
  // tests/e2e/visual.spec.ts
  test('dashboard renders correctly', async ({ page }) => {
    await page.goto('/dashboard');
    await percySnapshot(page, 'Dashboard');
  });
  ```
- [ ] Capture baseline screenshots for all major views
- [ ] Add to CI pipeline to run on PRs
- [ ] Configure auto-approval for minor changes

**Done when**: Visual tests prevent UI regressions, < 5% false positives

### Test Data Factories

**Time**: 6 hours

```typescript
// tests/factories/animal.ts
export const createAnimal = (overrides = {}) => ({
  id: faker.datatype.uuid(),
  name: faker.name.firstName(),
  species: 'dog',
  breed: faker.animal.dog(),
  weight: faker.datatype.number({ min: 5, max: 50 }),
  ...overrides
});
```

**Done when**: Factories for all entities, tests use factories not hardcoded data

---

## Week 6: Launch Prep

### Bundle Optimization

**Time**: 6 hours

- [ ] Run bundle analyzer, identify large chunks
- [ ] Implement route-based code splitting:
  ```typescript
  const Dashboard = lazy(() => import('./pages/Dashboard'));
  ```
- [ ] Move heavy dependencies to dynamic imports
- [ ] Optimize images (WebP format, srcset)
- [ ] Enable React Compiler in next.config.js

**Done when**: Initial bundle < 200KB, Lighthouse score > 95

### Security Audit

**Time**: 4 hours

- [ ] Run `npm audit fix`
- [ ] Check all user inputs have validation
- [ ] Verify tRPC procedures check permissions
- [ ] Add rate limiting to public endpoints
- [ ] Set security headers in middleware

**Done when**: No high/critical vulnerabilities, permissions enforced

### Deployment

**Time**: 8 hours

- [ ] Update environment variables in Vercel
- [ ] Run database migrations on production
- [ ] Deploy to staging, run smoke tests
- [ ] Monitor error rates and performance
- [ ] Deploy to production with feature flags
- [ ] Watch metrics for 24 hours

**Done when**: Deployed, no errors, performance targets met

---

## Definition of Done Checklist

For each feature:

- [ ] Code works locally
- [ ] TypeScript has no errors
- [ ] Tests written and passing
- [ ] Works on mobile
- [ ] Handles errors gracefully
- [ ] Performance acceptable (< 100ms API, < 2s page load)
- [ ] Accessible (keyboard navigation, screen reader)
- [ ] Code reviewed and approved

For the project:

- [ ] All features implemented and tested
- [ ] Database queries < 100ms p95
- [ ] 80% test coverage
- [ ] No security vulnerabilities
- [ ] Documentation updated
- [ ] Deployed to production
- [ ] Monitoring shows stable

---

## Quick Command Reference

```bash
# Development
pnpm dev                    # Start dev server
pnpm typecheck              # Check types
pnpm lint                   # Run linter
pnpm test                   # Run tests

# Database
pnpm db:generate            # Generate migrations
pnpm db:push               # Apply to dev database
pnpm db:studio             # Open database GUI

# Testing
pnpm test:unit             # Unit tests only
pnpm test:e2e              # E2E tests
pnpm test:coverage         # Coverage report

# Deployment
pnpm build                 # Build for production
vercel --prod              # Deploy to production
```

---

## Common Patterns to Follow

### tRPC Endpoint

```typescript
export const myRouter = createTRPCRouter({
  doThing: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check permissions
      const hasAccess = await checkHouseholdAccess(ctx.user.id, input.id);
      if (!hasAccess) throw new TRPCError({ code: 'FORBIDDEN' });
      
      // Do the thing
      return await ctx.db.thing.create({ data: input });
    }),
});
```

### React Component

```typescript
export function MyComponent({ data }: Props) {
  const [state, setState] = useState(initialState);
  const { mutate, isLoading } = trpc.thing.doThing.useMutation();
  
  // Component logic
  
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage />;
  
  return <div>...</div>;
}
```

### Database Query

```typescript
const result = await db
  .select()
  .from(animals)
  .where(eq(animals.householdId, householdId))
  .orderBy(desc(animals.createdAt));
```