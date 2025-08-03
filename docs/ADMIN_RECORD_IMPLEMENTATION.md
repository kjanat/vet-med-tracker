# Admin Record Implementation Documentation

This document describes the implementation of the medication administration recording feature in VetMed Tracker, including the connection between the frontend `/admin/record` page and the tRPC backend.

## Overview

The administration recording feature allows caregivers to record when they give medications to animals. It follows the "three taps to record" principle and includes offline support, inventory tracking, and compliance monitoring.

## Architecture

### Data Flow

```
User Interface (/admin/record)
    ↓
tRPC Client (React Query)
    ↓
tRPC Router (admin.create)
    ↓
Database (Drizzle ORM)
    ↓
Audit Logging
```

### Key Components

1. **Frontend**: `/app/(authed)/admin/record/page.tsx`
2. **API Routes**:
   - `server/api/routers/regimens.ts` - Lists due medications
   - `server/api/routers/admin.ts` - Records administrations
   - `server/api/routers/inventory.ts` - Manages inventory sources
3. **Offline Support**: `hooks/useOfflineQueue.ts`
4. **Database Schema**: [`@/db/schema/regimens.ts`](./server/db/schema/regimens.ts),  [`@/db/schema/audit.ts`](./server/db/schema/audit.ts)

## API Reference

### Regimen Router

#### `listDue` Query

Fetches medications that are due or upcoming for administration.

**Input**:
```typescript
{
  householdId?: string;    // Optional, uses context if not provided
  animalId?: string;       // Filter by specific animal
  includeUpcoming?: boolean; // Include "later today" medications (default: true)
}
```

**Output**:
```typescript
Array<{
  id: string;
  animalId: string;
  animalName: string;
  animalSpecies?: string;
  animalPhotoUrl?: string | null;
  medicationName: string;
  brandName?: string | null;
  route: string;
  form: string;
  strength: string;
  dose?: string;
  targetTime?: Date;
  isPRN: boolean;
  isHighRisk: boolean;
  requiresCoSign: boolean;
  compliance: number;
  section: "due" | "later" | "prn";
  isOverdue?: boolean;
  minutesUntilDue?: number;
  instructions?: string | null;
  prnReason?: string | null;
  lastAdministration?: {
    id: string;
    recordedAt: Date;
    status: string;
  } | null;
}>
```

**Business Logic**:
- Filters active regimens within date range
- Calculates due status based on schedule and current time
- Categorizes into sections: "due" (-60 to +180 minutes), "later" (>60 minutes), or "prn"
- Sorts by urgency (due → later → prn)

### Admin Router

#### `create` Mutation

Records a medication administration with idempotency support.

**Input**:
```typescript
{
  householdId: string;
  animalId: string;
  regimenId: string;
  administeredAt?: string;    // ISO datetime, defaults to now
  inventorySourceId?: string;
  notes?: string;
  site?: string;
  conditionTags?: string[];
  requiresCoSign?: boolean;
  allowOverride?: boolean;    // Allow expired medication
  idempotencyKey: string;
  dose?: string;              // For offline sync
  status?: "ON_TIME" | "LATE" | "VERY_LATE" | "PRN";
}
```

**Output**: Administration record with generated ID and calculated status

**Business Logic**:
- Validates animal belongs to household
- Validates regimen is active for the animal
- Validates inventory item if provided (checks expiration)
- Calculates administration status based on schedule:
  - ON_TIME: ≤ +60 minutes from target
  - LATE: +61 to +180 minutes
  - VERY_LATE: >180 minutes until cutoff
  - PRN: As-needed medications
- Prevents duplicates using idempotency key
- Creates audit log entry

### Inventory Router

#### `getSources` Query

Fetches available inventory sources for a specific medication.

**Input**:
```typescript
{
  householdId: string;
  medicationName: string;
  includeExpired?: boolean;  // default: false
}
```

**Output**:
```typescript
Array<{
  id: string;
  name: string;
  lot: string;
  expiresOn: Date | null;
  unitsRemaining: number;
  isExpired: boolean;
  isWrongMed: boolean;
  inUse: boolean;
}>
```

**Business Logic**:
- Filters by medication name (case-insensitive, partial match)
- Excludes expired items unless explicitly included
- Orders by in-use status, then expiration date

## Frontend Implementation

### Page Structure

The record page follows a three-step flow:

1. **Select Step**: Display due medications grouped by urgency
2. **Confirm Step**: Review details and add optional information
3. **Success Step**: Confirmation with sync status

### State Management

```typescript
const state = useRecordState(); // Local state hook
const { animals, currentHousehold } = useApp(); // Global context
const { isOnline, enqueue } = useOfflineQueue(); // Offline support
```

### Data Fetching

```typescript
// Fetch due regimens
const { data: dueRegimens } = trpc.regimen.listDue.useQuery({
  householdId: currentHousehold?.id,
  animalId: selectedAnimalId,
  includeUpcoming: true,
}, {
  enabled: !!currentHousehold?.id,
  refetchInterval: 60000, // Refresh every minute
});

// Fetch inventory sources when regimen selected
const { data: inventorySources } = trpc.inventory.getSources.useQuery({
  householdId: currentHousehold?.id,
  medicationName: selectedRegimen?.medicationName,
  includeExpired: allowOverride,
}, {
  enabled: !!selectedRegimen && !!currentHousehold?.id,
});
```

### Form Submission

```typescript
const handleConfirm = async () => {
  const payload = createAdminPayload(state, currentHousehold.id);
  
  if (!isOnline) {
    // Queue for offline sync
    await enqueue({
      type: 'admin.create',
      payload,
    }, payload.idempotencyKey);
    setStep('success');
  } else {
    // Online - use tRPC mutation
    await createAdminMutation.mutateAsync(payload);
  }
};
```

## Offline Support

### Idempotency Keys

Generated using animal ID, regimen ID, date, and slot index:

```typescript
const idempotencyKey = adminKey(
  animalId,
  regimenId,
  localDayISO(now, timezone),
  isPRN ? undefined : slotIndex
);
```

### Queue Management

- Mutations queued in IndexedDB when offline
- Automatic sync when connection restored
- Prevents duplicates using idempotency keys
- Exponential backoff for failed retries

## Timezone Handling

- All timestamps stored in UTC
- Display times converted to animal's home timezone
- Schedule calculations use local time for the animal
- Day boundaries respect animal's timezone

## Security Considerations

1. **Authorization**: Household membership verified in tRPC middleware
2. **Audit Trail**: All administrations logged with user, timestamp, and changes
3. **Data Validation**: Zod schemas validate all inputs
4. **Inventory Control**: Expired medication requires explicit override

## Testing

### Unit Tests

- `admin.test.ts`: Admin router mutation logic
- `regimens.test.ts`: Due medication calculations
- `inventory.test.ts`: Inventory filtering logic

### Integration Tests

- `page.test.tsx`: Full page flow with mocked tRPC
- `useOfflineQueue.test.ts`: Offline queue behavior

### Test Coverage

- Administration creation with various scenarios
- Idempotency and duplicate prevention
- Status calculation logic
- Inventory validation
- Offline queue operations
- UI state transitions

## Error Handling

1. **Network Errors**: Automatically queued for offline sync
2. **Validation Errors**: Displayed in UI with clear messages
3. **Authorization Errors**: Redirect to appropriate page
4. **Data Conflicts**: Resolved using idempotency keys

## Performance Considerations

1. **Query Optimization**:
   - Due medications refresh every minute
   - Inventory sources cached until selection changes
   - Minimal data fetched (no unnecessary joins)

2. **Offline Performance**:
   - IndexedDB for fast local storage
   - Optimistic UI updates
   - Background sync when online

3. **Bundle Size**:
   - Dynamic imports for heavy components
   - Tree-shaking unused tRPC procedures

## Future Enhancements

1. **Barcode Scanning**: Integrate camera for medication verification
2. **Co-Sign Flow**: Implement real-time co-sign requests
3. **Bulk Recording**: Record multiple medications at once
4. **Voice Input**: "Hey VetMed, record Buddy's antibiotics"
5. **Smart Reminders**: ML-based optimal reminder timing

## Deployment Checklist

- [ ] Run database migrations: `pnpm db:push`
- [ ] Seed test data: `pnpm db:seed`
- [ ] Test offline functionality
- [ ] Verify timezone handling
- [ ] Check inventory validation
- [ ] Monitor performance metrics
- [ ] Set up error tracking
