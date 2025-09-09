"use client";

import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { vetmedMedicationCatalog } from "@/db/schema";
import { useDebounce } from "@/hooks/shared/useDebounce";
import { cn } from "@/lib/utils/general";
import { trpc } from "@/server/trpc/client";

type MedicationCatalog = typeof vetmedMedicationCatalog.$inferSelect;

interface HybridMedicationInputProps {
  // Primary: Free text value for medication name
  value?: string;
  onChange: (
    medicationName: string,
    medicationId?: string,
    isCustom?: boolean,
    medication?: MedicationCatalog,
  ) => void;

  // Compatibility props
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  householdId?: string;
}

export function HybridMedicationInput({
  value = "",
  onChange,
  placeholder = "Enter medication name...",
  required = false,
  disabled = false,
  householdId,
}: HybridMedicationInputProps) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] =
    useState<MedicationCatalog | null>(null);

  // Debounce query for search optimization
  const debouncedQuery = useDebounce(query, 300);

  // Search medications when user types
  const { data: searchResults, isLoading: isSearching } =
    trpc.medication.search.useQuery(
      { query: debouncedQuery, limit: 8 },
      {
        enabled: debouncedQuery.length > 1 && open,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      },
    );

  // Get frequently used medications
  const { data: frequentMeds } = trpc.medication.getFrequentlyUsed.useQuery(
    { householdId: householdId || "", limit: 5 },
    {
      enabled: !!householdId && open && debouncedQuery.length <= 1,
      staleTime: 5 * 60 * 1000,
    },
  );

  // Sync internal query with external value changes
  useEffect(() => {
    if (value !== query) {
      setQuery(value);
      setSelectedCatalogItem(null); // Reset catalog selection when value changes externally
    }
  }, [value, query]);

  const handleInputChange = (newValue: string) => {
    setQuery(newValue);
    setSelectedCatalogItem(null);
    // Immediately notify parent of custom medication
    onChange(newValue, undefined, true, undefined);
  };

  const handleCatalogSelection = (medication: MedicationCatalog) => {
    const displayName = medication.brandName
      ? `${medication.genericName} (${medication.brandName})`
      : medication.genericName;

    setQuery(displayName);
    setSelectedCatalogItem(medication);
    setOpen(false);

    // Notify parent with catalog item and full medication object
    onChange(displayName, medication.id, false, medication);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Enter to confirm current input as custom medication
    if (e.key === "Enter" && !open) {
      e.preventDefault();
      onChange(query, undefined, true, undefined);
    }
  };

  const medicationsToShow =
    debouncedQuery.length > 1 ? searchResults : frequentMeds;
  const showSuggestions = medicationsToShow && medicationsToShow.length > 0;
  const showCustomOption = query.trim().length > 0 && debouncedQuery.length > 1;

  return (
    <div className="relative w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              required={required}
              className={cn("pr-8", selectedCatalogItem && "border-primary")}
              aria-expanded={open}
              aria-haspopup="listbox"
              aria-controls="medication-listbox"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-0 right-0 h-full px-2 hover:bg-transparent"
              onClick={() => setOpen(!open)}
              disabled={disabled}
              aria-label="Show medication suggestions"
            >
              <ChevronsUpDown className="h-4 w-4 opacity-50" />
            </Button>
          </div>
        </PopoverTrigger>

        {(showSuggestions || showCustomOption || isSearching) && (
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command shouldFilter={false} id="medication-listbox">
              <CommandInput
                placeholder="Search catalog medications..."
                value={debouncedQuery}
                onValueChange={setQuery}
                className="border-none"
              />

              {isSearching && (
                <CommandItem disabled className="justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching catalog...
                </CommandItem>
              )}

              {!isSearching && (
                <>
                  <CommandEmpty>
                    {debouncedQuery.length <= 1
                      ? "Type to search catalog..."
                      : "No catalog medications found."}
                  </CommandEmpty>

                  <CommandGroup>
                    {/* Frequently used header */}
                    {debouncedQuery.length <= 1 &&
                      frequentMeds &&
                      frequentMeds.length > 0 && (
                        <div className="px-2 py-1.5 font-semibold text-muted-foreground text-xs">
                          Frequently Used
                        </div>
                      )}

                    {/* Custom medication option */}
                    {showCustomOption && (
                      <>
                        <div className="px-2 py-1.5 font-semibold text-muted-foreground text-xs">
                          Custom Medication
                        </div>
                        <CommandItem
                          value={`custom-${query}`}
                          onSelect={() => {
                            onChange(query.trim(), undefined, true, undefined);
                            setOpen(false);
                          }}
                          className="flex items-start"
                        >
                          <Plus className="mt-0.5 mr-2 h-4 w-4 text-green-600" />
                          <div className="flex flex-col">
                            <span className="font-medium">
                              Add "{query.trim()}"
                            </span>
                            <span className="text-muted-foreground text-sm">
                              Custom medication (not in catalog)
                            </span>
                          </div>
                        </CommandItem>
                      </>
                    )}

                    {/* Catalog suggestions */}
                    {showSuggestions && (
                      <>
                        {showCustomOption && (
                          <div className="border-t px-2 py-1.5 font-semibold text-muted-foreground text-xs">
                            Catalog Suggestions
                          </div>
                        )}
                        {medicationsToShow?.map((medication) => {
                          const isSelected =
                            selectedCatalogItem?.id === medication.id;
                          return (
                            <CommandItem
                              key={medication.id}
                              value={medication.id}
                              onSelect={() =>
                                handleCatalogSelection(medication)
                              }
                              className="flex items-start"
                            >
                              <Check
                                className={cn(
                                  "mt-0.5 mr-2 h-4 w-4",
                                  isSelected ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {medication.genericName}
                                </span>
                                <span className="text-muted-foreground text-sm">
                                  {medication.brandName && (
                                    <>{medication.brandName} • </>
                                  )}
                                  {medication.form} • {medication.route}
                                  {medication.strength && (
                                    <> • {medication.strength}</>
                                  )}
                                </span>
                                {medication.controlledSubstance && (
                                  <span className="font-medium text-orange-600 text-xs dark:text-orange-400">
                                    Controlled Substance
                                  </span>
                                )}
                              </div>
                            </CommandItem>
                          );
                        })}
                      </>
                    )}
                  </CommandGroup>
                </>
              )}
            </Command>
          </PopoverContent>
        )}
      </Popover>

      {/* Indicator for selected catalog item */}
      {selectedCatalogItem && (
        <div className="mt-1 text-muted-foreground text-xs">
          ✓ From catalog
          {selectedCatalogItem.controlledSubstance && (
            <span className="ml-2 font-medium text-orange-600 dark:text-orange-400">
              • Controlled Substance
            </span>
          )}
        </div>
      )}
    </div>
  );
}
