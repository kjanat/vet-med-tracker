"use client";

import { AlertTriangle, Archive, Clock, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type Regimen,
  RegimenDataService,
} from "@/lib/services/regimen-data.service";
import { RegimenDisplayService } from "@/lib/services/regimen-display.service";
import { RegimenSchedulingService } from "@/lib/services/regimen-scheduling.service";
import {
  type MedicalValidationResult,
  RegimenValidationService,
} from "@/lib/services/regimen-validation.service";
import { trpc } from "@/server/trpc/client";
import { RegimenForm } from "./regimen-form";

interface ValidationPayload {
  age?: number;
  allergies?: string[];
  conditions?: string[];
  dose: string;
  highRisk: boolean;
  name: string;
  route: string;
  species: string;
  weight: number;
  existingMedications?: string[];
}

function isValidationPayload(value: unknown): value is ValidationPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<ValidationPayload>;
  return (
    typeof payload.dose === "string" &&
    typeof payload.name === "string" &&
    typeof payload.route === "string" &&
    typeof payload.species === "string" &&
    typeof payload.weight === "number" &&
    typeof payload.highRisk === "boolean"
  );
}

// Re-export types from service
export type {
  Regimen,
  RegimenWithDetails,
} from "@/lib/services/regimen-data.service";

export function RegimenList() {
  const [selectedAnimalId, setSelectedAnimalId] = useState<string>("all");
  const [editingRegimen, setEditingRegimen] = useState<Regimen | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { animals, selectedHousehold } = useApp();

  // Fetch regimens using tRPC
  const {
    data: regimenData,
    isLoading,
    error,
    refetch,
  } = trpc.regimen.list.useQuery(
    {
      activeOnly: true,
      animalId: selectedAnimalId === "all" ? undefined : selectedAnimalId,
      householdId: selectedHousehold?.id || "",
    },
    {
      enabled: Boolean(selectedHousehold?.id),
    },
  );

  // Transform and filter regimens using data service
  const regimens = regimenData
    ? RegimenDataService.transformRegimenData(regimenData, {
        validate: (regimen: unknown) => {
          if (!isValidationPayload(regimen)) {
            return {
              errors: [] as string[],
              isValid: true,
              riskLevel: "LOW",
              warnings: [] as string[],
            } satisfies MedicalValidationResult;
          }

          return RegimenValidationService.validateRegimen(
            {
              dose: regimen.dose,
              highRisk: regimen.highRisk,
              name: regimen.name,
              route: regimen.route,
            },
            {
              age: regimen.age,
              allergies: regimen.allergies,
              conditions: regimen.conditions,
              species: regimen.species,
              weight: regimen.weight,
            },
            regimen.existingMedications ?? [],
          );
        },
      })
    : [];

  const filteredRegimens = RegimenDataService.filterRegimens(regimens, {
    activeOnly: true,
    animalId: selectedAnimalId,
    excludeEnded: true,
  });

  // Group by animal using data service
  const groupedRegimens =
    RegimenDataService.groupRegimensByAnimal(filteredRegimens);

  const handleEdit = (regimen: Regimen) => {
    setEditingRegimen(regimen);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingRegimen(null);
    setIsFormOpen(true);
  };

  // tRPC mutations
  const createRegimen = trpc.regimen.create.useMutation({
    onError: (error) => {
      console.error("Failed to create regimen:", error);
    },
    onSuccess: () => {
      refetch(); // Refresh the list
    },
  });

  const updateRegimen = trpc.regimen.update.useMutation({
    onError: (error) => {
      console.error("Failed to update regimen:", error);
    },
    onSuccess: () => {
      refetch(); // Refresh the list
    },
  });

  // Helper functions using scheduling service
  const formatDateForAPI = (date?: Date) => date?.toISOString().slice(0, 10);

  const formatDateForAPIRequired = (date?: Date): string => {
    const isoDate = (date || new Date()).toISOString();
    const datePart = isoDate.split("T")[0];
    return datePart ?? isoDate; // Fallback to full ISO string if split fails
  };

  // Validate schedule conflicts when creating/updating regimens
  const validateScheduleConflicts = (
    newSchedule: string[],
    medicationName: string,
  ) => {
    const existingSchedules = regimens
      .filter((r) => r.id !== editingRegimen?.id && r.status === "active")
      .map((r) => ({
        highRisk: r.highRisk,
        medicationName: r.medicationName,
        times: r.timesLocal || [],
      }));

    return RegimenSchedulingService.checkScheduleConflicts(
      { medicationName, times: newSchedule },
      existingSchedules,
    );
  };

  // Type for regimen update input based on tRPC schema
  type RegimenUpdateInput = {
    id: string;
    householdId: string;
    name?: string;
    instructions?: string;
    scheduleType?: "FIXED" | "PRN" | "INTERVAL" | "TAPER";
    timesLocal?: string[];
    intervalHours?: number;
    startDate?: string;
    endDate?: string;
    prnReason?: string;
    maxDailyDoses?: number;
    cutoffMinutes?: number;
    highRisk?: boolean;
    requiresCoSign?: boolean;
    dose?: string;
    route?: string;
  };

  const buildUpdateData = (
    data: Partial<Regimen>,
    householdId: string,
  ): RegimenUpdateInput => {
    if (!editingRegimen) {
      throw new Error("No regimen selected for editing");
    }
    const updateData: RegimenUpdateInput = {
      cutoffMinutes: data.cutoffMins,
      dose: data.strength || "",
      highRisk: data.highRisk,
      householdId,
      id: editingRegimen.id,
      instructions:
        `${data.strength || ""} ${data.form || ""} - ${data.route || ""}`.trim(),
      name: data.medicationName,
      requiresCoSign: data.highRisk, // High risk medications require co-sign
      route: data.route,
      scheduleType: data.scheduleType as "FIXED" | "PRN" | "INTERVAL" | "TAPER",
      timesLocal: data.timesLocal,
    };

    // Only add dates if they exist
    if (data.startDate) {
      updateData.startDate = formatDateForAPI(data.startDate);
    }
    if (data.endDate) {
      updateData.endDate = formatDateForAPI(data.endDate);
    }

    return updateData;
  };

  // Type for regimen create input based on tRPC schema
  type RegimenCreateInput = {
    householdId: string;
    animalId: string;
    medicationId?: string;
    scheduleType: "FIXED" | "PRN" | "INTERVAL" | "TAPER";
    startDate: string;
    name?: string;
    instructions?: string;
    timesLocal?: string[];
    intervalHours?: number;
    endDate?: string;
    prnReason?: string;
    maxDailyDoses?: number;
    cutoffMinutes?: number;
    highRisk?: boolean;
    requiresCoSign?: boolean;
    dose?: string;
    route?: string;
  };

  const buildCreateData = (
    data: Partial<Regimen>,
    householdId: string,
  ): RegimenCreateInput => {
    const createData: RegimenCreateInput = {
      animalId: data.animalId || "",
      cutoffMinutes: data.cutoffMins || 240,
      dose: data.strength || "",
      highRisk: data.highRisk || false,
      householdId,
      instructions:
        `${data.strength || ""} ${data.form || ""} - ${data.route || ""}`.trim(),
      medicationId: data.medicationId || undefined,
      name: data.medicationName,
      requiresCoSign: data.highRisk || false, // High risk medications require co-sign
      route: data.route,
      scheduleType: data.scheduleType as "FIXED" | "PRN" | "INTERVAL" | "TAPER",
      startDate: formatDateForAPIRequired(data.startDate),
      timesLocal: data.timesLocal,
    };

    // Only add endDate if it exists
    if (data.endDate) {
      createData.endDate = formatDateForAPI(data.endDate);
    }

    return createData;
  };

  const fireInstrumentationEvent = (data: Partial<Regimen>) => {
    window.dispatchEvent(
      new CustomEvent(
        editingRegimen
          ? "settings_regimens_update"
          : "settings_regimens_create",
        {
          detail: {
            animalId: data.animalId,
            medicationName: data.medicationName,
            regimenId: editingRegimen?.id,
            scheduleType: data.scheduleType,
          },
        },
      ),
    );
  };

  const handleScheduleValidation = (
    times: string[],
    medicationName: string,
  ): boolean => {
    const conflicts = validateScheduleConflicts(times, medicationName);
    const criticalConflicts = conflicts.filter((c) => c.severity === "ERROR");

    if (criticalConflicts.length > 0) {
      console.error("Schedule conflicts detected:", criticalConflicts);
      // In a real app, show user confirmation dialog
      return true;
    }
    return false;
  };

  const handleScheduleOptimization = (data: Partial<Regimen>) => {
    if (!data.timesLocal || data.scheduleType !== "FIXED") return;

    const scheduleOptimization = RegimenSchedulingService.generateDoseSchedule(
      data.timesLocal.length,
      data.scheduleType,
      data.timesLocal[0] || "09:00",
      {
        avoidSleep: true,
        withFood: true, // Could be made configurable
      },
    );

    if (scheduleOptimization.warnings.length > 0) {
      console.log(
        "Schedule optimization suggestions:",
        scheduleOptimization.warnings,
      );
    }
  };

  // Enhanced handler with medical validation and schedule optimization
  const handleSave = async (data: Partial<Regimen>) => {
    if (!selectedHousehold?.id) {
      console.error("No household selected");
      return;
    }

    try {
      // Validate schedule conflicts
      if (data.timesLocal && data.medicationName) {
        const hasConflicts = handleScheduleValidation(
          data.timesLocal,
          data.medicationName,
        );
        if (hasConflicts) {
          // Early return if critical conflicts are found
          return;
        }
      }

      if (!editingRegimen) {
        handleScheduleOptimization(data);
      }

      if (editingRegimen) {
        const updateData = buildUpdateData(data, selectedHousehold.id);
        await updateRegimen.mutateAsync(updateData);
      } else {
        const createData = buildCreateData(data, selectedHousehold.id);
        await createRegimen.mutateAsync(createData);
      }

      fireInstrumentationEvent(data);
      setIsFormOpen(false);
      setEditingRegimen(null);

      // Show success toast
      console.log(
        `${editingRegimen ? "Updated" : "Created"} regimen for ${data.medicationName}`,
      );
    } catch (error) {
      console.error("Failed to save regimen:", error);
    }
  };

  const deleteRegimen = trpc.regimen.delete.useMutation({
    onError: (error) => {
      console.error("Failed to delete regimen:", error);
    },
    onSuccess: () => {
      refetch(); // Refresh the list
    },
  });

  const handleArchive = async (regimenId: string) => {
    if (!selectedHousehold?.id) {
      console.error("No household selected");
      return;
    }

    try {
      await deleteRegimen.mutateAsync({
        householdId: selectedHousehold.id,
        id: regimenId,
      });

      // Fire instrumentation event
      window.dispatchEvent(
        new CustomEvent("settings_regimens_archive", {
          detail: { regimenId },
        }),
      );

      console.log("Regimen archived successfully");
    } catch (error) {
      console.error("Failed to archive regimen:", error);
    }
  };

  const pauseRegimen = trpc.regimen.pause.useMutation({
    onError: (error) => {
      console.error("Failed to pause regimen:", error);
    },
    onSuccess: () => {
      refetch(); // Refresh the list
    },
  });

  const resumeRegimen = trpc.regimen.resume.useMutation({
    onError: (error) => {
      console.error("Failed to resume regimen:", error);
    },
    onSuccess: () => {
      refetch(); // Refresh the list
    },
  });

  // Handle pause/resume regimen
  const handleTogglePause = async (
    regimenId: string,
    currentlyActive: boolean,
  ) => {
    if (!selectedHousehold?.id) {
      console.error("No household selected");
      return;
    }

    try {
      if (currentlyActive) {
        // Pause the regimen
        await pauseRegimen.mutateAsync({
          householdId: selectedHousehold.id,
          id: regimenId,
          reason: "Paused by user", // Default reason, could be made configurable
        });
      } else {
        // Resume the regimen
        await resumeRegimen.mutateAsync({
          householdId: selectedHousehold.id,
          id: regimenId,
        });
      }

      // Fire instrumentation event
      window.dispatchEvent(
        new CustomEvent(
          currentlyActive
            ? "settings_regimens_pause"
            : "settings_regimens_resume",
          {
            detail: { regimenId },
          },
        ),
      );

      console.log(
        `Regimen ${currentlyActive ? "paused" : "resumed"} successfully`,
      );
    } catch (error) {
      console.error(
        `Failed to ${currentlyActive ? "pause" : "resume"} regimen:`,
        error,
      );
    }
  };

  // Show loading state if no household selected
  if (!selectedHousehold) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
          <h3 className="mb-2 font-medium text-lg">No Household Selected</h3>
          <p className="text-muted-foreground">
            Please select a household to view regimens
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button className="gap-2" disabled={isLoading} onClick={handleCreate}>
          <Plus className="h-4 w-4" />
          Add Regimen
        </Button>
      </div>

      {/* Animal Filter and Status */}
      <div className="flex items-center justify-between gap-4">
        <Select
          disabled={isLoading}
          onValueChange={setSelectedAnimalId}
          value={selectedAnimalId}
        >
          <SelectTrigger className="w-[200px]">
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

        {error && (
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            Failed to load regimens
            <Button
              disabled={isLoading}
              onClick={() => refetch()}
              size="sm"
              variant="outline"
            >
              Retry
            </Button>
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading regimens...</span>
        </div>
      )}

      {/* Regimens by Animal */}
      {!isLoading && (
        <div className="space-y-6">
          {Object.entries(groupedRegimens).map(([animalId, regimens]) => {
            const animal = animals.find((a) => a.id === animalId);
            if (!animal) return null;

            return (
              <div className="space-y-3" key={animalId}>
                <div className="flex items-center gap-3">
                  <AnimalAvatar animal={animal} size="md" />
                  <div>
                    <h3 className="font-semibold text-lg">{animal.name}</h3>
                    <p className="text-muted-foreground text-sm">
                      {regimens.length} active regimen
                      {regimens.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {regimens.map((regimen) => (
                    <RegimenCard
                      key={regimen.id}
                      onArchive={() => handleArchive(regimen.id)}
                      onEdit={() => handleEdit(regimen)}
                      onTogglePause={() =>
                        handleTogglePause(regimen.id, regimen.isActive)
                      }
                      regimen={regimen}
                    />
                  ))}
                </div>
              </div>
            );
          })}

          {Object.keys(groupedRegimens).length === 0 && !error && (
            <div className="py-12 text-center">
              <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
              <h3 className="mb-2 font-medium text-lg">No regimens found</h3>
              <p className="text-muted-foreground">
                {selectedAnimalId === "all"
                  ? "Create your first medication regimen to get started"
                  : `No regimens for ${animals.find((a) => a.id === selectedAnimalId)?.name}`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Regimen Form */}
      <RegimenForm
        onOpenChange={setIsFormOpen}
        onSave={handleSave}
        open={isFormOpen}
        regimen={editingRegimen}
      />
    </div>
  );
}

function RegimenCard({
  regimen,
  onEdit,
  onArchive,
  onTogglePause,
}: {
  regimen: Regimen & { validationWarnings?: string[] };
  onEdit: () => void;
  onArchive: () => void;
  onTogglePause: () => void;
}) {
  // Use display service to format regimen data
  const formattedRegimen = RegimenDisplayService.formatRegimenForDisplay({
    animalName: regimen.animalName,
    cutoffMins: regimen.cutoffMins,
    endDate: regimen.endDate,
    form: regimen.form,
    highRisk: regimen.highRisk,
    id: regimen.id,
    isActive: regimen.isActive,
    medicationName: regimen.medicationName,
    route: regimen.route,
    scheduleType: regimen.scheduleType,
    startDate: regimen.startDate || new Date(),
    status: regimen.status,
    strength: regimen.strength,
    timesLocal: regimen.timesLocal,
  });

  // Create schedule visualization
  const scheduleViz = regimen.timesLocal
    ? RegimenDisplayService.createScheduleVisualization(
        regimen.timesLocal,
        "UTC", // Would use actual timezone
      )
    : null;

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">
              {formattedRegimen.title}
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              {formattedRegimen.subtitle}
            </p>
            {regimen.validationWarnings &&
              regimen.validationWarnings.length > 0 && (
                <div className="mt-1">
                  {regimen.validationWarnings.map((warning, i) => (
                    <p
                      className="flex items-center gap-1 text-amber-600 text-xs"
                      key={`${regimen.id}-warning-${i}`}
                    >
                      <AlertTriangle className="h-3 w-3" />
                      {warning}
                    </p>
                  ))}
                </div>
              )}
          </div>
          <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
            {formattedRegimen.badges.map((badge, index) => (
              <Badge
                className="whitespace-nowrap text-xs"
                key={`${badge.text}-${index}`}
                title={badge.tooltip}
                variant={badge.variant}
              >
                {badge.icon && badge.icon === "AlertTriangle" && (
                  <AlertTriangle className="mr-1 h-3 w-3" />
                )}
                {badge.text}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {scheduleViz && scheduleViz.timeSlots.length > 0 && (
          <div>
            <p className="mb-1 font-medium text-sm">Schedule:</p>
            <div className="flex flex-wrap gap-1">
              {scheduleViz.timeSlots.map((slot, index) => (
                <Badge
                  className="text-xs"
                  key={`${slot.label}-${index}`}
                  variant={
                    slot.status === "completed"
                      ? "default"
                      : slot.status === "missed"
                        ? "destructive"
                        : slot.status === "current"
                          ? "secondary"
                          : "outline"
                  }
                >
                  {slot.label}
                  {slot.delay && slot.delay > 30 && (
                    <span className="ml-1 text-xs opacity-70">
                      (+{Math.round(slot.delay)}m)
                    </span>
                  )}
                </Badge>
              ))}
            </div>
            {scheduleViz.nextDose && (
              <p className="mt-1 text-muted-foreground text-xs">
                Next dose: {scheduleViz.nextDose.time} (
                {scheduleViz.nextDose.countdown})
                {scheduleViz.nextDose.isLate && (
                  <span className="ml-1 text-destructive">- LATE</span>
                )}
              </p>
            )}
          </div>
        )}

        <div className="text-muted-foreground text-sm">
          <div>Cutoff: {formattedRegimen.metadata.cutoffTime}</div>
          <div>
            {formattedRegimen.metadata.startDate}
            {formattedRegimen.metadata.endDate &&
              ` - ${formattedRegimen.metadata.endDate}`}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          {formattedRegimen.actions.canEdit && (
            <Button
              className="flex-1 bg-transparent"
              onClick={onEdit}
              size="sm"
              variant="outline"
            >
              Edit
            </Button>
          )}
          {formattedRegimen.actions.canPause && (
            <Button
              className="gap-1 bg-transparent"
              onClick={onTogglePause}
              size="sm"
              title={regimen.isActive ? "Pause regimen" : "Resume regimen"}
              variant="outline"
            >
              {regimen.isActive ? "Pause" : "Resume"}
            </Button>
          )}
          {formattedRegimen.actions.canArchive && (
            <Button
              className="gap-1 bg-transparent"
              onClick={onArchive}
              size="sm"
              title="Archive regimen"
              variant="outline"
            >
              <Archive className="h-3 w-3" />
              Archive
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
