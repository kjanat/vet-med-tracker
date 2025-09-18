"use client";

import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react";
import type React from "react";
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

// Custom hook for medication input logic
function useMedicationInput(
  value: string,
  onChange: HybridMedicationInputProps["onChange"],
  householdId?: string,
) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [selectedCatalogItem, setSelectedCatalogItem] =
    useState<MedicationCatalog | null>(null);

  const debouncedQuery = useDebounce(query, 300);

  const searchQuery = trpc.medication.search.useQuery(
    { limit: 8, query: debouncedQuery },
    { enabled: debouncedQuery.length > 1 && open, staleTime: 5 * 60 * 1000 },
  );

  const frequentQuery = trpc.medication.getFrequentlyUsed.useQuery(
    { householdId: householdId || "", limit: 5 },
    {
      enabled: Boolean(householdId) && open && debouncedQuery.length <= 1,
      staleTime: 5 * 60 * 1000,
    },
  );

  useEffect(() => {
    if (value !== query) {
      setQuery(value);
      setSelectedCatalogItem(null);
    }
  }, [value, query]);

  const handleInputChange = (newValue: string) => {
    setQuery(newValue);
    setSelectedCatalogItem(null);
    onChange(newValue, undefined, true, undefined);
  };

  const handleCatalogSelection = (medication: MedicationCatalog) => {
    const displayName = medication.brandName
      ? `${medication.genericName} (${medication.brandName})`
      : medication.genericName;

    setQuery(displayName);
    setSelectedCatalogItem(medication);
    setOpen(false);
    onChange(displayName, medication.id, false, medication);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !open) {
      e.preventDefault();
      onChange(query, undefined, true, undefined);
    }
  };

  return {
    debouncedQuery,
    frequentMeds: frequentQuery.data,
    handleCatalogSelection,
    handleInputChange,
    handleKeyDown,
    isSearching: searchQuery.isLoading,
    open,
    query,
    searchResults: searchQuery.data,
    selectedCatalogItem,
    setOpen,
    setQuery,
  };
}

// Component for medication input field
function MedicationInputField({
  query,
  handleInputChange,
  handleKeyDown,
  placeholder,
  disabled,
  required,
  selectedCatalogItem,
  open,
  setOpen,
}: {
  query: string;
  handleInputChange: (value: string) => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  placeholder: string;
  disabled: boolean;
  required: boolean;
  selectedCatalogItem: MedicationCatalog | null;
  open: boolean;
  setOpen: (open: boolean) => void;
}) {
  return (
    <div className="relative">
      <Input
        aria-controls="medication-listbox"
        aria-expanded={open}
        aria-haspopup="listbox"
        className={cn("pr-8", selectedCatalogItem && "border-primary")}
        disabled={disabled}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        required={required}
        value={query}
      />
      <Button
        aria-label="Show medication suggestions"
        className="absolute top-0 right-0 h-full px-2 hover:bg-transparent"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        size="sm"
        type="button"
        variant="ghost"
      >
        <ChevronsUpDown className="h-4 w-4 opacity-50" />
      </Button>
    </div>
  );
}

// Component for medication suggestions dropdown
function MedicationSuggestions({
  showSuggestions,
  showCustomOption,
  isSearching,
  debouncedQuery,
  setQuery,
  query,
  onChange,
  setOpen,
  frequentMeds,
  medicationsToShow,
  handleCatalogSelection,
  selectedCatalogItem,
}: {
  showSuggestions: boolean;
  showCustomOption: boolean;
  isSearching: boolean;
  debouncedQuery: string;
  setQuery: (query: string) => void;
  query: string;
  onChange: HybridMedicationInputProps["onChange"];
  setOpen: (open: boolean) => void;
  frequentMeds: MedicationCatalog[] | undefined;
  medicationsToShow: MedicationCatalog[] | undefined;
  handleCatalogSelection: (medication: MedicationCatalog) => void;
  selectedCatalogItem: MedicationCatalog | null;
}) {
  if (!showSuggestions && !showCustomOption && !isSearching) return null;

  return (
    <PopoverContent align="start" className="w-[400px] p-0">
      <Command id="medication-listbox" shouldFilter={false}>
        <CommandInput
          className="border-none"
          onValueChange={setQuery}
          placeholder="Search catalog medications..."
          value={debouncedQuery}
        />

        {isSearching && (
          <CommandItem className="justify-center" disabled>
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
              <FrequentlyUsedSection
                debouncedQuery={debouncedQuery}
                frequentMeds={frequentMeds}
              />
              <CustomMedicationOption
                onChange={onChange}
                query={query}
                setOpen={setOpen}
                showCustomOption={showCustomOption}
              />
              <CatalogSuggestions
                handleCatalogSelection={handleCatalogSelection}
                medicationsToShow={medicationsToShow}
                selectedCatalogItem={selectedCatalogItem}
                showCustomOption={showCustomOption}
                showSuggestions={showSuggestions}
              />
            </CommandGroup>
          </>
        )}
      </Command>
    </PopoverContent>
  );
}

// Frequently used section
function FrequentlyUsedSection({
  debouncedQuery,
  frequentMeds,
}: {
  debouncedQuery: string;
  frequentMeds: MedicationCatalog[] | undefined;
}) {
  if (debouncedQuery.length > 1 || !frequentMeds || frequentMeds.length === 0)
    return null;

  return (
    <div className="px-2 py-1.5 font-semibold text-muted-foreground text-xs">
      Frequently Used
    </div>
  );
}

// Custom medication option
function CustomMedicationOption({
  showCustomOption,
  query,
  onChange,
  setOpen,
}: {
  showCustomOption: boolean;
  query: string;
  onChange: HybridMedicationInputProps["onChange"];
  setOpen: (open: boolean) => void;
}) {
  if (!showCustomOption) return null;

  return (
    <>
      <div className="px-2 py-1.5 font-semibold text-muted-foreground text-xs">
        Custom Medication
      </div>
      <CommandItem
        className="flex items-start"
        onSelect={() => {
          onChange(query.trim(), undefined, true, undefined);
          setOpen(false);
        }}
        value={`custom-${query}`}
      >
        <Plus className="mt-0.5 mr-2 h-4 w-4 text-green-600" />
        <div className="flex flex-col">
          <span className="font-medium">Add "{query.trim()}"</span>
          <span className="text-muted-foreground text-sm">
            Custom medication (not in catalog)
          </span>
        </div>
      </CommandItem>
    </>
  );
}

// Catalog suggestions
function CatalogSuggestions({
  showSuggestions,
  showCustomOption,
  medicationsToShow,
  handleCatalogSelection,
  selectedCatalogItem,
}: {
  showSuggestions: boolean;
  showCustomOption: boolean;
  medicationsToShow: MedicationCatalog[] | undefined;
  handleCatalogSelection: (medication: MedicationCatalog) => void;
  selectedCatalogItem: MedicationCatalog | null;
}) {
  if (!showSuggestions) return null;

  return (
    <>
      {showCustomOption && (
        <div className="border-t px-2 py-1.5 font-semibold text-muted-foreground text-xs">
          Catalog Suggestions
        </div>
      )}
      {medicationsToShow?.map((medication) => {
        const isSelected = selectedCatalogItem?.id === medication.id;
        return (
          <CommandItem
            className="flex items-start"
            key={medication.id}
            onSelect={() => handleCatalogSelection(medication)}
            value={medication.id}
          >
            <Check
              className={cn(
                "mt-0.5 mr-2 h-4 w-4",
                isSelected ? "opacity-100" : "opacity-0",
              )}
            />
            <div className="flex flex-col">
              <span className="font-medium">{medication.genericName}</span>
              <span className="text-muted-foreground text-sm">
                {medication.brandName && <>{medication.brandName} • </>}
                {medication.form} • {medication.route}
                {medication.strength && <> • {medication.strength}</>}
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
  );
}

export function HybridMedicationInput({
  value = "",
  onChange,
  placeholder = "Enter medication name...",
  required = false,
  disabled = false,
  householdId,
}: HybridMedicationInputProps) {
  const {
    query,
    setQuery,
    open,
    setOpen,
    selectedCatalogItem,
    debouncedQuery,
    searchResults,
    isSearching,
    frequentMeds,
    handleInputChange,
    handleCatalogSelection,
    handleKeyDown,
  } = useMedicationInput(value, onChange, householdId);

  const medicationsToShow =
    debouncedQuery.length > 1 ? searchResults : frequentMeds;
  const showSuggestions = Boolean(
    medicationsToShow && medicationsToShow.length > 0,
  );
  const showCustomOption = query.trim().length > 0 && debouncedQuery.length > 1;

  return (
    <div className="relative w-full">
      <Popover onOpenChange={setOpen} open={open}>
        <PopoverTrigger asChild>
          <MedicationInputField
            disabled={disabled}
            handleInputChange={handleInputChange}
            handleKeyDown={handleKeyDown}
            open={open}
            placeholder={placeholder}
            query={query}
            required={required}
            selectedCatalogItem={selectedCatalogItem}
            setOpen={setOpen}
          />
        </PopoverTrigger>

        <MedicationSuggestions
          debouncedQuery={debouncedQuery}
          frequentMeds={frequentMeds}
          handleCatalogSelection={handleCatalogSelection}
          isSearching={isSearching}
          medicationsToShow={medicationsToShow}
          onChange={onChange}
          query={query}
          selectedCatalogItem={selectedCatalogItem}
          setOpen={setOpen}
          setQuery={setQuery}
          showCustomOption={showCustomOption}
          showSuggestions={showSuggestions}
        />
      </Popover>

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
