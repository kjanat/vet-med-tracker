# Timestamp Migration Strategy - Phased Approach

## Problem Overview

The vetmed-tracker project needed to convert from string-based timestamps to native Date objects throughout the codebase. A wholesale conversion would break hundreds of files simultaneously, making debugging and validation impossible.

## Strategic Approach: Vertical Slice Migration

### Core Principle

Instead of horizontal changes (updating all interfaces, then all services, then all components), we use **vertical slice migration** - completing one domain end-to-end before moving to the next.

### Benefits of Vertical Slice Approach

1. **Bounded Risk**: Failures are contained to one domain
2. **Incremental Validation**: Each phase can be tested independently  
3. **Learning Application**: Insights from early phases improve later phases
4. **Rollback Capability**: Each phase can be reversed without affecting others
5. **Continuous Integration**: The application remains functional throughout migration

## Phase Sequence Strategy

### Phase 1: Animal + Administration Data ✅ COMPLETE

**Rationale**: Core domain with clear boundaries, foundational for other features
**Complexity**: Medium (interconnected data, multiple services)
**Dependencies**: Relatively self-contained
**Status**: ✅ Complete

### Phase 2: Households Domain 📋 PLANNED

**Rationale**: Simple domain with fewer dependencies, good learning ground
**Complexity**: Low (straightforward CRUD operations)
**Dependencies**: Minimal interdependencies
**Files Expected**:

- Household interfaces/types
- Household tRPC router
- Household service layers

### Phase 3: Notifications Domain 📋 PLANNED  

**Rationale**: Moderate complexity with scheduling features
**Complexity**: Medium-High (scheduling, state management, multiple timestamp types)
**Dependencies**: May depend on animal/regimen data from Phase 1
**Files Expected**:

- Notification interfaces
- Notification scheduler service
- Notification router
- Push notification integrations

### Phase 4: Inventory Domain 📋 PLANNED

**Rationale**: Business domain with expiration date handling
**Complexity**: Medium (date calculations, expiration logic)
**Dependencies**: May integrate with administration records

### Phase 5: Reporting/Analytics Domain 📋 PLANNED

**Rationale**: Complex aggregations and time-series data
**Complexity**: High (date ranges, aggregations, filtering)
**Dependencies**: Depends on all previous domains

## Implementation Pattern (Template from Phase 1)

### Step 1: Database Schema Verification

- Confirm Drizzle schema uses `{ mode: "date", withTimezone: true }`
- Verify all timestamp columns are configured correctly

### Step 2: Interface Updates

- Update TypeScript interfaces to expect Date objects
- Change string timestamps to Date | null types
- Focus on API response types and service layer interfaces

### Step 3: Service Layer Transformation

- Remove `.toISOString()` calls in database mutations
- Remove string-to-Date parsing in transformation services
- Update date filtering to work with Date objects directly

### Step 4: tRPC Router Updates

- Fix mutation operations to use Date objects
- Update query filtering to work with Date objects
- Remove manual date string conversions

### Step 5: Validation & Testing

- Verify type consistency across the vertical slice
- Test CRUD operations in the affected domain
- Confirm no regression in functionality

## Technical Guidelines

### DO: Native Date Objects

```typescript
// ✅ Correct - use Date objects
interface UserRecord {
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

// ✅ Correct - Drizzle operations with Date objects  
.set({ updatedAt: new Date() })
.where(gte(table.createdAt, startDate)) // startDate is Date object
```

### DON'T: String Conversions

```typescript
// ❌ Avoid - manual string conversions
interface UserRecord {
  createdAt: Date;
  updatedAt: Date;
}

// ❌ Avoid - unnecessary .toISOString() calls
.set({ updatedAt: new Date().toISOString() })
.where(gte(table.createdAt, startDate.toISOString()))
```

### Pattern: Date Filtering

```typescript
// ✅ Correct pattern for date filtering
const whereClauses = [];
if (input.startDate) {
  whereClauses.push(gte(table.createdAt, input.startDate)); // Date object
}
if (input.endDate) {
  whereClauses.push(lt(table.createdAt, input.endDate)); // Date object
}
```

## Risk Mitigation

### Phase Isolation

- Each phase is completely independent
- No cross-phase dependencies during migration
- Failed phases can be rolled back without affecting completed phases

### Validation Strategy

- Run TypeScript build after each phase
- Test affected endpoints manually
- Verify no functional regressions

### Emergency Rollback

Each phase can be independently rolled back by:

1. Reverting interface changes
2. Restoring string conversion logic
3. Re-adding .toISOString() calls

## Success Metrics

- **Type Safety**: Reduction in TypeScript timestamp-related errors
- **Code Quality**: Elimination of redundant date conversion code
- **Performance**: Reduced parsing overhead
- **Maintainability**: Consistent Date object usage across domains

## Long-term Vision

After all phases complete:

- Native Date objects throughout the application
- Consistent timezone handling via Drizzle
- Simplified date arithmetic and comparisons
- Improved type safety and developer experience
