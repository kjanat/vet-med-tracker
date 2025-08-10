"use client";

import { format } from "date-fns";
import { CalendarIcon, ChevronDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	type DateRange,
	getDateRangeFromPeriod,
	PERIOD_OPTIONS,
	type Period,
} from "@/hooks/dashboard/useDashboardData";
import { cn } from "@/lib/utils/general";

// Helper function to format date range
function formatDateRange(from: Date | undefined, to: Date | undefined): string {
	if (!from) return "Select dates";
	if (!to) return format(from, "MMM d, yyyy");
	return `${format(from, "MMM d")} - ${format(to, "MMM d, yyyy")}`;
}

interface DateRangeSelectorProps {
	dateRange: DateRange;
	onDateRangeChange: (range: DateRange) => void;
	selectedPeriod?: Period;
	onPeriodChange?: (period: Period) => void;
	showPeriodSelector?: boolean;
	className?: string;
}

export function DateRangeSelector({
	dateRange,
	onDateRangeChange,
	selectedPeriod,
	onPeriodChange,
	showPeriodSelector = true,
	className,
}: DateRangeSelectorProps) {
	const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
	const [tempFromDate, setTempFromDate] = useState<Date>(dateRange.from);
	const [tempToDate, setTempToDate] = useState<Date>(dateRange.to);

	const handlePeriodSelect = (period: Period) => {
		const newRange = getDateRangeFromPeriod(period);
		onDateRangeChange(newRange);
		onPeriodChange?.(period);
	};

	const handleCustomDateApply = () => {
		onDateRangeChange({
			from: tempFromDate,
			to: tempToDate,
		});
		setIsDatePickerOpen(false);

		// Clear selected period when using custom dates
		if (onPeriodChange) {
			const customPeriod: Period = {
				label: "Custom",
				value: "7d", // Fallback value
				days: Math.ceil(
					(tempToDate.getTime() - tempFromDate.getTime()) /
						(1000 * 60 * 60 * 24),
				),
			};
			onPeriodChange(customPeriod);
		}
	};

	const handleDatePickerOpen = () => {
		setTempFromDate(dateRange.from);
		setTempToDate(dateRange.to);
		setIsDatePickerOpen(true);
	};

	const formatDateRange = (from: Date, to: Date) => {
		if (from.toDateString() === to.toDateString()) {
			return format(from, "MMM d, yyyy");
		}

		if (from.getFullYear() === to.getFullYear()) {
			return `${format(from, "MMM d")} - ${format(to, "MMM d, yyyy")}`;
		}

		return `${format(from, "MMM d, yyyy")} - ${format(to, "MMM d, yyyy")}`;
	};

	// Check if current range matches any period
	const getCurrentPeriodLabel = () => {
		if (selectedPeriod && selectedPeriod.label !== "Custom") {
			return selectedPeriod.label;
		}

		return formatDateRange(dateRange.from, dateRange.to);
	};

	return (
		<div className={cn("flex items-center gap-2", className)}>
			{/* Period Selector */}
			{showPeriodSelector && (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="outline" className="w-auto gap-2">
							<CalendarIcon className="h-4 w-4" />
							{getCurrentPeriodLabel()}
							<ChevronDown className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="start" className="w-48">
						{PERIOD_OPTIONS.map((period) => (
							<DropdownMenuItem
								key={period.value}
								onClick={() => handlePeriodSelect(period)}
								className="cursor-pointer"
							>
								{period.label}
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
						<DropdownMenuItem
							onClick={handleDatePickerOpen}
							className="cursor-pointer"
						>
							Custom Range...
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			)}

			{/* Custom Date Range Picker */}
			<Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
				<PopoverTrigger asChild>
					{!showPeriodSelector && (
						<Button variant="outline" className="w-auto gap-2">
							<CalendarIcon className="h-4 w-4" />
							{formatDateRange(dateRange.from, dateRange.to)}
						</Button>
					)}
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<div className="p-4">
						<div className="space-y-4">
							<div className="space-y-2">
								<label className="font-medium text-sm">From Date</label>
								<Calendar
									mode="single"
									selected={tempFromDate}
									onSelect={(date) => date && setTempFromDate(date)}
									className="rounded-md border"
								/>
							</div>

							<div className="space-y-2">
								<label className="font-medium text-sm">To Date</label>
								<Calendar
									mode="single"
									selected={tempToDate}
									onSelect={(date) => date && setTempToDate(date)}
									disabled={(date) => date < tempFromDate}
									className="rounded-md border"
								/>
							</div>
						</div>

						<div className="mt-4 flex justify-end gap-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => setIsDatePickerOpen(false)}
							>
								Cancel
							</Button>
							<Button
								size="sm"
								onClick={handleCustomDateApply}
								disabled={tempToDate < tempFromDate}
							>
								Apply
							</Button>
						</div>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}

// Quick preset buttons component
interface QuickDatePresetsProps {
	onDateRangeChange: (range: DateRange) => void;
	onPeriodChange?: (period: Period) => void;
	className?: string;
}

export function QuickDatePresets({
	onDateRangeChange,
	onPeriodChange,
	className,
}: QuickDatePresetsProps) {
	const handlePresetClick = (period: Period) => {
		const range = getDateRangeFromPeriod(period);
		onDateRangeChange(range);
		onPeriodChange?.(period);
	};

	return (
		<div className={cn("flex flex-wrap gap-1", className)}>
			{PERIOD_OPTIONS.map((period) => (
				<Button
					key={period.value}
					variant="ghost"
					size="sm"
					onClick={() => handlePresetClick(period)}
					className="h-8 px-2 text-xs"
				>
					{period.label}
				</Button>
			))}
		</div>
	);
}

// Compact date range display component
interface CompactDateDisplayProps {
	dateRange: DateRange;
	period?: Period;
	className?: string;
}

export function CompactDateDisplay({
	dateRange,
	period,
	className,
}: CompactDateDisplayProps) {
	return (
		<div
			className={cn(
				"flex items-center gap-2 text-muted-foreground text-sm",
				className,
			)}
		>
			<CalendarIcon className="h-3 w-3" />
			<span>
				{period?.label || formatDateRange(dateRange.from, dateRange.to)}
			</span>
		</div>
	);
}
