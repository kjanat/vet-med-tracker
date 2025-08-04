# Type-Safe Search Parameters System

This module provides a comprehensive type-safe query parameter system for consistent URL state management across the VetMed Tracker application.

## Overview

The search parameters system offers:
- **Type Safety**: Full TypeScript support with validation
- **Validation**: Zod schemas ensure parameter validity
- **Developer Experience**: Autocomplete and error checking
- **Consistency**: Unified API across all pages
- **Performance**: Efficient parameter parsing and updates

## Quick Start

### Basic Usage

```typescript
import { 
  createTypedQueryString, 
  getTypedSearchParams,
  type HistorySearchParams 
} from '@/lib/search-params';

// In a component
const searchParams = useSearchParams();

// Get typed parameters with defaults
const params = getTypedSearchParams<HistorySearchParams>(
  new URLSearchParams(searchParams.toString()),
  'history',
  { type: 'all', view: 'list' }
);

// Create query string
const queryString = createTypedQueryString({
  animalId: '123',
  type: 'scheduled'
});
```

### Using Custom Hooks

```typescript
import { useHistoryFilters } from '@/hooks/useHistoryFilters';
import { useSettingsTabs } from '@/hooks/useSettingsTabs';
import { useInsightsFilters } from '@/hooks/useInsightsFilters';
import { useRecordParams } from '@/hooks/useRecordParams';

// History page
const { filters, setFilter, setFilters } = useHistoryFilters();

// Settings page
const { activeTab, setActiveTab } = useSettingsTabs();

// Insights page
const { filters, setFilter, resetFilters } = useInsightsFilters();

// Record page
const { params, setSelectedItems, isReadyToRecord } = useRecordParams();
```

## Type Definitions

### HistorySearchParams
Used for history page filtering:
```typescript
interface HistorySearchParams {
  animalId?: string;        // UUID
  regimenId?: string;       // UUID
  caregiverId?: string;     // UUID
  type?: "all" | "scheduled" | "prn";
  status?: "on-time" | "late" | "missed" | "all";
  view?: "list" | "calendar";
  from?: string;           // ISO date (YYYY-MM-DD)
  to?: string;            // ISO date (YYYY-MM-DD)
}
```

### SettingsSearchParams
Used for settings page tabs:
```typescript
interface SettingsSearchParams {
  tab?: "data" | "preferences" | "notifications" | "household";
}
```

### InsightsSearchParams
Used for insights page:
```typescript
interface InsightsSearchParams {
  from?: string;           // ISO date
  to?: string;            // ISO date
  animalId?: string;       // UUID
  view?: "summary" | "detailed" | "charts";
  metric?: "compliance" | "timing" | "inventory" | "all";
}
```

### RecordSearchParams
Used for record page:
```typescript
interface RecordSearchParams {
  animalId?: string;       // UUID
  regimenId?: string;      // UUID
  returnTo?: string;       // URL
  mode?: "quick" | "detailed";
}
```

## API Reference

### Core Functions

#### `createTypedQueryString<T>(params, currentParams?)`
Creates a type-safe query string from parameters.

**Parameters:**
- `params`: Object with parameter values
- `currentParams`: Optional existing URLSearchParams to merge with

**Returns:** Query string without leading '?'

#### `parseTypedSearchParams<T>(searchParams, pageType)`
Parses search parameters with type safety and validation.

**Parameters:**
- `searchParams`: URLSearchParams to parse
- `pageType`: Page type for validation ('history' | 'settings' | 'insights' | 'record')

**Returns:** Parsed and validated parameters

#### `updateSearchParams<T>(currentParams, updates)`
Updates specific search parameters while preserving others.

#### `getTypedSearchParams<T>(searchParams, pageType, defaults?)`
Gets typed search parameters with default values.

### Validation Functions

#### Type Guards
- `isValidHistoryType(value)`: Validates history type values
- `isValidHistoryStatus(value)`: Validates history status values
- `isValidHistoryView(value)`: Validates history view values
- `isValidSettingsTab(value)`: Validates settings tab values

#### Format Validators
- `isValidISODate(value)`: Validates ISO date format (YYYY-MM-DD)
- `isValidUUID(value)`: Validates UUID format

### Utility Functions

#### `hasSearchParamValues(searchParams, checks)`
Checks if search parameters have specific values.

#### `removeSearchParams(currentParams, keysToRemove)`
Removes specified parameters from query string.

## Custom Hooks

### useHistoryFilters()
Manages history page filters with type safety.

```typescript
const { filters, setFilter, setFilters } = useHistoryFilters();

// Set single filter
setFilter('type', 'scheduled');

// Set multiple filters
setFilters({ 
  animalId: '123', 
  type: 'scheduled',
  from: '2024-01-01' 
});
```

### useSettingsTabs()
Manages settings page tab navigation.

```typescript
const { activeTab, setActiveTab } = useSettingsTabs();

setActiveTab('preferences');
```

### useInsightsFilters()
Manages insights page filters with date range support.

```typescript
const { filters, setFilter, resetFilters } = useInsightsFilters();

// Automatically sets default date ranges
// Provides reset functionality
resetFilters();
```

### useRecordParams()
Manages record page parameters with validation.

```typescript
const { params, setSelectedItems, isReadyToRecord, navigateToReturn } = useRecordParams();

// Set animal and regimen
setSelectedItems('animal-id', 'regimen-id');

// Check if ready to record
if (isReadyToRecord()) {
  // Proceed with recording
}

// Navigate back after recording
navigateToReturn('/dashboard');
```

### useTypedSearchParams()
Generic hook for any page type.

```typescript
const {
  params,
  setParam,
  setParams,
  removeParams,
  resetParams
} = useTypedSearchParams<HistorySearchParams>('history', {
  type: 'all',
  view: 'list'
});
```

## Best Practices

### 1. Always Use Type-Safe Hooks
```typescript
// ✅ Good - Type-safe with validation
const { filters, setFilter } = useHistoryFilters();

// ❌ Avoid - Manual URLSearchParams manipulation
const searchParams = useSearchParams();
const animalId = searchParams.get('animalId'); // string | null
```

### 2. Provide Default Values
```typescript
// ✅ Good - Consistent behavior
const params = getTypedSearchParams<HistorySearchParams>(
  searchParams,
  'history',
  { type: 'all', view: 'list' }
);

// ❌ Avoid - Undefined values
const params = parseTypedSearchParams<HistorySearchParams>(searchParams, 'history');
```

### 3. Use Validation
```typescript
// ✅ Good - Validated before setting
if (isValidHistoryType(userInput)) {
  setFilter('type', userInput);
}

// ❌ Avoid - No validation
setFilter('type', userInput as any);
```

### 4. Handle URL Construction
```typescript
// ✅ Good - Type-safe URL building
const url = createUrlWithParams({ animalId: '123', type: 'scheduled' });

// ❌ Avoid - Manual URL building
const url = `/history?animalId=123&type=scheduled`;
```

## Migration Guide

### From Manual URLSearchParams

**Before:**
```typescript
const searchParams = useSearchParams();
const animalId = searchParams.get('animalId');
const type = searchParams.get('type') as 'all' | 'scheduled' | 'prn' || 'all';

const updateUrl = useCallback((newType: string) => {
  const params = new URLSearchParams(searchParams.toString());
  params.set('type', newType);
  router.push(`${pathname}?${params.toString()}`);
}, [searchParams, pathname, router]);
```

**After:**
```typescript
const { filters, setFilter } = useHistoryFilters();

// Automatically typed and validated
const { animalId, type } = filters;

// Type-safe setter with validation
setFilter('type', 'scheduled');
```

### From Existing Hooks

Update existing hooks to use the new system:

1. Import the type-safe utilities
2. Replace manual parameter parsing with `getTypedSearchParams`
3. Replace manual URL building with `updateSearchParams`
4. Add validation where appropriate

## Error Handling

The system includes comprehensive error handling:

### Validation Errors
```typescript
// Invalid parameters are logged in development
// and fall back to empty objects in production
const params = parseTypedSearchParams(searchParams, 'history');
// Logs validation errors if invalid, returns {} on failure
```

### Type Safety
```typescript
// TypeScript will catch invalid parameter names
setFilter('invalidKey', 'value'); // TS Error

// And invalid values
setFilter('type', 'invalid'); // TS Error
```

### Runtime Validation
```typescript
// UUIDs are validated at runtime
setSelectedItems('invalid-uuid', 'regimen-id'); 
// Logs warning and ignores invalid UUID

// Dates are validated
setFilter('from', 'invalid-date');
// Validation schema rejects invalid format
```

## Performance Considerations

- Parameters are memoized in hooks to prevent unnecessary re-renders
- Validation schemas are cached and reused
- URL updates use `scroll: false` to prevent layout shifts
- Batch parameter updates when possible using `setFilters` instead of multiple `setFilter` calls

## Testing

The system includes comprehensive tests for:
- Parameter parsing and validation
- Hook behavior and state management
- Type guards and utility functions
- Error handling and edge cases

Run tests with:
```bash
pnpm test hooks/__tests__/useHistoryFilters.test.tsx
```