"use client";

import { format } from "date-fns";
import { Calendar, Filter } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface HeatmapBucket {
	dow: number; // 0-6 (Sunday-Saturday)
	hour: number; // 0-23
	count: number;
	latePct: number;
	missedPct: number;
}

interface HeatmapData {
	buckets: HeatmapBucket[];
}

interface ComplianceHeatmapProps {
	range: { from: Date; to: Date };
	onRangeChange: (range: { from: Date; to: Date }) => void;
}

// Mock data - replace with tRPC
const mockHeatmapData: HeatmapData = {
	buckets: [
		// Morning doses (8 AM)
		{ dow: 1, hour: 8, count: 12, latePct: 8, missedPct: 0 },
		{ dow: 2, hour: 8, count: 11, latePct: 18, missedPct: 9 },
		{ dow: 3, hour: 8, count: 10, latePct: 10, missedPct: 0 },
		{ dow: 4, hour: 8, count: 12, latePct: 25, missedPct: 8 },
		{ dow: 5, hour: 8, count: 9, latePct: 33, missedPct: 11 },
		{ dow: 6, hour: 8, count: 8, latePct: 50, missedPct: 25 }, // Weekend struggles
		{ dow: 0, hour: 8, count: 7, latePct: 43, missedPct: 14 },

		// Evening doses (6 PM)
		{ dow: 1, hour: 18, count: 12, latePct: 0, missedPct: 0 },
		{ dow: 2, hour: 18, count: 11, latePct: 9, missedPct: 0 },
		{ dow: 3, hour: 18, count: 12, latePct: 8, missedPct: 0 },
		{ dow: 4, hour: 18, count: 10, latePct: 20, missedPct: 10 },
		{ dow: 5, hour: 18, count: 11, latePct: 18, missedPct: 9 },
		{ dow: 6, hour: 18, count: 9, latePct: 22, missedPct: 11 },
		{ dow: 0, hour: 18, count: 8, latePct: 25, missedPct: 12 },
	],
};

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const hours = Array.from({ length: 24 }, (_, i) => i);

export function ComplianceHeatmap({
	range,
	onRangeChange,
}: ComplianceHeatmapProps) {
	const [selectedAnimalId, setSelectedAnimalId] = useState<string>("all");
	const [selectedRegimenId, setSelectedRegimenId] = useState<string>("all");
	const [heatmapData, setHeatmapData] = useState<HeatmapData>(mockHeatmapData);
	const [selectedCell, setSelectedCell] = useState<HeatmapBucket | null>(null);
	const [sheetOpen, setSheetOpen] = useState(false);
	const { animals } = useApp();
	const router = useRouter();

	// Helper function to create query string following Next.js patterns
	const createQueryString = useCallback((params: Record<string, string>) => {
		const searchParams = new URLSearchParams();
		Object.entries(params).forEach(([key, value]) => {
			searchParams.set(key, value);
		});
		return searchParams.toString();
	}, []);

	useEffect(() => {
		// TODO: Replace with tRPC query
		// const data = await insights.heatmap.query({
		//   animalId: selectedAnimalId === "all" ? undefined : selectedAnimalId,
		//   regimenId: selectedRegimenId === "all" ? undefined : selectedRegimenId,
		//   range: { from: range.from, to: range.to }
		// })

		setHeatmapData(mockHeatmapData);
	}, []);

	const getBucketData = (dow: number, hour: number): HeatmapBucket | null => {
		return (
			heatmapData.buckets.find((b) => b.dow === dow && b.hour === hour) || null
		);
	};

	const getCellColor = (bucket: HeatmapBucket | null): string => {
		if (!bucket || bucket.count === 0) return "bg-gray-100";

		const intensity = Math.min(bucket.count / 15, 1); // Max intensity at 15+ doses
		const problemRate = bucket.latePct + bucket.missedPct;

		if (problemRate >= 30) return `bg-red-${Math.round(intensity * 500) + 100}`;
		if (problemRate >= 15)
			return `bg-orange-${Math.round(intensity * 400) + 100}`;
		return `bg-green-${Math.round(intensity * 400) + 100}`;
	};

	const handleCellClick = (bucket: HeatmapBucket) => {
		setSelectedCell(bucket);
		setSheetOpen(true);
	};

	const handleOpenInHistory = () => {
		if (!selectedCell) return;

		const params: Record<string, string> = {
			from: range.from.toISOString().split("T")[0] || "",
			to: range.to.toISOString().split("T")[0] || "",
		};

		if (selectedAnimalId !== "all") {
			params.animalId = selectedAnimalId;
		}
		// Add hour/dow filters when History supports them

		const queryString = createQueryString(params);
		const historyPath = "/dashboard/history";
		router.push(`${historyPath}?${queryString}` as Route);
		setSheetOpen(false);
	};

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Calendar className="h-5 w-5" />
						Compliance Heatmap
					</CardTitle>
					<CardDescription>
						Medication timing patterns by day of week and hour
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Filters */}
					<div className="flex flex-col flex-wrap items-start gap-3 sm:flex-row sm:items-center">
						<Select
							value={selectedAnimalId}
							onValueChange={setSelectedAnimalId}
						>
							<SelectTrigger className="w-full sm:w-[180px]">
								<SelectValue />
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

						<Select
							value={selectedRegimenId}
							onValueChange={setSelectedRegimenId}
						>
							<SelectTrigger className="w-full sm:w-[180px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Regimens</SelectItem>
								<SelectItem value="rimadyl">Rimadyl</SelectItem>
								<SelectItem value="insulin">Insulin</SelectItem>
							</SelectContent>
						</Select>

						<Popover>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									className="w-full gap-2 bg-transparent sm:w-auto"
								>
									<Calendar className="h-4 w-4" />
									{format(range.from, "MMM d")} - {format(range.to, "MMM d")}
								</Button>
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<div className="space-y-4 p-4">
									<div className="space-y-2">
										<p className="font-medium text-sm">From</p>
										<CalendarComponent
											mode="single"
											selected={range.from}
											onSelect={(date) =>
												date && onRangeChange({ ...range, from: date })
											}
											initialFocus
										/>
									</div>
									<div className="space-y-2">
										<p className="font-medium text-sm">To</p>
										<CalendarComponent
											mode="single"
											selected={range.to}
											onSelect={(date) =>
												date && onRangeChange({ ...range, to: date })
											}
										/>
									</div>
								</div>
							</PopoverContent>
						</Popover>
					</div>

					{/* Heatmap Grid */}
					<div className="overflow-x-auto">
						<div className="min-w-[640px] space-y-2">
							{/* Hour labels */}
							<div className="grid grid-cols-[40px_repeat(24,_1fr)] gap-1 text-xs">
								<div></div> {/* Empty corner */}
								{hours.map((hour) => (
									<div key={hour} className="text-center text-muted-foreground">
										{hour === 0
											? "12a"
											: hour <= 12
												? `${hour}${hour === 12 ? "p" : "a"}`
												: `${hour - 12}p`}
									</div>
								))}
							</div>

							{/* Day rows */}
							{dayNames.map((day, dow) => (
								<div
									key={`day-${day}`}
									className="grid grid-cols-[40px_repeat(24,_1fr)] gap-1"
								>
									<div className="py-1 font-medium text-muted-foreground text-xs">
										{day}
									</div>
									{hours.map((hour) => {
										const bucket = getBucketData(dow, hour);
										return (
											<button
												type="button"
												key={hour}
												className={cn(
													"aspect-square w-full cursor-pointer rounded transition-all hover:scale-110 hover:shadow-md",
													getCellColor(bucket),
													bucket && bucket.count > 0
														? "hover:ring-2 hover:ring-primary"
														: "",
												)}
												onClick={() =>
													bucket && bucket.count > 0 && handleCellClick(bucket)
												}
												title={
													bucket && bucket.count > 0
														? `${day} ${hour}:00 - ${bucket.count} doses, ${bucket.latePct}% late, ${bucket.missedPct}% missed`
														: "No doses scheduled"
												}
												disabled={!bucket || bucket.count === 0}
											/>
										);
									})}
								</div>
							))}
						</div>
					</div>

					{/* Legend */}
					<div className="flex flex-col items-start justify-between gap-3 text-muted-foreground text-xs sm:flex-row sm:items-center">
						<div className="flex flex-wrap items-center gap-3">
							<div className="flex items-center gap-1">
								<div className="h-3 w-3 rounded bg-gray-100"></div>
								<span>No doses</span>
							</div>
							<div className="flex items-center gap-1">
								<div className="h-3 w-3 rounded bg-green-300"></div>
								<span>On time</span>
							</div>
							<div className="flex items-center gap-1">
								<div className="h-3 w-3 rounded bg-orange-300"></div>
								<span>Some late</span>
							</div>
							<div className="flex items-center gap-1">
								<div className="h-3 w-3 rounded bg-red-300"></div>
								<span>Many missed</span>
							</div>
						</div>
						<div>Darker = more doses</div>
					</div>
				</CardContent>
			</Card>

			{/* Drill-in Sheet */}
			<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
				<SheetContent>
					<SheetHeader>
						<SheetTitle>
							{selectedCell &&
								`${dayNames[selectedCell.dow]} ${selectedCell.hour}:00`}
						</SheetTitle>
						<SheetDescription>
							Medication administration details for this time slot
						</SheetDescription>
					</SheetHeader>

					{selectedCell && (
						<div className="mt-6 space-y-4">
							<div className="grid grid-cols-3 gap-4 text-center">
								<div>
									<div className="font-bold text-2xl">{selectedCell.count}</div>
									<div className="text-muted-foreground text-sm">
										Total doses
									</div>
								</div>
								<div>
									<div className="font-bold text-2xl text-orange-600">
										{selectedCell.latePct}%
									</div>
									<div className="text-muted-foreground text-sm">Late</div>
								</div>
								<div>
									<div className="font-bold text-2xl text-red-600">
										{selectedCell.missedPct}%
									</div>
									<div className="text-muted-foreground text-sm">Missed</div>
								</div>
							</div>

							<div className="space-y-3">
								<h4 className="font-medium">Sample Events</h4>
								{/* Mock sample events */}
								<div className="space-y-2">
									<div className="rounded-lg border p-3">
										<div className="font-medium">Buddy - Rimadyl 75mg</div>
										<div className="text-muted-foreground text-sm">
											Recorded at 8:15 AM • 15 min late
										</div>
										<Badge variant="secondary" className="mt-1">
											Late
										</Badge>
									</div>
									<div className="rounded-lg border p-3">
										<div className="font-medium">
											Whiskers - Insulin 2 units
										</div>
										<div className="text-muted-foreground text-sm">
											Recorded at 8:02 AM • On time
										</div>
										<Badge variant="default" className="mt-1">
											On time
										</Badge>
									</div>
								</div>
							</div>

							<Button onClick={handleOpenInHistory} className="w-full">
								<Filter className="mr-2 h-4 w-4" />
								Open in History
							</Button>
						</div>
					)}
				</SheetContent>
			</Sheet>
		</>
	);
}
