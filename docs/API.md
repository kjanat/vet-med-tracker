# API Documentation

VetMed Tracker uses tRPC for type-safe API communication. All endpoints are accessible via the tRPC client.

## Table of Contents

- [Authentication](#authentication)
- [API Structure](#api-structure)
- [Core Endpoints](#core-endpoints)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

## Authentication

All API endpoints except public queries require authentication via Stack Auth.

### Headers

```typescript
{
  "Authorization": "Bearer <token>",
  "x-household-id": "household_uuid" // For household-scoped operations
}
```

## API Structure

Base URL: `/api/trpc`

All endpoints follow the tRPC convention:

- Queries: `GET /api/trpc/[router].[procedure]`
- Mutations: `POST /api/trpc/[router].[procedure]`

## Core Endpoints

### Animal Router (`animal`)

#### `animal.list`

Get all animals for a household.

```typescript
// Query
input: { householdId: string }
output: Animal[]
```

#### `animal.get`

Get a specific animal.

```typescript
// Query
input: { id: string }
output: Animal | null
```

#### `animal.create`

Create a new animal.

```typescript
// Mutation
input: {
  name: string
  species: string
  breed?: string
  weight: number
  weightUnit: "kg" | "lbs"
  dateOfBirth?: Date
  microchipId?: string
  householdId: string
}
output: Animal
```

#### `animal.update`

Update an animal.

```typescript
// Mutation
input: {
  id: string
  name?: string
  weight?: number
  // ... other fields
}
output: Animal
```

#### `animal.delete`

Delete an animal.

```typescript
// Mutation
input: { id: string }
output: { success: boolean }
```

### Household Router (`household`)

#### `household.list`

Get user's households.

```typescript
// Query
output: Household[]
```

#### `household.create`

Create a new household.

```typescript
// Mutation
input: {
  name: string
  timezone: string
}
output: Household
```

#### `household.addMember`

Add a member to household.

```typescript
// Mutation
input: {
  householdId: string
  email: string
  role: "OWNER" | "CAREGIVER" | "VETREADONLY"
}
output: Membership
```

### Regimen Router (`regimen`)

#### `regimen.list`

Get medication regimens.

```typescript
// Query
input: {
  animalId?: string
  householdId?: string
  includeInactive?: boolean
}
output: Regimen[]
```

#### `regimen.create`

Create a medication schedule.

```typescript
// Mutation
input: {
  animalId: string
  medicationId: string
  name: string
  dosage: number
  dosageUnit: string
  frequency: string
  startDate: Date
  endDate?: Date
  instructions?: string
}
output: Regimen
```

#### `regimen.pause`

Pause a regimen.

```typescript
// Mutation
input: {
  id: string
  reason?: string
}
output: Regimen
```

#### `regimen.resume`

Resume a paused regimen.

```typescript
// Mutation
input: { id: string }
output: Regimen
```

### Administration Router (`admin`)

#### `admin.record`

Record a medication administration.

```typescript
// Mutation
input: {
  regimenId: string
  animalId: string
  administeredAt: Date
  administeredBy: string
  dosageGiven?: number
  notes?: string
  skipped?: boolean
  skipReason?: string
}
output: Administration
```

#### `admin.history`

Get administration history.

```typescript
// Query
input: {
  animalId?: string
  regimenId?: string
  startDate?: Date
  endDate?: Date
  limit?: number
}
output: Administration[]
```

#### `admin.upcoming`

Get upcoming doses.

```typescript
// Query
input: {
  householdId: string
  days?: number // Default: 7
}
output: UpcomingDose[]
```

### Inventory Router (`inventory`)

#### `inventory.list`

Get household inventory.

```typescript
// Query
input: {
  householdId: string
  lowStockOnly?: boolean
}
output: InventoryItem[]
```

#### `inventory.add`

Add inventory item.

```typescript
// Mutation
input: {
  householdId: string
  medicationId: string
  quantity: number
  unit: string
  expiryDate?: Date
  lotNumber?: string
  location?: string
}
output: InventoryItem
```

#### `inventory.update`

Update inventory quantity.

```typescript
// Mutation
input: {
  id: string
  quantity: number
  reason?: string
}
output: InventoryItem
```

#### `inventory.checkExpiry`

Check for expiring medications.

```typescript
// Query
input: {
  householdId: string
  daysAhead?: number // Default: 30
}
output: ExpiringItem[]
```

### Medication Router (`medication`)

#### `medication.search`

Search medication catalog.

```typescript
// Query
input: {
  query?: string
  category?: string
  species?: string
}
output: Medication[]
```

#### `medication.get`

Get medication details.

```typescript
// Query
input: { id: string }
output: Medication | null
```

#### `medication.calculateDosage`

Calculate dosage for an animal.

```typescript
// Query
input: {
  medicationId: string
  animalWeight: number
  weightUnit: "kg" | "lbs"
  species: string
}
output: {
  recommendedDose: number
  unit: string
  frequency: string
  warnings?: string[]
}
```

### Insights Router (`insights`)

#### `insights.complianceRate`

Get medication compliance metrics.

```typescript
// Query
input: {
  householdId: string
  period?: "week" | "month" | "quarter"
}
output: {
  overallRate: number
  byAnimal: Record<string, number>
  byMedication: Record<string, number>
}
```

#### `insights.medicationPatterns`

Analyze medication usage patterns.

```typescript
// Query
input: {
  householdId: string
  startDate: Date
  endDate: Date
}
output: {
  peakTimes: string[]
  commonMedications: string[]
  trends: TrendData[]
}
```

### Reports Router (`reports`)

#### `reports.generate`

Generate reports.

```typescript
// Query
input: {
  type: "compliance" | "inventory" | "history" | "financial"
  householdId: string
  startDate: Date
  endDate: Date
  format?: "json" | "csv" | "pdf"
}
output: {
  data: any
  url?: string // For PDF/CSV
}
```

## Error Handling

All errors follow the tRPC error format:

```typescript
{
  "error": {
    "message": "Error message",
    "code": "UNAUTHORIZED" | "NOT_FOUND" | "BAD_REQUEST" | "INTERNAL_SERVER_ERROR",
    "data": {
      "code": "SPECIFIC_ERROR_CODE",
      "httpStatus": 400,
      "stack": "..." // Development only
    }
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` - Authentication required
- `FORBIDDEN` - Insufficient permissions
- `NOT_FOUND` - Resource not found
- `BAD_REQUEST` - Invalid input
- `CONFLICT` - Resource conflict
- `TOO_MANY_REQUESTS` - Rate limit exceeded
- `INTERNAL_SERVER_ERROR` - Server error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

### Limits by Operation Type

| Operation           | Limit       | Window   |
|---------------------|-------------|----------|
| Queries             | 100 req/min | 1 minute |
| Mutations           | 30 req/min  | 1 minute |
| Critical Operations | 10 req/min  | 1 minute |
| File Uploads        | 5 req/min   | 1 minute |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

## WebSocket Subscriptions

Real-time updates via tRPC subscriptions:

```typescript
// Subscribe to medication reminders
subscription: medication.reminders
input: { householdId: string }
output: Stream<Reminder>

// Subscribe to inventory alerts
subscription: inventory.alerts
input: { householdId: string }
output: Stream<Alert>
```

## Batch Operations

For bulk operations, use batch endpoints:

```typescript
// Batch create animals
mutation: animal.batchCreate
input: Animal[]
output: { created: Animal[], errors: Error[] }

// Batch update inventory
mutation: inventory.batchUpdate
input: InventoryUpdate[]
output: { updated: InventoryItem[], errors: Error[] }
```

## Pagination

List endpoints support pagination:

```typescript
input: {
  limit?: number  // Default: 20, Max: 100
  offset?: number // Default: 0
  cursor?: string // For cursor-based pagination
}

output: {
  items: T[]
  total: number
  hasMore: boolean
  nextCursor?: string
}
```

## Filtering & Sorting

Most list endpoints support filtering and sorting:

```typescript
input: {
  filter?: {
    field: string
    operator: "eq" | "gt" | "lt" | "contains" | "in"
    value: any
  }[]
  sort?: {
    field: string
    direction: "asc" | "desc"
  }[]
}
```

## Testing Endpoints

Use the tRPC panel in development:

```bash
# Development only
http://localhost:3000/api/trpc-panel
```

Or test with curl:

```bash
# Query
curl http://localhost:3000/api/trpc/animal.list?input={"householdId":"uuid"}

# Mutation
curl -X POST http://localhost:3000/api/trpc/animal.create \
  -H "Content-Type: application/json" \
  -d '{"input": {"name": "Buddy", "species": "dog"}}'
```

## SDK Usage

### TypeScript/JavaScript

```typescript
import { trpc } from '@/lib/trpc/client'

// Query
const animals = await trpc.animal.list.query({ 
  householdId: 'uuid' 
})

// Mutation
const newAnimal = await trpc.animal.create.mutate({
  name: 'Buddy',
  species: 'dog'
})

// With React Query
const { data, isLoading } = trpc.animal.list.useQuery({ 
  householdId: 'uuid' 
})
```

## API Versioning

Currently v1 (implicit). Future versions will use:

- URL versioning: `/api/v2/trpc`
- Header versioning: `X-API-Version: 2`

## Support

For API issues or questions:

1. Check error messages and codes
2. Review rate limit headers
3. Consult this documentation
4. Open GitHub issue with details