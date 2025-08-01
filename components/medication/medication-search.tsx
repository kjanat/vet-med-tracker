"use client";

import type { MedicationCatalog } from "@prisma/client";
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
import { cn } from "@/lib/utils";
import { trpc } from "@/server/trpc/client";

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
			{ query, limit: 10 },
			{
				enabled: query.length > 0 && open,
				staleTime: 5 * 60 * 1000, // Cache for 5 minutes
			},
		);

	// Get selected medication details
	const { data: selectedMedication } = trpc.medication.getById.useQuery(
		{ id: value! },
		{
			enabled: !!value,
			staleTime: 10 * 60 * 1000, // Cache for 10 minutes
		},
	);

	// Get frequently used medications
	const { data: frequentMeds } = trpc.medication.getFrequentlyUsed.useQuery(
		{ householdId: householdId!, limit: 5 },
		{
			enabled: !!householdId && open && query.length === 0,
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
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				{/* biome-ignore lint/a11y/useSemanticElements: Custom combobox pattern with Command component */}
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					aria-label="Select medication"
					aria-required={required}
					aria-haspopup="listbox"
					aria-controls="medication-listbox"
					disabled={disabled}
					className={cn(
						"w-full justify-between",
						!displayValue && "text-muted-foreground",
					)}
				>
					<span className="truncate">{displayValue || placeholder}</span>
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[400px] p-0" align="start">
				<Command shouldFilter={false} id="medication-listbox">
					<CommandInput
						placeholder="Search by generic or brand name..."
						value={query}
						onValueChange={setQuery}
					/>
					<CommandEmpty>
						{query.length === 0
							? "Type to search medications..."
							: "No medications found."}
					</CommandEmpty>
					<CommandGroup>
						{query.length === 0 && frequentMeds && frequentMeds.length > 0 && (
							<div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
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
								key={medication.id}
								value={medication.id}
								onSelect={() => {
									onChange(medication.id, medication);
									setOpen(false);
									setQuery("");
								}}
								className="flex items-start"
							>
								<Check
									className={cn(
										"mr-2 h-4 w-4 mt-0.5",
										value === medication.id ? "opacity-100" : "opacity-0",
									)}
								/>
								<div className="flex flex-col">
									<span className="font-medium">{medication.genericName}</span>
									<span className="text-sm text-muted-foreground">
										{medication.brandName && <>{medication.brandName} • </>}
										{medication.form} • {medication.route}
										{medication.defaultStrength && (
											<> • {medication.defaultStrength}</>
										)}
									</span>
									{medication.isControlled && (
										<span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
											Controlled Substance
										</span>
									)}
									{medication.requiresCosign && (
										<span className="text-xs text-red-600 dark:text-red-400 font-medium">
											Requires Co-sign
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
