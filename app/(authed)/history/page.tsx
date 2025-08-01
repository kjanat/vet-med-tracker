"use client";

import { endOfMonth, parseISO, startOfMonth } from "date-fns";
import { Suspense, useMemo, useState } from "react";
import { FilterBar } from "@/components/history/filter-bar";
import { HistoryCalendar } from "@/components/history/history-calendar";
import {
	type AdministrationRecord,
	HistoryList,
} from "@/components/history/history-list";
import { useHistoryFilters } from "@/hooks/useHistoryFilters";
import { localDayISO } from "@/utils/tz";

// Mock data - replace with tRPC queries
const mockRecords: AdministrationRecord[] = [
	{
		id: "1",
		animalId: "1",
		animalName: "Buddy",
		medicationName: "Rimadyl",
		strength: "75mg",
		route: "Oral",
		form: "Tablet",
		slot: "Morning",
		scheduledFor: new Date(Date.now() - 2 * 60 * 60 * 1000),
		recordedAt: new Date(Date.now() - 2 * 60 * 60 * 1000 + 5 * 60 * 1000),
		caregiverName: "Alex",
		status: "late",
		cosignPending: false,
		sourceItem: {
			name: "Rimadyl 75mg",
			lot: "ABC123",
			expiresOn: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
		},
		notes: "Took with food as recommended",
		isEdited: false,
		isDeleted: false,
	},
	{
		id: "2",
		animalId: "2",
		animalName: "Whiskers",
		medicationName: "Insulin",
		strength: "2 units",
		route: "Subcutaneous",
		form: "Injection",
		slot: "Morning",
		scheduledFor: new Date(Date.now() - 24 * 60 * 60 * 1000),
		recordedAt: new Date(Date.now() - 24 * 60 * 60 * 1000 - 30 * 60 * 1000),
		caregiverName: "Sam",
		status: "on-time",
		cosignPending: true,
		site: "Left shoulder",
		isEdited: false,
		isDeleted: false,
	},
	{
		id: "3",
		animalId: "1",
		animalName: "Buddy",
		medicationName: "Pain Relief",
		strength: "5ml",
		route: "Oral",
		form: "Liquid",
		recordedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
		caregiverName: "Alex",
		status: "prn",
		cosignPending: false,
		notes: "Given after limping noticed",
		isEdited: true,
		editedBy: "Alex",
		editedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 10 * 60 * 1000),
		isDeleted: false,
	},
	// Auto-missed entry
	{
		id: "missed-1",
		animalId: "3",
		animalName: "Charlie",
		medicationName: "Antibiotics",
		strength: "250mg",
		route: "Oral",
		form: "Tablet",
		slot: "Evening",
		scheduledFor: new Date(Date.now() - 25 * 60 * 60 * 1000),
		recordedAt: new Date(Date.now() - 23 * 60 * 60 * 1000), // Auto-generated at cutoff
		caregiverName: "System",
		status: "missed",
		cosignPending: false,
		isEdited: false,
		isDeleted: false,
	},
];

function HistoryContent() {
	const { filters } = useHistoryFilters();
	const [currentMonth, setCurrentMonth] = useState(new Date());

	// Filter records based on current filters
	const filteredRecords = useMemo(() => {
		let filtered = mockRecords;

		// Filter by animal
		if (filters.animalId) {
			filtered = filtered.filter((r) => r.animalId === filters.animalId);
		}

		// Filter by type
		if (filters.type !== "all") {
			if (filters.type === "scheduled") {
				filtered = filtered.filter((r) => r.status !== "prn");
			} else if (filters.type === "prn") {
				filtered = filtered.filter((r) => r.status === "prn");
			}
		}

		// Filter by date range
		const fromDate = parseISO(filters.from);
		const toDate = parseISO(filters.to);
		filtered = filtered.filter((r) => {
			const recordDate = new Date(
				r.recordedAt.getFullYear(),
				r.recordedAt.getMonth(),
				r.recordedAt.getDate(),
			);
			return recordDate >= fromDate && recordDate <= toDate;
		});

		return filtered.sort(
			(a, b) => b.recordedAt.getTime() - a.recordedAt.getTime(),
		);
	}, [filters]);

	// Group records by local day for list view
	const groupedRecords = useMemo(() => {
		const groups = new Map<string, AdministrationRecord[]>();

		filteredRecords.forEach((record) => {
			const localDay = localDayISO(record.recordedAt, "America/New_York");
			if (!groups.has(localDay)) {
				groups.set(localDay, []);
			}
			groups.get(localDay)?.push(record);
		});

		return Array.from(groups.entries())
			.map(([dateStr, records]) => ({
				date: parseISO(dateStr),
				records: records.sort(
					(a, b) => b.recordedAt.getTime() - a.recordedAt.getTime(),
				),
			}))
			.sort((a, b) => b.date.getTime() - a.date.getTime());
	}, [filteredRecords]);

	// Generate daily counts for calendar view
	const dailyCounts = useMemo(() => {
		const monthStart = startOfMonth(currentMonth);
		const monthEnd = endOfMonth(currentMonth);
		const monthRecords = filteredRecords.filter(
			(r) => r.recordedAt >= monthStart && r.recordedAt <= monthEnd,
		);

		const counts = new Map<
			string,
			{
				total: number;
				onTime: number;
				late: number;
				missed: number;
				prn: number;
			}
		>();

		monthRecords.forEach((record) => {
			const dayKey = localDayISO(record.recordedAt, "America/New_York");
			if (!counts.has(dayKey)) {
				counts.set(dayKey, { total: 0, onTime: 0, late: 0, missed: 0, prn: 0 });
			}

			const count = counts.get(dayKey);
			if (!count) return;
			count.total++;

			switch (record.status) {
				case "on-time":
					count.onTime++;
					break;
				case "late":
				case "very-late":
					count.late++;
					break;
				case "missed":
					count.missed++;
					break;
				case "prn":
					count.prn++;
					break;
			}
		});

		return Array.from(counts.entries()).map(([dateStr, count]) => ({
			date: parseISO(dateStr),
			...count,
		}));
	}, [filteredRecords, currentMonth]);

	const handleUndo = async (id: string) => {
		// Optimistic update
		console.log("Undoing record:", id);

		// TODO: Implement undo mutation
		// await enqueue("admin.undo", { recordId: id }, `undo:${id}`);
	};

	const handleDelete = async (id: string) => {
		// Optimistic update
		console.log("Deleting record:", id);

		// TODO: Implement delete mutation
		// await enqueue("admin.delete", { recordId: id }, `delete:${id}`);
	};

	const handleCosign = async (id: string) => {
		// Optimistic update
		console.log("Co-signing record:", id);

		// TODO: Implement cosign mutation
		// await enqueue("admin.cosign", { recordId: id }, `cosign:${id}`);
	};

	const handleLoadMore = () => {
		// Implement pagination
		console.log("Loading more records...");
	};

	const handleSelectDay = (day: Date) => {
		// Update filters to show only that day
		// const dayStr = day.toISOString().split("T")[0]
		// setFilters({ ...filters, from: dayStr, to: dayStr, view: "list" })
		console.log("Selected day:", day);
	};

	return (
		<div className="min-h-screen bg-background max-w-full overflow-x-hidden">
			<FilterBar />

			<div className="p-4 md:p-6">
				{filters.view === "list" ? (
					<HistoryList
						groups={groupedRecords}
						onLoadMore={handleLoadMore}
						hasMore={false} // Implement pagination logic
						onUndo={handleUndo}
						onDelete={handleDelete}
						onCosign={handleCosign}
					/>
				) : (
					<HistoryCalendar
						month={currentMonth}
						counts={dailyCounts}
						records={filteredRecords}
						onSelectDay={handleSelectDay}
						onMonthChange={setCurrentMonth}
					/>
				)}
			</div>
		</div>
	);
}

export default function HistoryPage() {
	return (
		<Suspense
			fallback={<div className="min-h-screen bg-background animate-pulse" />}
		>
			<HistoryContent />
		</Suspense>
	);
}
