# API Response Standards

This document outlines the standardized API response patterns used throughout the VetMed Tracker application to ensure consistency across all tRPC routers.

## Overview

All API responses follow a standardized format to provide consistent error handling, metadata, and data structures. This improves client-side error handling and makes the API more predictable.

## Response Types

### 1. Success Response

```typescript
interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    version?: string;
    requestId?: string;
  };
}
```

### 2. CRUD Operation Response

```typescript
interface CrudOperationResponse<T> {
  success: true;
  data: T;
  operation: {
    type: "CREATE" | "READ" | "UPDATE" | "DELETE";
    resource: string;
    affected: number;
  };
  meta?: {
    timestamp: string;
    version?: string;
    requestId?: string;
  };
}
```

### 3. Paginated Response

```typescript
interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  meta?: {
    timestamp: string;
    version?: string;
    requestId?: string;
  };
}
```

### 4. Bulk Operation Response

```typescript
interface BulkOperationResponse<T> {
  success: true;
  data: T[];
  operation: {
    type: "BULK_CREATE" | "BULK_UPDATE" | "BULK_DELETE";
    resource: string;
    processed: number;
    succeeded: number;
    failed: number;
    errors?: Array<{ index: number; error: string }>;
  };
  meta?: {
    timestamp: string;
    version?: string;
    requestId?: string;
  };
}
```

## Usage Guidelines

### Using ResponseHelpers

The `ResponseHelpers` utility provides convenient methods for creating standardized responses:

```typescript
// For create operations
return ResponseHelpers.created(newAnimal, "animal").data;

// For update operations
return ResponseHelpers.updated(updatedAnimal, "animal").data;

// For delete operations
return ResponseHelpers.deleted(deletedAnimal, "animal").data;

// For read operations
return ResponseHelpers.retrieved(animal).data;

// For list operations
return ResponseHelpers.list(animals).data;
```

### Database Operations

Use `ResponseHelpers.validateDbResult()` to validate database operation results:

```typescript
const result = await ctx.db.insert(animals).values(data).returning();
const animal = ResponseHelpers.validateDbResult(result, "create", "animal");
return ResponseHelpers.created(animal, "animal").data;
```

### Error Handling

Use `ApiResponse` static methods for consistent error responses:

```typescript
// Not found error
ApiResponse.notFound("animal", animalId);

// Validation error
ApiResponse.validationError("Invalid email format", { field: "email" });

// Unauthorized error
ApiResponse.unauthorized("Access denied");

// Bad request error
ApiResponse.badRequest("Missing required field");
```

## Implementation Pattern

Here's the recommended pattern for implementing tRPC procedures:

```typescript
// Create operation
create: householdProcedure
  .input(createSchema)
  .mutation(async ({ ctx, input }) => {
    try {
      const result = await ctx.db
        .insert(table)
        .values(data)
        .returning();

      const resource = ResponseHelpers.validateDbResult(result, "create", "resource");

      // Audit logging if needed
      await auditOperation(/* ... */);

      return ResponseHelpers.created(resource, "resource").data;
    } catch (error) {
      // Error logging if needed
      await logError(/* ... */);
      throw error; // Let tRPC handle the error response
    }
  }),

// List operation
list: householdProcedure
  .input(listSchema.optional())
  .query(async ({ ctx, input }) => {
    const resources = await ctx.db
      .select()
      .from(table)
      .where(/* conditions */);

    return ResponseHelpers.list(resources).data;
  }),
```

## Migration Strategy

### Existing Endpoints

For existing endpoints that don't follow this pattern:

1. **Immediate**: Add the ResponseHelpers import
2. **Gradual**: Update return statements to use ResponseHelpers
3. **Validate**: Ensure client code can handle both old and new formats during transition
4. **Complete**: Remove old format once all clients are updated

### Client-Side Considerations

When updating client code to work with the new response format:

```typescript
// Old way (direct data)
const animal = await trpc.animals.create.mutate(data);

// New way (with response wrapper)
const animal = await trpc.animals.create.mutate(data);
// Note: The .data extraction is handled by ResponseHelpers in the router
```

## Benefits

1. **Consistency**: All API responses follow the same pattern
2. **Error Handling**: Standardized error responses improve client error handling
3. **Metadata**: Built-in support for timestamps and request tracking
4. **Debugging**: Consistent structure makes debugging easier
5. **Documentation**: Self-documenting API responses
6. **Future-Proofing**: Easy to add new fields without breaking changes

## Examples

### Creating an Animal

```typescript
// Request
const animal = await trpc.animals.create.mutate({
  name: "Buddy",
  species: "Dog",
  // ... other fields
});

// Response (handled internally)
{
  success: true,
  data: {
    id: "uuid",
    name: "Buddy",
    species: "Dog",
    // ... other fields
  },
  operation: {
    type: "CREATE",
    resource: "animal",
    affected: 1
  },
  meta: {
    timestamp: "2023-12-07T10:30:00Z"
  }
}
```

### Listing Animals

```typescript
// Request
const animals = await trpc.animals.list.query();

// Response (handled internally)
{
  success: true,
  data: [
    { id: "1", name: "Buddy", species: "Dog" },
    { id: "2", name: "Whiskers", species: "Cat" }
  ],
  meta: {
    timestamp: "2023-12-07T10:30:00Z"
  }
}
```

## Error Responses

Errors are handled by tRPC's built-in error system and follow this pattern:

```typescript
{
  error: {
    code: "NOT_FOUND",
    message: "Animal with ID abc-123 not found",
    data: {
      code: "NOT_FOUND",
      httpStatus: 404,
      stack: "...", // in development only
      path: "animals.get"
    }
  }
}
```

## Testing

When writing tests for endpoints using the new response format:

```typescript
it("should create an animal", async () => {
  const animal = await caller.animals.create({
    name: "Test Animal",
    species: "Dog"
  });

  expect(animal).toMatchObject({
    name: "Test Animal",
    species: "Dog"
  });
  expect(animal.id).toBeDefined();
});
```
