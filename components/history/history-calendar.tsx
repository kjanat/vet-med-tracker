"use client";

// import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
	format,
	startOfMonth,
	endOfMonth,
	eachDayOfInterval,
	isSameMonth,
	isSameDay,
	addMonths,
	subMonths,
} from "date-fns";
import type { AdministrationRecord } from "./history-list";

interface DayCount {
	date: Date;
	total: number;
	onTime: number;
	late: number;
	missed: number;
	prn: number;
}

interface HistoryCalendarProps {
	month: Date;
	counts: DayCount[];
	records: AdministrationRecord[];
	onSelectDay: (day: Date) => void;
	onMonthChange: (month: Date) => void;
}

export function HistoryCalendar({
	month,
	counts,
	records,
	onSelectDay,
	onMonthChange,
}: HistoryCalendarProps) {
	// const [selectedDay] = useState<Date | null>(null)

	const monthStart = startOfMonth(month);
	const monthEnd = endOfMonth(month);
	const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

	const getDayCount = (day: Date) => counts.find((c) => isSameDay(c.date, day));
	const getDayRecords = (day: Date) =>
		records.filter((r) => isSameDay(r.recordedAt, day));

	const getStatusColor = (count: DayCount) => {
		if (count.missed > 0) return "bg-red-500";
		if (count.late > 0) return "bg-yellow-500";
		if (count.onTime > 0) return "bg-green-500";
		if (count.prn > 0) return "bg-blue-500";
		return "bg-gray-300";
	};

	return (
		<div className="space-y-4">
			{/* Calendar Header */}
			<div className="flex items-center justify-between">
				<h2 className="text-2xl font-bold">{format(month, "MMMM yyyy")}</h2>
				<div className="flex items-center gap-2">
					<Button
						variant="outline"
						size="icon"
						onClick={() => onMonthChange(subMonths(month, 1))}
					>
						<ChevronLeft className="h-4 w-4" />
					</Button>
					<Button
						variant="outline"
						size="icon"
						onClick={() => onMonthChange(addMonths(month, 1))}
					>
						<ChevronRight className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{/* Legend */}
			<div className="flex items-center gap-4 text-sm">
				<div className="flex items-center gap-1">
					<div className="w-3 h-3 rounded-full bg-green-500" />
					<span>On-time</span>
				</div>
				<div className="flex items-center gap-1">
					<div className="w-3 h-3 rounded-full bg-yellow-500" />
					<span>Late</span>
				</div>
				<div className="flex items-center gap-1">
					<div className="w-3 h-3 rounded-full bg-red-500" />
					<span>Missed</span>
				</div>
				<div className="flex items-center gap-1">
					<div className="w-3 h-3 rounded-full bg-blue-500" />
					<span>PRN</span>
				</div>
			</div>

			{/* Calendar Grid */}
			<div className="grid grid-cols-7 gap-1">
				{/* Day Headers */}
				{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
					<div
						key={day}
						className="p-2 text-center text-sm font-medium text-muted-foreground"
					>
						{day}
					</div>
				))}

				{/* Calendar Days */}
				{days.map((day) => {
					const dayCount = getDayCount(day);
					const dayRecords = getDayRecords(day);
					const isCurrentMonth = isSameMonth(day, month);

					return (
						<Sheet key={day.toISOString()}>
							<SheetTrigger asChild>
								<button
									className={cn(
										"relative p-2 h-16 border rounded-lg hover:bg-accent transition-colors",
										!isCurrentMonth && "opacity-50",
										dayCount && "cursor-pointer",
									)}
									onClick={() => {
										if (dayCount) {
											setSelectedDay(day);
											onSelectDay(day);
										}
									}}
									disabled={!dayCount}
								>
									<div className="text-sm font-medium">{format(day, "d")}</div>
									{dayCount && (
										<div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
											<div
												className={cn(
													"w-2 h-2 rounded-full",
													getStatusColor(dayCount),
												)}
											/>
										</div>
									)}
								</button>
							</SheetTrigger>

							{dayCount && (
								<SheetContent side="right" className="w-[400px] sm:w-[540px]">
									<SheetHeader>
										<SheetTitle>{format(day, "EEEE, MMMM d, yyyy")}</SheetTitle>
									</SheetHeader>

									<div className="mt-6 space-y-4">
										{/* Day Summary */}
										<div className="grid grid-cols-4 gap-2">
											<div className="text-center">
												<div className="text-2xl font-bold text-green-600">
													{dayCount.onTime}
												</div>
												<div className="text-xs text-muted-foreground">
													On-time
												</div>
											</div>
											<div className="text-center">
												<div className="text-2xl font-bold text-yellow-600">
													{dayCount.late}
												</div>
												<div className="text-xs text-muted-foreground">
													Late
												</div>
											</div>
											<div className="text-center">
												<div className="text-2xl font-bold text-red-600">
													{dayCount.missed}
												</div>
												<div className="text-xs text-muted-foreground">
													Missed
												</div>
											</div>
											<div className="text-center">
												<div className="text-2xl font-bold text-blue-600">
													{dayCount.prn}
												</div>
												<div className="text-xs text-muted-foreground">PRN</div>
											</div>
										</div>

										{/* Day Records */}
										<div className="space-y-2">
											<h4 className="font-medium">Administrations</h4>
											{dayRecords.map((record) => (
												<div
													key={record.id}
													className="flex items-center justify-between p-3 border rounded-lg"
												>
													<div>
														<div className="font-medium">
															{record.animalName} - {record.medicationName}
														</div>
														<div className="text-sm text-muted-foreground">
															{format(record.recordedAt, "h:mm a")} •{" "}
															{record.caregiverName}
														</div>
													</div>
													<Badge
														variant={
															record.status === "on-time"
																? "default"
																: record.status === "missed"
																	? "destructive"
																	: "secondary"
														}
													>
														{record.status}
													</Badge>
												</div>
											))}
										</div>
									</div>
								</SheetContent>
							)}
						</Sheet>
					);
				})}
			</div>
		</div>
	);
}
