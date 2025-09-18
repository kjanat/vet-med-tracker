"use client";

import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { vetmedMedicationCatalog } from "@/db/schema";
import { cn } from "@/lib/utils/general";
import { trpc } from "@/server/trpc/client";

type MedicationCatalog = typeof vetmedMedicationCatalog.$inferSelect;

interface MedicationSearchProps {
  value?: string; // medication ID
  onChange: (medicationId: string, medication: MedicationCatalog) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  householdId?: string; // For showing frequently used medications
}

export function MedicationSearch({
  value,
  onChange,
  placeholder = "Search medications...",
  required = false,
  disabled = false,
  householdId,
}: MedicationSearchProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  // Search medications
  const { data: searchResults, isLoading: isSearching } =
    trpc.medication.search.useQuery(
      { limit: 10, query },
      {
        enabled: query.length > 0 && open,
        staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      },
    );

  // Get selected medication details
  const { data: selectedMedication } = trpc.medication.getById.useQuery(
    { id: value || "" },
    {
      enabled: Boolean(value),
      staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    },
  );

  // Get frequently used medications
  const { data: frequentMeds } = trpc.medication.getFrequentlyUsed.useQuery(
    { householdId: householdId || "", limit: 5 },
    {
      enabled: Boolean(householdId) && open && query.length === 0,
      staleTime: 5 * 60 * 1000,
    },
  );

  const displayValue = selectedMedication
    ? `${selectedMedication.genericName}${
        selectedMedication.brandName ? ` (${selectedMedication.brandName})` : ""
      }`
    : null;

  const medicationsToShow = query.length > 0 ? searchResults : frequentMeds;

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-controls="medication-listbox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Select medication"
          aria-required={required}
          className={cn(
            "w-full justify-between",
            !displayValue && "text-muted-foreground",
          )}
          disabled={disabled}
          role="combobox"
          variant="outline"
        >
          <span className="truncate">{displayValue || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[400px] p-0">
        <Command id="medication-listbox" shouldFilter={false}>
          <CommandInput
            onValueChange={setQuery}
            placeholder="Search by generic or brand name..."
            value={query}
          />
          <CommandEmpty>
            {query.length === 0
              ? "Type to search medications..."
              : "No medications found."}
          </CommandEmpty>
          <CommandGroup>
            {query.length === 0 && frequentMeds && frequentMeds.length > 0 && (
              <div className="px-2 py-1.5 font-semibold text-muted-foreground text-xs">
                Frequently Used
              </div>
            )}
            {isSearching && (
              <CommandItem disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </CommandItem>
            )}
            {medicationsToShow?.map((medication) => (
              <CommandItem
                className="flex items-start"
                key={medication.id}
                onSelect={() => {
                  onChange(medication.id, medication);
                  setOpen(false);
                  setQuery("");
                }}
                value={medication.id}
              >
                <Check
                  className={cn(
                    "mt-0.5 mr-2 h-4 w-4",
                    value === medication.id ? "opacity-100" : "opacity-0",
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
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
