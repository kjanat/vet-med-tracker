"use client";

import { useState } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { useBulkSelection } from "@/components/providers/bulk-selection-provider";
import { useToast } from "@/hooks/shared/use-toast";
import { trpc } from "@/server/trpc/client";

interface BulkRecordingOptions {
	regimenId: string;
	administeredAt: Date;
	inventorySourceId?: string;
	notes?: string;
	site?: string;
	dose?: string;
	allowOverride?: boolean;
}

export function useBulkRecording() {
	const { selectedIds, clearSelection } = useBulkSelection();
	const { selectedHouseholdId } = useApp();
	const { toast } = useToast();
	const [isRecording, setIsRecording] = useState(false);

	const bulkRecordMutation = trpc.admin.recordBulk.useMutation();

	const recordBulkAdministration = async (options: BulkRecordingOptions) => {
		if (!selectedHouseholdId || selectedIds.size === 0) {
			toast({
				title: "Error",
				description: "No household selected or no animals selected",
				variant: "destructive",
			});
			return;
		}

		setIsRecording(true);

		try {
			const idempotencyKey = `bulk-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

			const result = await bulkRecordMutation.mutateAsync({
				householdId: selectedHouseholdId,
				animalIds: Array.from(selectedIds),
				regimenId: options.regimenId,
				administeredAt: options.administeredAt.toISOString(),
				inventorySourceId: options.inventorySourceId,
				notes: options.notes,
				site: options.site,
				dose: options.dose,
				allowOverride: options.allowOverride || false,
				idempotencyKey,
			});

			if (result.summary.failed > 0) {
				toast({
					title: "Partial Success",
					description: `Recorded ${result.summary.successful} of ${result.summary.total} administrations. ${result.summary.failed} failed.`,
					variant: "default",
				});
			} else {
				toast({
					title: "Success",
					description: `Successfully recorded ${result.summary.successful} administrations.`,
				});
				clearSelection();
			}

			return result;
		} catch (error) {
			toast({
				title: "Error",
				description:
					error instanceof Error
						? error.message
						: "Failed to record administrations",
				variant: "destructive",
			});
			throw error;
		} finally {
			setIsRecording(false);
		}
	};

	return {
		recordBulkAdministration,
		isRecording,
		selectedCount: selectedIds.size,
		canRecord: selectedIds.size > 0 && selectedHouseholdId !== undefined,
	};
}
