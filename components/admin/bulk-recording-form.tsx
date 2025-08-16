"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Check, Clock, X } from "lucide-react";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { useBulkSelection } from "@/components/providers/bulk-selection-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/shared/use-toast";
import { trpc } from "@/server/trpc/client";

// Form validation schema
const bulkRecordingSchema = z.object({
  regimenId: z.string().min(1, "Please select a regimen"),
  administeredAt: z.date(),
  inventorySourceId: z.string().optional(),
  notes: z.string().optional(),
  site: z.string().optional(),
  dose: z.string().optional(),
  allowOverride: z.boolean(),
});

type BulkRecordingFormData = z.infer<typeof bulkRecordingSchema>;

interface BulkRecordingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AnimalRegimen {
  id: string;
  animalId: string;
  animalName: string;
  medicationName: string;
  dose: string;
  route: string | null;
  scheduleType: string;
}

interface RecordingResult {
  animalId: string;
  animalName: string;
  success: boolean;
  error?: string;
}

export function BulkRecordingForm({
  open,
  onOpenChange,
}: BulkRecordingFormProps) {
  const { selectedIds, clearSelection } = useBulkSelection();
  const { selectedHouseholdId } = useApp();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<RecordingResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const form = useForm<BulkRecordingFormData>({
    resolver: zodResolver(bulkRecordingSchema),
    defaultValues: {
      administeredAt: new Date(),
      allowOverride: false,
    },
  });

  // Get animals and their regimens
  const { data: animalsWithRegimens = [] } =
    trpc.regimen.listByAnimals.useQuery(
      {
        householdId: selectedHouseholdId || "",
        animalIds: Array.from(selectedIds),
      },
      {
        enabled:
          open && selectedHouseholdId !== undefined && selectedIds.size > 0,
      },
    );

  // Get available regimens (common across selected animals)
  const commonRegimens = React.useMemo(() => {
    if (animalsWithRegimens.length === 0) return [];

    // Find regimens that exist for all selected animals
    const regimenCounts = new Map<
      string,
      { count: number; regimen: AnimalRegimen }
    >();

    for (const animalData of animalsWithRegimens) {
      for (const regimen of animalData.regimens) {
        const key = regimen.id;
        const existing = regimenCounts.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          regimenCounts.set(key, { count: 1, regimen });
        }
      }
    }

    return Array.from(regimenCounts.values())
      .filter((item) => item.count === selectedIds.size)
      .map((item) => item.regimen);
  }, [animalsWithRegimens, selectedIds.size]);

  // Bulk recording mutation
  const bulkRecordMutation = trpc.admin.recordBulk.useMutation();

  const handleSubmit = async (data: BulkRecordingFormData) => {
    if (!selectedHouseholdId || selectedIds.size === 0) return;

    setIsSubmitting(true);
    setProgress(0);
    setResults([]);

    try {
      // Normalize to the minute for stability (adjust granularity as needed)
      const normalizedIso = new Date(
        new Date(data.administeredAt).setSeconds(0, 0),
      ).toISOString();
      const idempotencyKey = [
        "bulk",
        selectedHouseholdId,
        Array.from(selectedIds).sort().join(","),
        data.regimenId,
        normalizedIso,
      ].join(":");

      const result = await bulkRecordMutation.mutateAsync({
        householdId: selectedHouseholdId,
        animalIds: Array.from(selectedIds),
        regimenId: data.regimenId,
        administeredAt: data.administeredAt.toISOString(),
        inventorySourceId: data.inventorySourceId || undefined,
        notes: data.notes || undefined,
        site: data.site || undefined,
        dose: data.dose || undefined,
        allowOverride: data.allowOverride,
        idempotencyKey,
      });

      setResults(result.results);
      setProgress(100);

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
      }

      setShowResults(true);
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to record administrations",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onOpenChange(false);
      if (showResults) {
        clearSelection();
        setShowResults(false);
        setResults([]);
        form.reset();
      }
    }
  };

  const retryFailedRecords = async () => {
    const failedResults = results.filter((r) => !r.success);
    if (failedResults.length === 0) return;

    // Update progress to show retry attempt
    setIsSubmitting(true);
    setProgress(0);

    try {
      const data = form.getValues();
      const normalizedIso = new Date(
        new Date(data.administeredAt).setSeconds(0, 0),
      ).toISOString();
      const idempotencyKey = [
        "bulk-retry",
        selectedHouseholdId || "",
        failedResults
          .map((r) => r.animalId)
          .sort()
          .join(","),
        data.regimenId,
        normalizedIso,
      ].join(":");

      const result = await bulkRecordMutation.mutateAsync({
        householdId: selectedHouseholdId || "",
        animalIds: failedResults.map((r) => r.animalId),
        regimenId: data.regimenId,
        administeredAt: data.administeredAt.toISOString(),
        inventorySourceId: data.inventorySourceId || undefined,
        notes: data.notes || undefined,
        site: data.site || undefined,
        dose: data.dose || undefined,
        allowOverride: data.allowOverride,
        idempotencyKey,
      });

      // Merge retry results with original results
      const updatedResults = results.map((original) => {
        const retryResult = result.results.find(
          (r) => r.animalId === original.animalId,
        );
        return retryResult || original;
      });

      setResults(updatedResults);
      setProgress(100);

      const stillFailed = updatedResults.filter((r) => !r.success).length;
      if (stillFailed === 0) {
        toast({
          title: "Retry Successful",
          description: "All failed records have been successfully processed.",
        });
      } else {
        toast({
          title: "Partial Retry Success",
          description: `${result.summary.successful} records succeeded, ${stillFailed} still failed.`,
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Retry Failed",
        description:
          error instanceof Error ? error.message : "Retry operation failed",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showResults
              ? "Recording Results"
              : `Record Administration for ${selectedIds.size} Animals`}
          </DialogTitle>
          <DialogDescription>
            {showResults
              ? "Review the results of the bulk administration recording"
              : "Record medication administration for multiple animals at once"}
          </DialogDescription>
        </DialogHeader>

        {showResults ? (
          <div className="space-y-4">
            {/* Results Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="font-bold text-2xl text-green-600">
                      {results.filter((r) => r.success).length}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      Successful
                    </div>
                  </div>
                  <div>
                    <div className="font-bold text-2xl text-red-600">
                      {results.filter((r) => !r.success).length}
                    </div>
                    <div className="text-muted-foreground text-sm">Failed</div>
                  </div>
                  <div>
                    <div className="font-bold text-2xl">{results.length}</div>
                    <div className="text-muted-foreground text-sm">Total</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detailed Results */}
            <div className="space-y-2">
              <h3 className="font-medium">Detailed Results</h3>
              {results.map((result) => (
                <div
                  key={result.animalId}
                  className="flex items-center justify-between rounded border p-3"
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <X className="h-4 w-4 text-red-600" />
                    )}
                    <span className="font-medium">{result.animalName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <Badge variant="default">Success</Badge>
                    ) : (
                      <>
                        <Badge variant="destructive">Failed</Badge>
                        {result.error && (
                          <span className="text-muted-foreground text-sm">
                            {result.error}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              {results.some((r) => !r.success) && (
                <Button
                  onClick={retryFailedRecords}
                  disabled={isSubmitting}
                  variant="outline"
                >
                  Retry Failed
                </Button>
              )}
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6"
            >
              {/* Selected Animals Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Selected Animals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-muted-foreground text-sm">
                    {selectedIds.size} animals selected for bulk recording
                  </div>
                </CardContent>
              </Card>

              {/* Progress Bar (when submitting) */}
              {isSubmitting && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Recording administrations...</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}

              {/* Regimen Selection */}
              <FormField
                control={form.control}
                name="regimenId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Regimen</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a regimen available for all animals" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {commonRegimens.map((regimen) => (
                          <SelectItem key={regimen.id} value={regimen.id}>
                            <div className="flex flex-col">
                              <span>{regimen.medicationName}</span>
                              <span className="text-muted-foreground text-sm">
                                {regimen.dose} - {regimen.route} -{" "}
                                {regimen.scheduleType}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Only regimens available for all selected animals are shown
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Administration Date/Time */}
              <FormField
                control={form.control}
                name="administeredAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Administration Date & Time</FormLabel>
                    <FormControl>
                      <div className="flex gap-2">
                        <Input
                          type="date"
                          value={
                            field.value ? format(field.value, "yyyy-MM-dd") : ""
                          }
                          onChange={(e) => {
                            const date = new Date(e.target.value);
                            if (field.value) {
                              date.setHours(field.value.getHours());
                              date.setMinutes(field.value.getMinutes());
                            }
                            field.onChange(date);
                          }}
                        />
                        <Input
                          type="time"
                          value={
                            field.value ? format(field.value, "HH:mm") : ""
                          }
                          onChange={(e) => {
                            const [hours, minutes] = e.target.value.split(":");
                            const date = field.value
                              ? new Date(field.value)
                              : new Date();
                            date.setHours(Number.parseInt(hours || "0"));
                            date.setMinutes(Number.parseInt(minutes || "0"));
                            field.onChange(date);
                          }}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Optional Fields */}
              <Separator />

              <FormField
                control={form.control}
                name="dose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dose Override (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="Override default dose" {...field} />
                    </FormControl>
                    <FormDescription>
                      Leave empty to use the regimen's default dose
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="site"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Administration Site (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Left ear, Right thigh"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes for all administrations..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit Buttons */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    selectedIds.size === 0 ||
                    commonRegimens.length === 0
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Clock className="mr-2 h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    `Record for ${selectedIds.size} Animals`
                  )}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
