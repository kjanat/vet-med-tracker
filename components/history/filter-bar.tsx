"use client";

import { Calendar, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { useApp } from "@/components/providers/app-provider";
import { useHistoryFilters } from "@/hooks/useHistoryFilters";
import { format } from "date-fns";

export function FilterBar() {
	const { animals } = useApp();
	const { filters, setFilter, setFilters } = useHistoryFilters();

	const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
		if (key === "view") return false;
		if (key === "type" && value === "all") return false;
		if ((key === "from" || key === "to") && value) return false; // Default date range doesn't count
		return value !== undefined && value !== "";
	}).length;

	const clearFilters = () => {
		setFilters({
			animalId: undefined,
			regimenId: undefined,
			caregiverId: undefined,
			type: "all",
		});
	};

	return (
		<div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60 border-b p-4">
			<div className="flex flex-wrap items-center gap-4">
				{/* View Toggle */}
				<div className="flex rounded-lg border p-1">
					<Button
						variant={filters.view === "list" ? "default" : "ghost"}
						size="sm"
						onClick={() => {
							setFilter("view", "list");
							window.dispatchEvent(
								new CustomEvent("history_view_toggle", {
									detail: { view: "list" },
								}),
							);
						}}
					>
						List
					</Button>
					<Button
						variant={filters.view === "calendar" ? "default" : "ghost"}
						size="sm"
						onClick={() => {
							setFilter("view", "calendar");
							window.dispatchEvent(
								new CustomEvent("history_view_toggle", {
									detail: { view: "calendar" },
								}),
							);
						}}
					>
						Calendar
					</Button>
				</div>

				{/* Animal Filter */}
				<Select
					value={filters.animalId || "all"}
					onValueChange={(value) =>
						setFilter("animalId", value === "all" ? undefined : value)
					}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder="All Animals" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Animals</SelectItem>
						{animals.map((animal) => (
							<SelectItem key={animal.id} value={animal.id}>
								{animal.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Type Filter */}
				<Select
					value={filters.type}
					onValueChange={(value) => setFilter("type", value)}
				>
					<SelectTrigger className="w-[140px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Types</SelectItem>
						<SelectItem value="scheduled">Scheduled</SelectItem>
						<SelectItem value="prn">PRN</SelectItem>
					</SelectContent>
				</Select>

				{/* Date Range */}
				<DateRangePicker
					from={new Date(filters.from)}
					to={new Date(filters.to)}
					onSelect={(from, to) => {
						if (from) setFilter("from", from.toISOString().split("T")[0]);
						if (to) setFilter("to", to.toISOString().split("T")[0]);
					}}
				/>

				{/* Active Filters */}
				{activeFilterCount > 0 && (
					<div className="flex items-center gap-2">
						<Badge variant="secondary" className="gap-1">
							<Filter className="h-3 w-3" />
							{activeFilterCount} active
						</Badge>
						<Button variant="ghost" size="sm" onClick={clearFilters}>
							<X className="h-4 w-4" />
							Clear
						</Button>
					</div>
				)}
			</div>

			{/* Active Filter Pills */}
			<div className="flex flex-wrap gap-2 mt-3">
				{filters.animalId && (
					<FilterPill
						label={`Animal: ${animals.find((a) => a.id === filters.animalId)?.name}`}
						onRemove={() => setFilter("animalId", undefined)}
					/>
				)}
				{filters.type !== "all" && (
					<FilterPill
						label={`Type: ${filters.type}`}
						onRemove={() => setFilter("type", "all")}
					/>
				)}
			</div>
		</div>
	);
}

function FilterPill({
	label,
	onRemove,
}: {
	label: string;
	onRemove: () => void;
}) {
	return (
		<Badge variant="secondary" className="gap-1">
			{label}
			<Button
				variant="ghost"
				size="sm"
				className="h-4 w-4 p-0"
				onClick={onRemove}
			>
				<X className="h-3 w-3" />
			</Button>
		</Badge>
	);
}

function DateRangePicker({
	from,
	to,
	onSelect,
}: {
	from: Date;
	to: Date;
	onSelect: (from: Date | undefined, to: Date | undefined) => void;
}) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline" className="gap-2 bg-transparent">
					<Calendar className="h-4 w-4" />
					{format(from, "MMM d")} - {format(to, "MMM d")}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<div className="p-4 space-y-4">
					<div className="space-y-2">
						<Label>From</Label>
						<CalendarComponent
							mode="single"
							selected={from}
							onSelect={(date) => onSelect(date, to)}
							initialFocus
						/>
					</div>
					<div className="space-y-2">
						<Label>To</Label>
						<CalendarComponent
							mode="single"
							selected={to}
							onSelect={(date) => onSelect(from, date)}
						/>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
