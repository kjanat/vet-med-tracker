# Medication Catalog Search Implementation

**Duration**: 1 day  
**Priority**: HIGH  
**Dependencies**: tRPC setup, Medication catalog seeded in database

## Overview

This document describes the implementation of medication search functionality to replace the current hardcoded medication ID in the inventory form. This feature allows users to search and select medications from the catalog when adding inventory items.

## Problem Statement

Currently, the inventory form uses a hardcoded medication ID (`23438f79-d3b9-4b3e-a1e9-a63294dd7595`) which:
- Limits users to adding only one type of medication (Carprofen/Rimadyl)
- Breaks when the hardcoded ID doesn't exist in the database
- Prevents proper inventory management across different medications

## Solution Architecture

### Components Structure

```
components/
├── medication/
│   ├── medication-search.tsx         # Main search component
│   ├── medication-search-dialog.tsx   # Modal version for forms
│   └── medication-search-item.tsx     # Individual search result
└── providers/
    └── inventory-form-provider.tsx    # Update to use search
```

### Data Flow

1. User opens inventory form
2. Clicks on medication field to open search dialog
3. Types medication name (generic or brand)
4. tRPC query searches medication catalog
5. User selects medication from results
6. Form receives medication ID and details
7. Form submission includes selected medication ID

## Implementation Details

### 1. tRPC Router Enhancement

Add medication search endpoint to existing tRPC router:

```typescript
// server/trpc/routers/medication.ts
export const medicationRouter = router({
  search: protectedProcedure
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(50).default(10),
    }))
    .query(async ({ ctx, input }) => {
      const { query, limit } = input;
      
      const medications = await ctx.db.medicationCatalog.findMany({
        where: {
          OR: [
            { genericName: { contains: query, mode: 'insensitive' } },
            { brandName: { contains: query, mode: 'insensitive' } },
          ],
        },
        take: limit,
        orderBy: [
          { genericName: 'asc' },
          { brandName: 'asc' },
        ],
      });
      
      return medications;
    }),
    
  getById: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const medication = await ctx.db.medicationCatalog.findUnique({
        where: { id: input.id },
      });
      
      if (!medication) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Medication not found',
        });
      }
      
      return medication;
    }),
});
```

### 2. Medication Search Component

```typescript
// components/medication/medication-search.tsx
interface MedicationSearchProps {
  value?: string; // medication ID
  onChange: (medicationId: string, medication: MedicationCatalog) => void;
  placeholder?: string;
  required?: boolean;
}

export function MedicationSearch({ 
  value, 
  onChange, 
  placeholder = "Search medications...",
  required = false 
}: MedicationSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  
  const { data: searchResults, isLoading } = trpc.medication.search.useQuery(
    { query },
    { 
      enabled: query.length > 0,
      debounce: 300,
    }
  );
  
  const { data: selectedMedication } = trpc.medication.getById.useQuery(
    { id: value! },
    { enabled: !!value }
  );
  
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select medication"
          className="w-full justify-between"
        >
          {selectedMedication ? (
            <span className="truncate">
              {selectedMedication.genericName} 
              {selectedMedication.brandName && ` (${selectedMedication.brandName})`}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput 
            placeholder="Search by generic or brand name..." 
            value={query}
            onValueChange={setQuery}
          />
          <CommandEmpty>No medications found.</CommandEmpty>
          <CommandGroup>
            {isLoading && (
              <CommandItem disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </CommandItem>
            )}
            {searchResults?.map((medication) => (
              <CommandItem
                key={medication.id}
                value={medication.id}
                onSelect={() => {
                  onChange(medication.id, medication);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === medication.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{medication.genericName}</span>
                  {medication.brandName && (
                    <span className="text-sm text-muted-foreground">
                      {medication.brandName} • {medication.form} • {medication.route}
                    </span>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
```

### 3. Update Inventory Form

Update the add item modal to use the medication search:

```typescript
// components/inventory/add-item-modal.tsx
export function AddItemModal({ open, onOpenChange, onAdd }: AddItemModalProps) {
  const form = useForm<InventoryFormData>({
    defaultValues: {
      medicationId: "",
      // ... other fields
    },
  });
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={form.handleSubmit(onAdd)}>
          {/* ... other fields ... */}
          
          <div className="space-y-2">
            <Label htmlFor="medication">
              Medication <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={form.control}
              name="medicationId"
              rules={{ required: "Please select a medication" }}
              render={({ field }) => (
                <MedicationSearch
                  value={field.value}
                  onChange={(id, medication) => {
                    field.onChange(id);
                    // Auto-fill form fields from medication data
                    form.setValue("form", medication.form);
                    form.setValue("route", medication.route);
                    if (medication.strength) {
                      form.setValue("strength", medication.strength);
                    }
                  }}
                  required
                />
              )}
            />
            {form.formState.errors.medicationId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.medicationId.message}
              </p>
            )}
          </div>
          
          {/* ... rest of form ... */}
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 4. Update Inventory Form Provider

Remove the hardcoded medication ID:

```typescript
// components/providers/inventory-form-provider.tsx
const handleAddItem = async (data: InventoryFormData) => {
  if (!selectedHousehold?.id) {
    console.error("No household selected!");
    return;
  }
  
  if (!data.medicationId) {
    console.error("No medication selected!");
    return;
  }

  const payload = {
    householdId: selectedHousehold.id,
    medicationId: data.medicationId, // Now comes from form
    brandOverride: data.brand || undefined,
    // ... rest of payload
  };
  
  // ... rest of function
};
```

## Schema Updates

Add medicationId to the inventory form schema:

```typescript
// lib/schemas/inventory.ts
export const inventoryFormSchema = z.object({
  medicationId: z.string().uuid(),
  name: z.string().min(1),
  // ... rest of schema
});

export type InventoryFormData = z.infer<typeof inventoryFormSchema>;
```

## Testing Plan

### Unit Tests
- [ ] Medication search component renders correctly
- [ ] Search debouncing works as expected
- [ ] Selection updates form values
- [ ] Error states handled properly

### Integration Tests
- [ ] Search queries medication catalog correctly
- [ ] Selected medication ID is submitted with form
- [ ] Form validation prevents submission without medication

### Manual Testing
- [ ] Search by generic name returns results
- [ ] Search by brand name returns results
- [ ] Partial matches work correctly
- [ ] Selection persists in form
- [ ] Form submission includes correct medication ID

## Migration Strategy

1. Deploy tRPC router updates
2. Deploy new search component
3. Update inventory form to use search
4. Remove hardcoded medication ID
5. Test thoroughly in development
6. Deploy to production

## Acceptance Criteria

- [ ] Users can search medications by generic or brand name
- [ ] Search results show medication details (form, route, strength)
- [ ] Selected medication is displayed in the form
- [ ] Form cannot be submitted without selecting a medication
- [ ] No hardcoded medication IDs remain in the codebase
- [ ] Search is performant with debouncing
- [ ] Accessibility compliance (keyboard navigation, screen reader support)

## Future Enhancements

1. **Recent Medications**: Show recently used medications for quick selection
2. **Favorites**: Allow users to mark frequently used medications
3. **Barcode Integration**: Scan medication barcode to auto-select
4. **Custom Medications**: Allow adding medications not in catalog
5. **Medication Details**: Show more details (warnings, storage requirements)