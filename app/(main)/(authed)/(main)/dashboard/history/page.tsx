"use client";

import { endOfMonth, parseISO, startOfMonth } from "date-fns";
import { Suspense, useMemo, useState } from "react";
import { FilterBar } from "@/components/history/filter-bar";
import { HistoryCalendar } from "@/components/history/history-calendar";
import { HistoryList } from "@/components/history/history-list";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { useHistoryFilters } from "@/hooks/history/useHistoryFilters";
// import { useOfflineQueue } from "@/hooks/offline/useOfflineQueue"; // TODO: Uncomment when mutations are implemented
import type { AdministrationRecord } from "@/lib/utils/types";
import { trpc } from "@/server/trpc/client";
import { localDayISO } from "@/utils/tz";

// We'll fetch real data using tRPC instead of mock data

function HistoryContent() {
	const { filters } = useHistoryFilters();
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const { selectedHousehold } = useApp();
	// const { enqueue } = useOfflineQueue(); // TODO: Uncomment when mutations are implemented

	// Fetch household data to determine loading state
	const { isLoading: isLoadingHouseholds } = trpc.household.list.useQuery(
		undefined,
		{
			enabled: true,
		},
	);

	// Fetch administration records from tRPC
	const {
		data: adminRecords,
		isLoading,
		error,
	} = trpc.admin.list.useQuery(
		{
			householdId: selectedHousehold?.id || "",
			startDate: `${filters.from}T00:00:00.000Z`,
			endDate: `${filters.to}T23:59:59.999Z`,
		},
		{
			enabled: !!selectedHousehold?.id,
		},
	);

	// Transform API data to AdministrationRecord format
	const transformedRecords: AdministrationRecord[] = useMemo(() => {
		if (!adminRecords) return [];

		return adminRecords.map((record) => ({
			id: record.id,
			animalId: record.animalId,
			animalName: "Unknown", // TODO: Join with animals table
			medicationName: "Unknown", // TODO: Join with regimens/medications table
			strength: "", // TODO: Join with medications table
			route: "Unknown", // TODO: Join with medications table
			form: "Unknown", // TODO: Join with medications table
			slot: undefined, // TODO: Implement slot logic
			scheduledFor: record.scheduledFor
				? new Date(record.scheduledFor)
				: undefined,
			recordedAt: new Date(record.recordedAt),
			caregiverName: "Unknown", // TODO: Join with users table
			status: record.status as AdministrationRecord["status"],
			cosignPending: false, // TODO: Implement cosign logic
			sourceItem: undefined, // TODO: Join with inventory items
			site: record.site || undefined,
			notes: record.notes || undefined,
			isEdited: false, // TODO: Implement edit tracking
			editedBy: undefined,
			editedAt: undefined,
			isDeleted: false, // TODO: Implement soft delete
		}));
	}, [adminRecords]);

	// Filter records based on current filters
	const filteredRecords = useMemo(() => {
		let filtered = transformedRecords;

		// Filter by animal
		if (filters.animalId) {
			filtered = filtered.filter((r) => r.animalId === filters.animalId);
		}

		// Filter by type
		if (filters.type !== "all") {
			if (filters.type === "scheduled") {
				filtered = filtered.filter((r) => r.status !== "PRN");
			} else if (filters.type === "prn") {
				filtered = filtered.filter((r) => r.status === "PRN");
			}
		}

		return filtered.sort(
			(a, b) => b.recordedAt.getTime() - a.recordedAt.getTime(),
		);
	}, [transformedRecords, filters]);

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
				case "ON_TIME":
					count.onTime++;
					break;
				case "LATE":
				case "VERY_LATE":
					count.late++;
					break;
				case "MISSED":
					count.missed++;
					break;
				case "PRN":
					count.prn++;
					break;
			}
		});

		return Array.from(counts.entries()).map(([dateStr, count]) => ({
			date: parseISO(dateStr),
			...count,
		}));
	}, [filteredRecords, currentMonth]);

	const utils = trpc.useUtils();

	const undoMutation = trpc.admin.undo.useMutation({
		onSuccess: () => {
			// Refetch the administration list
			utils.admin.list.invalidate();
		},
		onError: (error) => {
			console.error("Failed to undo administration:", error);
			// TODO: Show error toast
		},
	});

	const deleteMutation = trpc.admin.delete.useMutation({
		onSuccess: () => {
			// Refetch the administration list
			utils.admin.list.invalidate();
		},
		onError: (error) => {
			console.error("Failed to delete administration:", error);
			// TODO: Show error toast
		},
	});

	const cosignMutation = trpc.admin.cosign.useMutation({
		onSuccess: () => {
			// Refetch the administration list
			utils.admin.list.invalidate();
		},
		onError: (error) => {
			console.error("Failed to co-sign administration:", error);
			// TODO: Show error toast
		},
	});

	const handleUndo = async (id: string) => {
		if (!selectedHousehold?.id) return;

		try {
			await undoMutation.mutateAsync({
				recordId: id,
				householdId: selectedHousehold.id,
			});
		} catch {
			// Error handling is done in onError above
		}

		// TODO: Queue for offline sync when offline queue is implemented
		// await enqueue(
		//   "admin.undo",
		//   { recordId: id, householdId: selectedHousehold?.id },
		//   `undo:${id}`,
		// );
	};

	const handleDelete = async (id: string) => {
		if (!selectedHousehold?.id) return;

		try {
			await deleteMutation.mutateAsync({
				recordId: id,
				householdId: selectedHousehold.id,
			});
		} catch {
			// Error handling is done in onError above
		}

		// TODO: Queue for offline sync when offline queue is implemented
		// await enqueue(
		//   "admin.delete",
		//   { recordId: id, householdId: selectedHousehold?.id },
		//   `delete:${id}`,
		// );
	};

	const handleCosign = async (id: string, notes?: string) => {
		if (!selectedHousehold?.id) return;

		try {
			await cosignMutation.mutateAsync({
				recordId: id,
				householdId: selectedHousehold.id,
				notes,
			});
		} catch {
			// Error handling is done in onError above
		}

		// TODO: Queue for offline sync when offline queue is implemented
		// await enqueue(
		//   "admin.cosign",
		//   { recordId: id, householdId: selectedHousehold?.id, notes },
		//   `cosign:${id}`,
		// );
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

	// Initial loading state (when households are still loading)
	if (isLoadingHouseholds) {
		return (
			<div className="max-w-full overflow-x-hidden bg-background">
				<FilterBar />
				<div className="p-4 md:p-6">
					<div className="flex items-center justify-center py-12">
						<div className="text-center">
							<div className="animate-pulse">
								<div className="mx-auto mb-2 h-8 w-32 rounded bg-muted"></div>
								<div className="mx-auto h-4 w-48 rounded bg-muted"></div>
							</div>
							<p className="mt-4 text-muted-foreground">Loading...</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// No household selected (only after households have loaded)
	if (!selectedHousehold) {
		return (
			<div className="max-w-full overflow-x-hidden bg-background">
				<FilterBar />
				<div className="p-4 md:p-6">
					<div className="flex items-center justify-center py-12">
						<div className="text-center">
							<h3 className="mb-2 font-medium text-lg">
								No household selected
							</h3>
							<p className="text-muted-foreground">
								Please select a household to view administration history
							</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// History loading state (when household is selected but history is loading)
	if (isLoading) {
		return (
			<div className="max-w-full overflow-x-hidden bg-background">
				<FilterBar />
				<div className="p-4 md:p-6">
					<div className="flex items-center justify-center py-12">
						<div className="text-center">
							<div className="animate-pulse">
								<div className="mx-auto mb-2 h-8 w-32 rounded bg-muted"></div>
								<div className="mx-auto h-4 w-48 rounded bg-muted"></div>
							</div>
							<p className="mt-4 text-muted-foreground">
								Loading administration history...
							</p>
						</div>
					</div>
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="max-w-full overflow-x-hidden bg-background">
				<FilterBar />
				<div className="p-4 md:p-6">
					<div className="flex items-center justify-center py-12">
						<div className="text-center">
							<h3 className="mb-2 font-medium text-destructive text-lg">
								Failed to load history
							</h3>
							<p className="mb-4 text-muted-foreground">
								{error.message || "An unexpected error occurred"}
							</p>
							<button
								type="button"
								onClick={() => window.location.reload()}
								className="text-primary hover:underline"
							>
								Try again
							</button>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<FilterBar />

			<div>
				{filters.view === "list" ? (
					<HistoryList
						groups={groupedRecords}
						onLoadMore={handleLoadMore}
						hasMore={false} // Implement pagination logic
						onUndo={handleUndo}
						onDelete={handleDelete}
						onCosign={(id) => handleCosign(id)}
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
		<Suspense fallback={<div className="animate-pulse bg-background" />}>
			<HistoryContent />
		</Suspense>
	);
}
