"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface InventorySource {
	id: string;
	name: string;
	brand?: string;
	lot?: string;
	expiresOn: Date;
	unitsRemaining: number;
	isExpired: boolean;
	isWrongMed: boolean;
	inUse: boolean;
}

interface InventorySourceSelectProps {
	sources: InventorySource[];
	selectedId?: string;
	onSelect: (sourceId: string | null) => void;
	allowOverride?: boolean;
	onOverrideChange?: (override: boolean) => void;
}

export function InventorySourceSelect({
	sources,
	selectedId,
	onSelect,
	allowOverride = false,
	onOverrideChange,
}: InventorySourceSelectProps) {
	const [open, setOpen] = useState(false);
	const [override, setOverride] = useState(false);

	const selectedSource = sources.find((s) => s.id === selectedId);
	const hasIssues =
		selectedSource && (selectedSource.isExpired || selectedSource.isWrongMed);

	const handleOverrideChange = (checked: boolean) => {
		setOverride(checked);
		onOverrideChange?.(checked);
	};

	return (
		<div className="space-y-3">
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className="w-full justify-between bg-transparent"
					>
						{selectedSource ? (
							<div className="flex items-center gap-2">
								<span>{selectedSource.name}</span>
								{selectedSource.brand && (
									<Badge variant="secondary">{selectedSource.brand}</Badge>
								)}
								{selectedSource.lot && (
									<Badge variant="secondary">Lot {selectedSource.lot}</Badge>
								)}
								{selectedSource.inUse && (
									<Badge variant="default">In Use</Badge>
								)}
							</div>
						) : (
							"Select inventory source..."
						)}
						<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-full p-0">
					<Command>
						<CommandInput placeholder="Search inventory..." />
						<CommandList>
							<CommandEmpty>No inventory found.</CommandEmpty>
							<CommandGroup>
								<CommandItem
									value="no-source"
									onSelect={() => {
										onSelect(null);
										setOpen(false);
									}}
								>
									<Check
										className={cn(
											"mr-2 h-4 w-4",
											!selectedId ? "opacity-100" : "opacity-0",
										)}
									/>
									No source specified
								</CommandItem>
								{sources.map((source) => (
									<CommandItem
										key={source.id}
										value={source.id}
										onSelect={() => {
											onSelect(source.id);
											setOpen(false);
										}}
									>
										<Check
											className={cn(
												"mr-2 h-4 w-4",
												selectedId === source.id ? "opacity-100" : "opacity-0",
											)}
										/>
										<div className="flex-1">
											<div className="flex items-center gap-2">
												<span>{source.name}</span>
												{source.brand && (
													<Badge variant="secondary">{source.brand}</Badge>
												)}
												{source.lot && (
													<Badge variant="secondary">Lot {source.lot}</Badge>
												)}
												{source.inUse && (
													<Badge variant="default">In Use</Badge>
												)}
											</div>
											<div className="text-xs text-muted-foreground">
												{source.unitsRemaining} units • Expires{" "}
												{source.expiresOn.toLocaleDateString()}
											</div>
										</div>
										{(source.isExpired || source.isWrongMed) && (
											<AlertTriangle className="h-4 w-4 text-destructive" />
										)}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>

			{hasIssues && (
				<Alert variant="destructive">
					<AlertTriangle className="h-4 w-4" />
					<AlertDescription>
						{selectedSource.isExpired && "This medication is expired. "}
						{selectedSource.isWrongMed &&
							"This may not be the correct medication. "}
						{allowOverride && (
							<div className="mt-2 flex items-center space-x-2">
								<Checkbox
									id="override"
									checked={override}
									onCheckedChange={handleOverrideChange}
								/>
								<label htmlFor="override" className="text-sm">
									Override and continue anyway
								</label>
							</div>
						)}
					</AlertDescription>
				</Alert>
			)}
		</div>
	);
}
