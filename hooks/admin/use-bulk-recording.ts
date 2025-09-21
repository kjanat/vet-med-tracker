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
        description: "No household selected or no animals selected",
        title: "Error",
        variant: "destructive",
      });
      return;
    }

    setIsRecording(true);

    try {
      const idempotencyKey = `bulk-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      const result = (await bulkRecordMutation.mutateAsync({
        administeredAt: options.administeredAt.toISOString(),
        allowOverride: options.allowOverride || false,
        animalIds: Array.from(selectedIds),
        dose: options.dose,
        householdId: selectedHouseholdId,
        idempotencyKey,
        inventorySourceId: options.inventorySourceId,
        notes: options.notes,
        regimenId: options.regimenId,
        site: options.site,
      })) as { summary: { failed: number; succeeded: number; total: number } };

      if (result.summary.failed > 0) {
        toast({
          description: `Recorded ${result.summary.succeeded} of ${result.summary.total} administrations. ${result.summary.failed} failed.`,
          title: "Partial Success",
          variant: "default",
        });
      } else {
        toast({
          description: `Successfully recorded ${result.summary.succeeded} administrations.`,
          title: "Success",
        });
        clearSelection();
      }

      return result;
    } catch (error) {
      toast({
        description:
          error instanceof Error
            ? error.message
            : "Failed to record administrations",
        title: "Error",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsRecording(false);
    }
  };

  return {
    canRecord: selectedIds.size > 0 && selectedHouseholdId !== undefined,
    isRecording,
    recordBulkAdministration,
    selectedCount: selectedIds.size,
  };
}
