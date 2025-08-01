# VetMed Tracker API Usage Guide

This guide demonstrates how to use the tRPC API endpoints in VetMed Tracker for common operations.

## Setup

### Client-Side Usage

```typescript
import { trpc } from '@/server/trpc/client';

// In a React component
function MyComponent() {
  // Use queries and mutations
}
```

### Server-Side Usage

```typescript
import { adminRouter } from '@/server/api/routers/admin';
import { createContext } from '@/server/api/trpc/context';

// In server components or API routes
const ctx = await createContext({ req, res });
const caller = adminRouter.createCaller(ctx);
```

## Common Operations

### 1. List Due Medications

```typescript
// Fetch all due medications for current household
const { data, isLoading, error } = trpc.regimen.listDue.useQuery({
  includeUpcoming: true, // Include medications due later today
});

// Filter by specific animal
const { data } = trpc.regimen.listDue.useQuery({
  animalId: 'animal-123',
  includeUpcoming: false, // Only show currently due
});

// Handle the response
data?.forEach(regimen => {
  console.log(`${regimen.animalName} needs ${regimen.medicationName}`);
  console.log(`Due status: ${regimen.section}`); // "due", "later", or "prn"
  console.log(`Minutes until due: ${regimen.minutesUntilDue}`);
});
```

### 2. Record Administration

```typescript
// Create the mutation
const recordAdmin = trpc.admin.create.useMutation({
  onSuccess: (data) => {
    console.log('Recorded successfully:', data.id);
    // Invalidate queries to refresh data
    utils.regimen.listDue.invalidate();
  },
  onError: (error) => {
    console.error('Failed to record:', error.message);
  },
});

// Generate idempotency key
import { adminKey } from '@/utils/idempotency';
const idempotencyKey = adminKey(
  animalId,
  regimenId,
  new Date().toISOString().split('T')[0],
  0 // dose index for the day
);

// Record administration
await recordAdmin.mutateAsync({
  householdId: 'household-123',
  animalId: 'animal-123',
  regimenId: 'regimen-456',
  idempotencyKey,
  notes: 'Took medication well',
  inventorySourceId: 'inventory-789', // Optional
  site: 'Left ear', // Optional
  conditionTags: ['Normal'], // Optional
});
```

### 3. Check Inventory Sources

```typescript
// Find inventory for a specific medication
const { data: sources } = trpc.inventory.getSources.useQuery({
  householdId: 'household-123',
  medicationName: 'Amoxicillin',
  includeExpired: false, // Don't show expired items
});

// Handle inventory selection
const selectedSource = sources?.find(s => s.inUse);
if (selectedSource?.isExpired && !allowOverride) {
  alert('This medication is expired!');
}
```

### 4. List All Regimens

```typescript
// Get all active regimens for a household
const { data: regimens } = trpc.regimen.list.useQuery({
  householdId: 'household-123',
  activeOnly: true,
});

// Filter by animal
const { data: animalRegimens } = trpc.regimen.list.useQuery({
  householdId: 'household-123',
  animalId: 'animal-123',
  activeOnly: false, // Include inactive regimens
});
```

### 5. Get Administration History

```typescript
// Fetch recent administrations
const { data: history } = trpc.admin.list.useQuery({
  householdId: 'household-123',
  limit: 50,
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Last 7 days
});

// Filter by animal
const { data: animalHistory } = trpc.admin.list.useQuery({
  householdId: 'household-123',
  animalId: 'animal-123',
  limit: 20,
});
```

## Offline Support

### Using the Offline Queue

```typescript
import { useOfflineQueue } from '@/hooks/useOfflineQueue';

function RecordMedication() {
  const { isOnline, enqueue } = useOfflineQueue();
  
  const handleRecord = async (payload) => {
    if (!isOnline) {
      // Queue for later sync
      await enqueue({
        type: 'admin.create',
        payload,
      }, payload.idempotencyKey);
      
      // Show success immediately (optimistic update)
      showSuccess();
    } else {
      // Use normal tRPC mutation
      await recordAdmin.mutateAsync(payload);
    }
  };
}
```

### Checking Queue Status

```typescript
const { getQueueStatus } = useOfflineQueue();

const status = await getQueueStatus();
console.log(`${status.count} items queued`);
console.log(`${status.failed} failed attempts`);
```

## Error Handling

### Common Error Types

```typescript
try {
  await recordAdmin.mutateAsync(payload);
} catch (error) {
  if (error.code === 'NOT_FOUND') {
    // Animal or regimen not found
  } else if (error.code === 'BAD_REQUEST') {
    // Validation error (e.g., expired medication)
  } else if (error.code === 'UNAUTHORIZED') {
    // Not a member of the household
  } else if (error.code === 'TIMEOUT') {
    // Network timeout - will be queued offline
  }
}
```

### Retry Logic

```typescript
const recordWithRetry = trpc.admin.create.useMutation({
  retry: 3, // Retry up to 3 times
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
});
```

## Best Practices

### 1. Always Use Idempotency Keys

```typescript
// Good - prevents duplicates
const key = adminKey(animalId, regimenId, date, index);
await recordAdmin.mutateAsync({ ...payload, idempotencyKey: key });

// Bad - could create duplicates
await recordAdmin.mutateAsync({ ...payload, idempotencyKey: Date.now().toString() });
```

### 2. Handle Loading States

```typescript
function MedicationList() {
  const { data, isLoading, error } = trpc.regimen.listDue.useQuery({});
  
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorMessage error={error} />;
  if (!data?.length) return <EmptyState />;
  
  return <MedicationCards medications={data} />;
}
```

### 3. Invalidate Related Queries

```typescript
const utils = trpc.useUtils();

const recordAdmin = trpc.admin.create.useMutation({
  onSuccess: () => {
    // Refresh due medications
    utils.regimen.listDue.invalidate();
    // Update history
    utils.admin.list.invalidate();
    // Update inventory if used
    if (inventorySourceId) {
      utils.inventory.list.invalidate();
    }
  },
});
```

### 4. Use Optimistic Updates

```typescript
const recordAdmin = trpc.admin.create.useMutation({
  onMutate: async (newAdmin) => {
    // Cancel outgoing refetches
    await utils.regimen.listDue.cancel();
    
    // Snapshot previous value
    const previousData = utils.regimen.listDue.getData();
    
    // Optimistically update
    utils.regimen.listDue.setData(undefined, (old) => {
      return old?.filter(r => r.id !== newAdmin.regimenId);
    });
    
    return { previousData };
  },
  onError: (err, newAdmin, context) => {
    // Rollback on error
    utils.regimen.listDue.setData(undefined, context?.previousData);
  },
  onSettled: () => {
    // Always refetch after error or success
    utils.regimen.listDue.invalidate();
  },
});
```

### 5. Handle Timezone Correctly

```typescript
import { formatTimeLocal, localDayISO } from '@/utils/tz';

// Display time in animal's timezone
const displayTime = formatTimeLocal(regimen.targetTime, animal.timezone);

// Calculate local day for idempotency
const localDay = localDayISO(new Date(), animal.timezone);
```

## Testing

### Mock tRPC in Tests

```typescript
import { vi } from 'vitest';

// Mock the entire client
vi.mock('@/server/trpc/client', () => ({
  trpc: {
    regimen: {
      listDue: {
        useQuery: vi.fn(() => ({
          data: mockDueRegimens,
          isLoading: false,
          error: null,
        })),
      },
    },
    admin: {
      create: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
          isPending: false,
        })),
      },
    },
  },
}));
```

### Test Offline Behavior

```typescript
it('should queue when offline', async () => {
  // Mock offline state
  vi.mocked(useOfflineQueue).mockReturnValue({
    isOnline: false,
    enqueue: mockEnqueue,
  });
  
  // Trigger action
  await recordMedication(payload);
  
  // Verify queued
  expect(mockEnqueue).toHaveBeenCalledWith(
    expect.objectContaining({ type: 'admin.create' }),
    expect.any(String) // idempotency key
  );
});
```

## Advanced Usage

### Batch Operations

```typescript
// Record multiple administrations
const recordMultiple = async (administrations: AdminPayload[]) => {
  const results = await Promise.allSettled(
    administrations.map(admin => 
      recordAdmin.mutateAsync(admin)
    )
  );
  
  const successful = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');
  
  console.log(`Recorded ${successful.length}/${administrations.length}`);
};
```

### Custom Hooks

```typescript
// Create a custom hook for due medications
export function useDueMedications(animalId?: string) {
  const { currentHousehold } = useApp();
  
  return trpc.regimen.listDue.useQuery(
    {
      householdId: currentHousehold?.id,
      animalId,
      includeUpcoming: true,
    },
    {
      enabled: !!currentHousehold?.id,
      refetchInterval: 60000, // Auto-refresh every minute
      staleTime: 30000, // Consider data stale after 30 seconds
    }
  );
}

// Use in components
function MedicationAlert() {
  const { data: dueMeds } = useDueMedications();
  const urgentCount = dueMeds?.filter(m => m.section === 'due').length || 0;
  
  return <Badge>{urgentCount} medications due now</Badge>;
}
```

### Performance Optimization

```typescript
// Use select to reduce data
const { data: medicationNames } = trpc.regimen.listDue.useQuery(
  { householdId },
  {
    select: (data) => data.map(r => ({
      id: r.id,
      name: r.medicationName,
      animal: r.animalName,
    })),
  }
);

// Parallel queries
const [regimens, inventory, history] = trpc.useQueries((t) => [
  t.regimen.listDue({ householdId }),
  t.inventory.list({ householdId }),
  t.admin.list({ householdId, limit: 10 }),
]);
```