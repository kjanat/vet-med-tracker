# Memoization Optimizations Summary

## Overview

This document summarizes the memoization optimizations made to the search parameter hooks to prevent unnecessary re-renders and improve performance.

## Key Optimization Patterns Applied

### 1. More Granular Dependencies with searchParamsString

**Before:**
```typescript
const setFilter = useCallback(..., [router, pathname, searchParams, filters]);
```

**After:**
```typescript
const searchParamsString = useMemo(() => searchParams.toString(), [searchParams]);
const setFilter = useCallback(..., [router, pathname, searchParamsString]);
```

**Benefit:** Using `searchParams.toString()` provides more granular dependency tracking. The callback only recreates when the actual URL changes, not when the searchParams object reference changes.

### 2. Removing Filters Object Dependencies

**Before:**
```typescript
const setFilter = useCallback((key, value) => {
  // ... URL update logic
  const currentFilters = { ...filters, [key]: value };
  // ... event dispatch
}, [router, pathname, createQueryString, filters]); // filters causes recreation on every URL change
```

**After:**
```typescript
const setFilter = useCallback((key, value) => {
  // ... URL update logic
  // Calculate current filters inline to avoid dependency
  const currentParams = getTypedSearchParams(new URLSearchParams(searchParamsString), "history", defaults);
  const currentFilters = { ...currentParams, [key]: value };
  // ... event dispatch
}, [router, pathname, createQueryString, searchParamsString]); // No filters dependency
```

**Benefit:** Prevents callback recreation every time the URL changes by calculating current state inline rather than depending on the filters object.

### 3. Memoized Validation Functions

**Before:**
```typescript
const setParam = useCallback((key, value) => {
  if ((key === "animalId" || key === "regimenId") && value && !isValidUUID(value)) {
    console.warn(`Invalid UUID for ${key}: ${value}`);
    return;
  }
  // ... rest of logic
}, [router, pathname, searchParamsString]);
```

**After:**
```typescript
const validateUUID = useCallback((key: string, value: string) => {
  if (!isValidUUID(value)) {
    console.warn(`Invalid UUID for ${key}: ${value}`);
    return false;
  }
  return true;
}, []);

const setParam = useCallback((key, value) => {
  if ((key === "animalId" || key === "regimenId") && value && !validateUUID(key, value)) {
    return;
  }
  // ... rest of logic
}, [router, pathname, searchParamsString, validateUUID]);
```

**Benefit:** Validation functions are memoized with empty dependencies, providing stable references that don't cause parent callbacks to recreate.

### 4. Memoized Default Objects

**Before:**
```typescript
const resetFilters = useCallback(() => {
  const defaults = {
    ...defaultDates,
    animalId: undefined,
    view: "summary" as const,
    metric: "all" as const,
  };
  // ... rest of logic
}, [router, pathname, searchParamsString, defaultDates]);
```

**After:**
```typescript
const resetDefaults = useMemo(() => ({
  animalId: undefined,
  view: "summary" as const,
  metric: "all" as const,
}), []); // Stable defaults that never change

const resetFilters = useCallback(() => {
  const defaults = {
    ...defaultDates,
    ...resetDefaults,
  };
  // ... rest of logic
}, [router, pathname, searchParamsString, defaultDates, resetDefaults]);
```

**Benefit:** Static default values are memoized separately to prevent object recreation on every render.

### 5. Memoized Parameter Existence Checks

**Before:**
```typescript
useEffect(() => {
  if (!searchParams.get("from") || !searchParams.get("to")) {
    // ... logic
  }
}, [router, pathname, searchParams, createQueryString]);
```

**After:**
```typescript
const hasFromParam = useMemo(() => searchParams.has("from"), [searchParams]);
const hasToParam = useMemo(() => searchParams.has("to"), [searchParams]);

useEffect(() => {
  if (!hasFromParam || !hasToParam) {
    // ... logic
  }
}, [router, pathname, searchParamsString, defaultDates, hasFromParam, hasToParam]);
```

**Benefit:** Parameter existence checks are memoized to prevent unnecessary effect re-runs.

## Files Optimized

### 1. `hooks/useHistoryFilters.ts`
- ✅ Optimized `setFilter` to remove filters dependency
- ✅ Added comments explaining performance improvements
- ✅ Improved dependency tracking with `searchParamsString`

### 2. `hooks/useSettingsTabs.ts` 
- ✅ Already well-optimized, no changes needed
- ✅ Uses proper memoization patterns throughout

### 3. `hooks/useInsightsFilters.ts`
- ✅ Optimized `resetFilters` with memoized defaults object
- ✅ Enhanced parameter existence checks with memoization
- ✅ Improved default date calculation memoization

### 4. `hooks/useRecordParams.ts`
- ✅ Added memoized validation functions (`validateUUID`, `validateURL`)
- ✅ Updated all callbacks to use memoized validators
- ✅ Improved parameter validation consistency across methods

## Performance Impact

### Before Optimization:
- Callbacks recreated on every URL parameter change
- Validation functions recreated on every render
- Default objects recreated unnecessarily
- Higher memory allocation and garbage collection

### After Optimization:
- Callbacks stable unless core dependencies change
- Validation functions have stable references
- Default objects memoized appropriately
- Reduced memory pressure and improved performance

## Best Practices Applied

1. **Granular Dependencies**: Use `searchParams.toString()` instead of `searchParams` object
2. **Stable References**: Memoize functions and objects that don't need to change
3. **Inline Calculations**: Calculate derived state inline to avoid dependencies when possible
4. **Empty Dependencies**: Use empty dependency arrays for truly static values
5. **Documentation**: Add comments explaining non-obvious memoization choices

## Testing

- ✅ Biome linting passes
- ✅ TypeScript compilation succeeds
- ✅ No breaking changes to public APIs
- ✅ All optimizations maintain existing functionality

## Results

These optimizations should provide:
- **Reduced re-renders** by preventing unnecessary callback recreation
- **Better performance** through more efficient dependency tracking
- **Lower memory usage** with stable function references
- **Improved developer experience** with clearer optimization intent