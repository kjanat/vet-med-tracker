"use client";

import { endOfMonth, parseISO, startOfMonth } from "date-fns";
import { Suspense, useMemo, useState } from "react";
import { FilterBar } from "@/components/history/filter-bar";
import { HistoryCalendar } from "@/components/history/history-calendar";
import {
	type AdministrationRecord,
	HistoryList,
} from "@/components/history/history-list";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useApp } from "@/components/providers/app-provider";
import { AnimalBreadcrumb } from "@/components/ui/animal-breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { useHistoryFilters } from "@/hooks/useHistoryFilters";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { trpc } from "@/server/trpc/client";
import { localDayISO } from "@/utils/tz";

// We'll fetch real data using tRPC instead of mock data

function HistoryContent() {
	const { filters } = useHistoryFilters();
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const { selectedHousehold } = useApp();
	const { enqueue } = useOfflineQueue();

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
			animalName: record.animalName || "Unknown",
			medicationName: record.medicationName || "Unknown",
			strength: record.strength || "",
			route: record.route || "Unknown",
			form: record.form || "Unknown",
			slot: record.slot || undefined,
			scheduledFor: record.scheduledFor
				? new Date(record.scheduledFor)
				: undefined,
			recordedAt: new Date(record.recordedAt),
			caregiverName: record.caregiverName || "Unknown",
			status: record.status as AdministrationRecord["status"],
			cosignPending: record.cosignPending || false,
			sourceItem: record.sourceItem
				? {
						name: record.sourceItem.name,
						lot: record.sourceItem.lot || undefined,
						expiresOn: record.sourceItem.expiresOn
							? new Date(record.sourceItem.expiresOn)
							: undefined,
					}
				: undefined,
			site: record.site || undefined,
			notes: record.notes || undefined,
			isEdited: record.isEdited || false,
			editedBy: record.editedBy || undefined,
			editedAt: record.editedAt ? new Date(record.editedAt) : undefined,
			isDeleted: record.isDeleted || false,
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
				filtered = filtered.filter((r) => r.status !== "prn");
			} else if (filters.type === "prn") {
				filtered = filtered.filter((r) => r.status === "prn");
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
		try {
			// TODO: Implement undo mutation when available
			console.log("Undoing record:", id);
			// await trpc.admin.undo.mutate({ recordId: id, householdId: selectedHousehold.id });
		} catch (error) {
			// Queue for offline sync
			await enqueue(
				"admin.undo",
				{ recordId: id, householdId: selectedHousehold?.id },
				`undo:${id}`,
			);
			console.error("Failed to undo record, queued for offline sync:", error);
		}
	};

	const handleDelete = async (id: string) => {
		try {
			// TODO: Implement delete mutation when available
			console.log("Deleting record:", id);
			// await trpc.admin.delete.mutate({ recordId: id, householdId: selectedHousehold.id });
		} catch (error) {
			// Queue for offline sync
			await enqueue(
				"admin.delete",
				{ recordId: id, householdId: selectedHousehold?.id },
				`delete:${id}`,
			);
			console.error("Failed to delete record, queued for offline sync:", error);
		}
	};

	const handleCosign = async (id: string) => {
		try {
			// TODO: Implement cosign mutation when available
			console.log("Co-signing record:", id);
			// await trpc.admin.cosign.mutate({ recordId: id, householdId: selectedHousehold.id });
		} catch (error) {
			// Queue for offline sync
			await enqueue(
				"admin.cosign",
				{ recordId: id, householdId: selectedHousehold?.id },
				`cosign:${id}`,
			);
			console.error("Failed to cosign record, queued for offline sync:", error);
		}
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

	// Loading state
	if (isLoading) {
		return (
			<div className="bg-background max-w-full overflow-x-hidden">
				<FilterBar />
				<div className="p-4 md:p-6">
					<div className="flex items-center justify-center py-12">
						<div className="text-center">
							<div className="animate-pulse">
								<div className="h-8 w-32 bg-muted rounded mb-2 mx-auto"></div>
								<div className="h-4 w-48 bg-muted rounded mx-auto"></div>
							</div>
							<p className="text-muted-foreground mt-4">
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
			<div className="bg-background max-w-full overflow-x-hidden">
				<FilterBar />
				<div className="p-4 md:p-6">
					<div className="flex items-center justify-center py-12">
						<div className="text-center">
							<h3 className="text-lg font-medium mb-2 text-destructive">
								Failed to load history
							</h3>
							<p className="text-muted-foreground mb-4">
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

	// No household selected
	if (!selectedHousehold) {
		return (
			<div className="bg-background max-w-full overflow-x-hidden">
				<FilterBar />
				<div className="p-4 md:p-6">
					<div className="flex items-center justify-center py-12">
						<div className="text-center">
							<h3 className="text-lg font-medium mb-2">
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

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">History</h1>
				<p className="text-muted-foreground">
					View past medication administrations and compliance
				</p>
			</div>

			<FilterBar />

			<div>
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
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator orientation="vertical" className="mr-2 h-4" />
					<AnimalBreadcrumb />
				</header>
				<div className="flex flex-1 flex-col gap-4 p-4 pt-6">
					<Suspense fallback={<div className="bg-background animate-pulse" />}>
						<HistoryContent />
					</Suspense>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
