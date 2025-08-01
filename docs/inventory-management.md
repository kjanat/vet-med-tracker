# Inventory Management Implementation

This document describes the implementation of the inventory management feature in the VetMed Tracker application.

## Overview

The inventory management system allows users to track medications and supplies for their animals. It provides full CRUD (Create, Read, Update, Delete) operations with offline support and real-time updates.

## Architecture

### Database Schema

The inventory system uses two main tables:

1. **`vetmed_medication_catalog`** - Shared reference data for medications
   - Generic and brand names
   - Strength, route, and form information
   - Common dosing and warnings

2. **`vetmed_inventory_items`** - Household-specific medication stock
   - Links to medication catalog
   - Tracks lot numbers, expiration dates, and quantities
   - Supports assignment to specific animals
   - Soft delete for audit trail

### API Layer (tRPC)

The inventory router (`server/api/routers/inventory.ts`) provides the following procedures:

#### Queries
- **`list`** - Fetch inventory items with filtering options
  - Filter by medication, animal, expiration status, in-use status
  - Returns enriched data with medication details

- **`getSources`** - Get available sources for a specific medication
  - Used when recording administrations
  - Filters by medication name and expiration

#### Mutations
- **`create`** - Add new inventory item
- **`update`** - Modify existing item details
- **`setInUse`** - Toggle in-use status (tracks when opened)
- **`delete`** - Soft delete (sets deletedAt timestamp)
- **`assignToAnimal`** - Assign/unassign item to specific animal

### Frontend Components

#### Pages
- **`app/(authed)/inventory/page.tsx`** - Main inventory list page
  - Real-time data fetching with tRPC
  - Search and filtering capabilities
  - Alert system for expiring/low stock items
  - Responsive design for mobile/desktop

#### Components
- **`InventoryCard`** - Display individual inventory items
  - Shows medication details, quantity, expiration
  - Action menu for operations
  - Visual indicators for status

- **`AddItemModal`** - Form for adding new items
  - Medication selection (TODO: integrate with catalog)
  - Expiration date and storage location
  - Quantity tracking

- **`EditItemModal`** - Form for editing existing items
  - Update all item properties
  - Delete functionality with confirmation

- **`AssignModal`** - Assign item to specific animal
  - Animal selection from household
  - Unassign option

## Key Features

### 1. Offline Support
- Uses `useOfflineQueue` hook for resilient operations
- Idempotency keys prevent duplicate operations
- Automatic sync when connection restored

### 2. Real-time Updates
- tRPC mutations invalidate queries on success
- Optimistic updates for better UX (TODO)
- Loading states during operations

### 3. Smart Alerts
- **Expiring Soon**: Items expiring within 14 days
- **Low Stock**: Based on usage patterns (currently mocked)
- **Expired**: Items past expiration date

### 4. Inventory Tracking
- **In-Use Status**: Track when medications are opened
- **Assignment**: Link items to specific animals
- **Storage Location**: Room temp, fridge, freezer, controlled
- **Lot Tracking**: For recall management

## User Flows

### Adding Inventory
1. User clicks "Add Item" button
2. Fills out form with medication details
3. System creates item with initial quantity = remaining quantity
4. Item appears in list immediately

### Recording Usage
1. When recording administration, system shows available sources
2. User selects source (inventory item)
3. System decrements quantity (TODO: implement)
4. Low stock alerts appear when threshold reached

### Managing Items
1. Click item menu (three dots)
2. Options:
   - **Use This/Stop Using**: Toggle in-use status
   - **Assign**: Link to specific animal
   - **Details**: Edit or delete item

## Error Handling

- Network errors queue operations for offline sync
- Form validation prevents invalid data entry
- Confirmation dialogs for destructive actions
- User-friendly error messages with retry options

## Testing

### E2E Tests (`tests/e2e/inventory-crud.spec.ts`)
- Page navigation and loading
- CRUD operations through UI
- Alert system verification
- Search and filter functionality

### Integration Tests (`tests/integration/inventory-crud.test.ts`)
- tRPC router logic
- Database operations
- Error scenarios
- Data transformations

## Future Enhancements

1. **Medication Catalog Integration**
   - Search/browse medication database
   - Auto-populate medication details
   - Barcode scanning support

2. **Usage Tracking**
   - Automatic quantity updates from administrations
   - Accurate days-of-supply calculations
   - Usage history and trends

3. **Advanced Features**
   - Batch operations
   - Import/export functionality
   - Expiration reminders
   - Purchase history tracking
   - Multi-location inventory

4. **Reporting**
   - Inventory valuation
   - Usage reports
   - Expiration forecasts
   - Compliance tracking

## Security Considerations

- Household-based data isolation
- Role-based access control (via tRPC middleware)
- Soft deletes maintain audit trail
- No cross-household data leakage

## Performance Optimizations

- Indexed database queries
- Pagination for large inventories (TODO)
- Lazy loading of details
- Efficient data transformations