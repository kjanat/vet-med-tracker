# Bulk Selection System

A comprehensive, reusable bulk selection infrastructure for the VetMed Tracker application.

## Features

- ✅ **Context-based state management** - Centralized selection state using React Context
- ✅ **Individual item selection** - Checkbox for each table row
- ✅ **Select all/none functionality** - Header checkbox with indeterminate state
- ✅ **Floating action bar** - Appears when items are selected with smooth animations
- ✅ **Bulk actions** - Delete, export, and custom actions
- ✅ **Mobile responsive** - Touch-friendly interface
- ✅ **Accessibility compliant** - ARIA labels, keyboard navigation
- ✅ **TypeScript support** - Full type safety
- ✅ **Integration helpers** - Easy to retrofit existing components

## Components

### BulkSelectionProvider

Context provider that manages selection state across components.

```tsx
import { BulkSelectionProvider } from "@/components/providers/bulk-selection-provider";

function App() {
  return (
    <BulkSelectionProvider>
      <YourTableComponent />
    </BulkSelectionProvider>
  );
}
```

### BulkSelectionCheckbox

Individual checkbox for each table row.

```tsx
import { BulkSelectionCheckbox } from "@/components/ui/bulk-selection-checkbox";

<BulkSelectionCheckbox
  id={item.id}
  aria-label={`Select ${item.name}`}
/>
```

### SelectAllCheckbox

Header checkbox for select/deselect all functionality.

```tsx
import { SelectAllCheckbox } from "@/components/ui/select-all-checkbox";

<SelectAllCheckbox aria-label="Select all items" />
```

### FloatingActionBar

Action bar that appears when items are selected.

```tsx
import { FloatingActionBar } from "@/components/ui/floating-action-bar";

<FloatingActionBar
  onDelete={handleBulkDelete}
  onExport={handleBulkExport}
  customActions={[
    {
      icon: Archive,
      label: "Archive",
      onClick: handleBulkArchive,
      variant: "outline",
    },
  ]}
/>
```

### BulkSelectionTable

Complete table component with built-in bulk selection.

```tsx
import { BulkSelectionTable } from "@/components/ui/bulk-selection-table";

<BulkSelectionTable
  data={items}
  columns={columns}
  getItemId={(item) => item.id}
  getItemLabel={(item) => item.name}
  onDelete={handleBulkDelete}
  onExport={handleBulkExport}
/>
```

## Hooks

### useBulkSelection

Core hook for accessing bulk selection state.

```tsx
import { useBulkSelection } from "@/components/providers/bulk-selection-provider";

const {
  selectedIds,
  selectionCount,
  toggle,
  selectAll,
  clearSelection,
  isSelected,
  isAllSelected,
  isPartiallySelected,
} = useBulkSelection();
```

### useBulkSelectionIntegration

Helper hook for integrating with existing components.

```tsx
import { useBulkSelectionIntegration } from "@/hooks/shared/use-bulk-selection-integration";

const { selectedItems, selectionCount } = useBulkSelectionIntegration({
  data: items,
  getItemId: (item) => item.id,
  onSelectionChange: (selected, ids) => console.log(selected),
});
```

## Quick Start

### Option 1: Complete Table Solution

Use `BulkSelectionTable` for new tables:

```tsx
import { BulkSelectionTable } from "@/components/ui/bulk-selection-table";

const columns = [
  {
    key: "name",
    title: "Name",
    render: (item) => <div>{item.name}</div>,
  },
  // ... more columns
];

<BulkSelectionTable
  data={items}
  columns={columns}
  getItemId={(item) => item.id}
  onDelete={handleBulkDelete}
  onExport={handleBulkExport}
/>
```

### Option 2: Retrofit Existing Table

Add bulk selection to existing tables:

```tsx
import { BulkSelectionProvider } from "@/components/providers/bulk-selection-provider";
import { BulkSelectionCheckbox } from "@/components/ui/bulk-selection-checkbox";
import { SelectAllCheckbox } from "@/components/ui/select-all-checkbox";
import { FloatingActionBar } from "@/components/ui/floating-action-bar";
import { useBulkSelectionIntegration } from "@/hooks/shared/use-bulk-selection-integration";

function ExistingTable({ data }) {
  const { selectedItems } = useBulkSelectionIntegration({
    data,
    getItemId: (item) => item.id,
  });

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><SelectAllCheckbox /></TableHead>
            {/* existing headers */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <BulkSelectionCheckbox id={item.id} />
              </TableCell>
              {/* existing cells */}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <FloatingActionBar onDelete={handleDelete} />
    </div>
  );
}

// Wrap with provider
export function EnhancedTable(props) {
  return (
    <BulkSelectionProvider>
      <ExistingTable {...props} />
    </BulkSelectionProvider>
  );
}
```

## Examples

See these files for complete examples:

- [`bulk-animal-table.tsx`](../settings/animals/bulk-animal-table.tsx) - Real-world implementation
- [`bulk-selection-demo.tsx`](../examples/bulk-selection-demo.tsx) - Interactive demo
- [`bulk-selection-retrofit-example.tsx`](../examples/bulk-selection-retrofit-example.tsx) - Retrofit guide

## API Reference

### BulkSelectionContextType

```typescript
interface BulkSelectionContextType {
  selectedIds: Set<string>;              // Currently selected item IDs
  toggle: (id: string) => void;          // Toggle selection of an item
  selectAll: () => void;                 // Select all available items
  clearSelection: () => void;            // Clear all selections
  isSelected: (id: string) => boolean;   // Check if item is selected
  selectionCount: number;                // Number of selected items
  availableIds: string[];                // All available item IDs
  setAvailableIds: (ids: string[]) => void; // Update available IDs
  isAllSelected: boolean;                // All items selected
  isPartiallySelected: boolean;          // Some items selected
}
```

### BulkSelectionColumn

```typescript
interface BulkSelectionColumn<T> {
  key: keyof T | "actions";              // Column data key
  title: string;                         // Column header text
  render?: (item: T, index: number) => ReactNode; // Custom render function
  className?: string;                    // Column CSS classes
  sortable?: boolean;                    // Enable sorting (future)
}
```

### FloatingActionBar Props

```typescript
interface FloatingActionBarProps {
  onDelete?: (selectedIds: string[]) => void;
  onExport?: (selectedIds: string[]) => void;
  customActions?: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: (selectedIds: string[]) => void;
    variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  }>;
  className?: string;
}
```

## Styling

The components use Tailwind CSS classes and follow the existing design system. Key styling features:

- **Selected row highlighting** - `data-[state=selected]:bg-muted`
- **Smooth animations** - `animate-in slide-in-from-bottom-2`
- **Mobile responsive** - Hidden text on small screens
- **Consistent spacing** - Follows existing table patterns

## Accessibility

- **ARIA labels** - All interactive elements have appropriate labels
- **Keyboard navigation** - Full keyboard support
- **Screen reader support** - Proper semantic markup
- **Focus management** - Visible focus indicators
- **Selection announcements** - Screen reader feedback

## Performance

- **Optimized re-renders** - Minimal re-renders with React.memo patterns
- **Efficient state updates** - Set-based selection for O(1) lookups
- **Memory conscious** - Automatic cleanup of stale selections
- **Batch operations** - Bulk actions process multiple items efficiently

## Best Practices

1. **Wrap with provider** - Always wrap consuming components with `BulkSelectionProvider`
2. **Unique IDs** - Ensure item IDs are unique and stable
3. **Clear feedback** - Provide clear visual feedback for selections
4. **Confirmation dialogs** - Always confirm destructive bulk actions
5. **Progress indicators** - Show progress for long-running bulk operations
6. **Error handling** - Handle partial failures gracefully
7. **Undo functionality** - Consider implementing undo for destructive actions

## Migration Guide

To add bulk selection to existing tables:

1. **Wrap with provider**
2. **Add selection column** to table header
3. **Add checkbox cell** to each row
4. **Add floating action bar**
5. **Implement bulk actions**
6. **Test accessibility**

Total development time: ~30 minutes for simple tables, ~1-2 hours for complex tables with custom actions.