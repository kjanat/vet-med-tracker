"use client";

import { useUser } from "@stackframe/stack";
import type { TRPCClientErrorLike } from "@trpc/client";
import { ArrowLeft, Camera, Tag } from "lucide-react";
import type { Route } from "next";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { RecordAdminErrorBoundary } from "@/components/error-handling/error-boundary-page";
import type { AppContextType } from "@/components/providers/app-provider-consolidated";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InventorySourceSelect } from "@/components/ui/inventory-source-select";
import { Label } from "@/components/ui/label";
import { MedConfirmButton } from "@/components/ui/med-confirm-button";
import { MobileConfirmLayout } from "@/components/ui/mobile-confirm-layout";
import { MobileRecordLayout } from "@/components/ui/mobile-record-layout";
import { MobileSuccessLayout } from "@/components/ui/mobile-success-layout";
import { PhotoUploader } from "@/components/ui/photo-uploader";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TabletConfirmLayout } from "@/components/ui/tablet-confirm-layout";
import { TabletRecordLayout } from "@/components/ui/tablet-record-layout";
import { TabletSuccessLayout } from "@/components/ui/tablet-success-layout";
import { Textarea } from "@/components/ui/textarea";
import { useResponsive } from "@/hooks/shared/useResponsive";
import {
  AdminRecordDataService,
  type MutationCallbacks,
} from "@/lib/services/admin-record-data.service";
import {
  AdminRecordUIService,
  type LayoutProps,
} from "@/lib/services/admin-record-ui.service";
// Import the new services
import {
  AdminRecordValidationService,
  type DueRegimen,
} from "@/lib/services/admin-record-validation.service";
import {
  AdminRecordWorkflowService,
  type WorkflowState,
} from "@/lib/services/admin-record-workflow.service";
import {
  NavigationService,
  type RouterLike,
} from "@/lib/services/navigation.service";
import type { AppRouter } from "@/server/api/routers/_app";
import { trpc } from "@/server/trpc/client";
import type { InventorySource } from "@/types/inventory";

type RegimenQueryError = TRPCClientErrorLike<AppRouter> | null;
type AnimalsList = AppContextType["animals"];
type AdminCreateMutation = ReturnType<typeof trpc.admin.create.useMutation>;
type InventoryUpdateMutation = ReturnType<
  typeof trpc.inventory.updateQuantity.useMutation
>;

type AdminRecordDataResult = {
  dueRegimens: DueRegimen[] | undefined;
  regimensLoading: boolean;
  regimensError: RegimenQueryError;
  inventorySources: InventorySource[];
  inventoryLoading: boolean;
  createAdminMutation: AdminCreateMutation;
  updateInventoryMutation: InventoryUpdateMutation;
  callbacks: MutationCallbacks;
};

const DASHBOARD_ROUTE: Route = "/auth/dashboard";

// Custom hook for workflow state management
function useWorkflowState() {
  const [state, setState] = useState<WorkflowState>(
    AdminRecordWorkflowService.createInitialState(),
  );

  const updateState = (updates: Partial<WorkflowState>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const selectRegimen = (regimen: DueRegimen) => {
    setState((prev) => AdminRecordWorkflowService.selectRegimen(prev, regimen));
  };

  const transitionToStep = (step: WorkflowState["step"]) => {
    setState((prev) => AdminRecordWorkflowService.transitionToStep(prev, step));
  };

  const resetWorkflow = () => {
    setState(AdminRecordWorkflowService.createInitialState());
  };

  return {
    state,
    updateState,
    selectRegimen,
    transitionToStep,
    resetWorkflow,
  };
}

// Custom hook for data operations
function useAdminRecordData(
  state: WorkflowState,
  selectedHousehold: { id: string } | null,
  refreshPendingMeds: () => void,
): AdminRecordDataResult {
  const utils = trpc.useUtils();

  // Fetch due regimens
  const regimenQuery = trpc.regimen.listDue.useQuery(
    AdminRecordDataService.createRegimenQueryOptions(
      selectedHousehold?.id,
      state.selectedAnimalId || undefined,
    ),
    {
      enabled: Boolean(selectedHousehold?.id),
    },
  );

  // Fetch inventory sources
  const inventoryQueryOptions =
    AdminRecordDataService.createInventoryQueryOptions(
      selectedHousehold?.id,
      state.selectedRegimen?.medicationName,
      state.allowOverride,
    );
  const inventoryQuery = trpc.inventory.getSources.useQuery(
    {
      householdId: inventoryQueryOptions.householdId || "",
      medicationName: inventoryQueryOptions.medicationName || "",
      includeExpired: inventoryQueryOptions.includeExpired,
    },
    {
      enabled:
        Boolean(state.selectedRegimen) &&
        Boolean(selectedHousehold?.id) &&
        Boolean(inventoryQueryOptions.householdId) &&
        Boolean(inventoryQueryOptions.medicationName),
    },
  );

  // Create administration mutation
  const createAdminMutation = trpc.admin.create.useMutation();

  // Update inventory mutation
  const updateInventoryMutation = trpc.inventory.updateQuantity.useMutation();

  // Mutation callbacks
  const callbacks: MutationCallbacks = {
    onAdminSuccess: async () => {
      await AdminRecordDataService.invalidateRelatedData(utils, {
        refreshPendingMeds,
      });
    },
    onAdminError: (error) => {
      const errorInfo = AdminRecordDataService.categorizeError(error);
      console.error("Failed to record administration:", error);
      toast.error(errorInfo.userMessage);
    },
    onInventorySuccess: async () => {
      await utils.inventory.getSources.invalidate();
      await utils.inventory.getHouseholdInventory.invalidate();
    },
    onInventoryError: (error) => {
      const errorInfo = AdminRecordDataService.categorizeError(error);
      console.error("Failed to update inventory:", error);
      toast.error(errorInfo.userMessage);
    },
  };

  const regimensError: RegimenQueryError = regimenQuery.error ?? null;
  const inventorySources = inventoryQuery.data ?? [];

  return {
    dueRegimens: regimenQuery.data,
    regimensLoading: regimenQuery.isLoading,
    regimensError,
    inventorySources,
    inventoryLoading: inventoryQuery.isLoading,
    createAdminMutation,
    updateInventoryMutation,
    callbacks,
  };
}

// Selection Step Component
function SelectionStep({
  state,
  dueRegimens,
  regimensLoading,
  regimensError,
  selectedHousehold,
  animals,
  searchParams,
  router,
  onRegimenSelect,
}: {
  state: WorkflowState;
  dueRegimens?: DueRegimen[];
  regimensLoading: boolean;
  regimensError: RegimenQueryError;
  selectedHousehold: { id: string } | null;
  animals: AnimalsList;
  searchParams: ReturnType<typeof useSearchParams>;
  router: ReturnType<typeof useRouter>;
  onRegimenSelect: (regimen: DueRegimen) => void;
}) {
  const groupedRegimens = AdminRecordWorkflowService.groupRegimens(
    dueRegimens || [],
    state.selectedAnimalId,
  );

  const navigationContext = AdminRecordDataService.createNavigationContext(
    router as RouterLike,
    searchParams,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          {state.selectedAnimalId
            ? `Recording for ${animals.find((a) => a.id === state.selectedAnimalId)?.name}`
            : "Select a medication to record"}
        </p>
        {navigationContext.canGoBack && (
          <Button
            onClick={() => router.push(navigationContext.backUrl as Route)}
            variant="ghost"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        )}
      </div>

      {regimensError && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load medications: {regimensError.message}
          </AlertDescription>
        </Alert>
      )}

      {regimensLoading ? (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-3">
            {AdminRecordUIService.createLoadingDisplay().map((item) => (
              <Skeleton className={`${item.height} w-full`} key={item.id} />
            ))}
          </CardContent>
        </Card>
      ) : !selectedHousehold ? (
        <Alert>
          <AlertDescription>
            Please select a household to view medications.
          </AlertDescription>
        </Alert>
      ) : (
        <MedicationSections
          groupedRegimens={groupedRegimens}
          onRegimenSelect={onRegimenSelect}
        />
      )}
    </div>
  );
}

// Medication Sections Component
function MedicationSections({
  groupedRegimens,
  onRegimenSelect,
}: {
  groupedRegimens: ReturnType<typeof AdminRecordWorkflowService.groupRegimens>;
  onRegimenSelect: (regimen: DueRegimen) => void;
}) {
  const groupsWithCounts = {
    due: { regimens: groupedRegimens.due, count: groupedRegimens.due.length },
    later: {
      regimens: groupedRegimens.later,
      count: groupedRegimens.later.length,
    },
    prn: { regimens: groupedRegimens.prn, count: groupedRegimens.prn.length },
  };

  return (
    <div className="space-y-6">
      {groupsWithCounts.due.count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Due Now
              <Badge
                variant={AdminRecordUIService.getSectionBadgeVariant(
                  "due",
                  groupsWithCounts.due.count,
                )}
              >
                {groupsWithCounts.due.count}
              </Badge>
            </CardTitle>
            <CardDescription>
              Medications that are due or overdue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupsWithCounts.due.regimens.map((regimen) => (
              <RegimenCard
                key={regimen.id}
                onSelect={onRegimenSelect}
                regimen={regimen}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {groupsWithCounts.later.count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Later Today
              <Badge
                variant={AdminRecordUIService.getSectionBadgeVariant(
                  "later",
                  groupsWithCounts.later.count,
                )}
              >
                {groupsWithCounts.later.count}
              </Badge>
            </CardTitle>
            <CardDescription>
              Upcoming medications scheduled for today
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupsWithCounts.later.regimens.map((regimen) => (
              <RegimenCard
                key={regimen.id}
                onSelect={onRegimenSelect}
                regimen={regimen}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {groupsWithCounts.prn.count > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              PRN (As Needed)
              <Badge
                variant={AdminRecordUIService.getSectionBadgeVariant(
                  "prn",
                  groupsWithCounts.prn.count,
                )}
              >
                {groupsWithCounts.prn.count}
              </Badge>
            </CardTitle>
            <CardDescription>
              Medications that can be given as needed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupsWithCounts.prn.regimens.map((regimen) => (
              <RegimenCard
                key={regimen.id}
                onSelect={onRegimenSelect}
                regimen={regimen}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {Object.values(groupsWithCounts).every((group) => group.count === 0) && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              No medications are due at this time.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Regimen Card Component
function RegimenCard({
  regimen,
  onSelect,
}: {
  regimen: DueRegimen;
  onSelect: (regimen: DueRegimen) => void;
}) {
  const { selectedAnimal, selectedHousehold } = useApp();
  const timezone =
    selectedAnimal?.timezone || selectedHousehold?.timezone || "UTC";

  const displayRegimen = AdminRecordUIService.formatRegimenForDisplay(
    regimen,
    timezone,
  );

  const animal = {
    id: regimen.animalId,
    name: regimen.animalName,
    species: regimen.animalSpecies || "Unknown",
    avatar: regimen.animalPhotoUrl ?? undefined,
    pendingMeds: 0,
  };

  return (
    <button
      className="flex w-full cursor-pointer items-center justify-between rounded-lg border p-4 text-left transition-colors hover:bg-accent"
      onClick={() => onSelect(regimen)}
      type="button"
    >
      <div className="flex items-center gap-3">
        <AnimalAvatar animal={animal} size="md" />
        <div>
          <div className="font-medium">
            {regimen.animalName} - {regimen.medicationName} {regimen.strength}
          </div>
          <div className="text-muted-foreground text-sm">
            {regimen.route} • {regimen.form} • {displayRegimen.timeDisplay}
            {regimen.dose && ` • ${regimen.dose}`}
          </div>
          <div className="text-muted-foreground text-xs">
            {displayRegimen.complianceDisplay}
            {regimen.isHighRisk && " • High-risk medication"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {displayRegimen.statusBadges.map((badge, index) => (
          <Badge key={`${badge.text}-${index}`} variant={badge.variant}>
            {badge.text}
          </Badge>
        ))}
      </div>
    </button>
  );
}

// Confirm Step Component
function ConfirmStep({
  state,
  animals,
  inventorySources,
  inventoryLoading,
  onConfirm,
  isSubmitting,
  onStateUpdate,
}: {
  state: WorkflowState;
  animals: AnimalsList;
  inventorySources: InventorySource[];
  inventoryLoading: boolean;
  onConfirm: () => Promise<void>;
  isSubmitting: boolean;
  onStateUpdate: (updates: Partial<WorkflowState>) => void;
}) {
  const user = useUser();
  const { selectedHousehold } = useApp();
  const animal = animals.find((a) => a.id === state.selectedAnimalId);

  // Format inventory sources for display
  const formattedSources =
    AdminRecordUIService.formatInventorySourcesForDisplay(
      inventorySources,
      state.selectedRegimen?.medicationName || "",
      state.allowOverride,
    );

  // Validate current state
  const validation = AdminRecordValidationService.validateComplete(
    {
      selectedRegimen: state.selectedRegimen,
      inventorySourceId: state.inventorySourceId,
      allowOverride: state.allowOverride,
      requiresCoSign: state.requiresCoSign,
      notes: state.notes,
      site: state.site,
      conditionTags: state.conditionTags,
      photoUrls: state.photoUrls,
    },
    inventorySources,
  );

  const inventoryValidation = AdminRecordDataService.validateInventorySelection(
    state.inventorySourceId,
    inventorySources,
    state.allowOverride,
  );

  const _canSubmit = AdminRecordWorkflowService.canSubmit(state);
  const isDisabled = AdminRecordUIService.shouldDisableSubmit(
    isSubmitting,
    !validation.isValid,
    !inventoryValidation.canSubmit,
    state.allowOverride,
  );

  const submitButtonText = AdminRecordUIService.getSubmitButtonText(
    isSubmitting,
    state.requiresCoSign,
    !validation.isValid,
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button
          onClick={() => onStateUpdate({ step: "select" })}
          size="icon"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-bold text-2xl">Confirm Administration</h1>
      </div>

      {/* Validation Messages */}
      {validation.warnings.length > 0 && (
        <Alert>
          <AlertDescription>
            <ul className="list-inside list-disc space-y-1">
              {validation.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {validation.errors.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            <ul className="list-inside list-disc space-y-1">
              {validation.errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            {animal && <AnimalAvatar animal={animal} size="md" />}
            <div>
              <div>
                {animal?.name} - {state.selectedRegimen?.medicationName}
              </div>
              <div className="font-normal text-muted-foreground text-sm">
                {state.selectedRegimen?.strength} •{" "}
                {state.selectedRegimen?.route} • {state.selectedRegimen?.form}
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label>Inventory Source</Label>
            {inventoryLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <InventorySourceSelect
                allowOverride={true}
                onOverrideChange={(override) =>
                  onStateUpdate({ allowOverride: override })
                }
                onSelect={(sourceId) =>
                  onStateUpdate({ inventorySourceId: sourceId })
                }
                selectedId={state.inventorySourceId ?? undefined}
                sources={formattedSources}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="site">Site/Side (Optional)</Label>
              <Input
                id="site"
                onChange={(e) => onStateUpdate({ site: e.target.value })}
                placeholder="Left ear, right leg..."
                value={state.site}
              />
            </div>
            <div>
              <Label>Photo Evidence</Label>
              <PhotoEvidenceUploader
                animalId={state.selectedAnimalId || ""}
                householdId={selectedHousehold?.id || ""}
                photoUrls={state.photoUrls}
                setPhotoUrls={(photoUrls) => onStateUpdate({ photoUrls })}
                userId={user?.id || ""}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              onChange={(e) => onStateUpdate({ notes: e.target.value })}
              placeholder="Any observations or notes..."
              value={state.notes}
            />
          </div>

          <ConditionTagSelector
            conditionTags={state.conditionTags}
            setConditionTags={(tags) => onStateUpdate({ conditionTags: tags })}
          />

          {state.selectedRegimen?.isHighRisk && (
            <div className="flex items-center space-x-2 rounded-lg border border-orange-200 bg-orange-50 p-4">
              <Checkbox
                checked={state.requiresCoSign}
                id="cosign"
                onCheckedChange={(checked) =>
                  onStateUpdate({ requiresCoSign: checked === true })
                }
              />
              <Label className="text-sm" htmlFor="cosign">
                Requires co-sign (high-risk medication)
              </Label>
            </div>
          )}

          <Separator />

          <MedConfirmButton
            className="w-full"
            disabled={isDisabled}
            onConfirm={onConfirm}
            requiresCoSign={state.requiresCoSign}
          >
            {submitButtonText}
          </MedConfirmButton>
        </CardContent>
      </Card>
    </div>
  );
}

// Success Step Component
function SuccessStep({
  state,
  onReturnHome,
  onRecordAnother,
  timezone = "UTC",
}: {
  state: WorkflowState;
  onReturnHome: () => void;
  onRecordAnother: () => void;
  timezone?: string;
}) {
  const router = useRouter();
  const successMessage = AdminRecordUIService.createSuccessMessage(
    state.selectedRegimen?.animalName,
    state.selectedRegimen?.medicationName,
    new Date().toISOString(),
    timezone,
  );

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500">
            ✓
          </div>
        </div>

        <div>
          <h1 className="font-bold text-2xl text-green-700">
            {successMessage.title}
          </h1>
          <p className="text-muted-foreground">{successMessage.subtitle}</p>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          className="w-full bg-transparent"
          onClick={() => {
            const url = "/auth/settings/reminders";
            NavigationService.navigateWithContext(url, router as RouterLike);
          }}
          variant="outline"
        >
          Adjust Reminder
        </Button>

        <Button
          className="w-full bg-transparent"
          onClick={onRecordAnother}
          variant="outline"
        >
          Record Another
        </Button>

        <Button className="w-full" onClick={onReturnHome}>
          Back to Home
        </Button>
      </div>
    </div>
  );
}

// Condition Tag Selector Component
function ConditionTagSelector({
  conditionTags,
  setConditionTags,
}: {
  conditionTags: string[];
  setConditionTags: (tags: string[]) => void;
}) {
  const formattedTags = AdminRecordUIService.formatConditionTags(conditionTags);

  const toggleTag = (tagName: string) => {
    setConditionTags(
      conditionTags.includes(tagName)
        ? conditionTags.filter((t) => t !== tagName)
        : [...conditionTags, tagName],
    );
  };

  return (
    <div>
      <Label>Condition Tags</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {formattedTags.map((tag) => (
          <Button
            key={tag.name}
            onClick={() => toggleTag(tag.name)}
            size="sm"
            variant={tag.variant}
          >
            <Tag className="mr-1 h-3 w-3" />
            {tag.name}
          </Button>
        ))}
      </div>
    </div>
  );
}

// Photo Evidence Uploader Component
function PhotoEvidenceUploader({
  photoUrls,
  setPhotoUrls,
  householdId,
  userId,
  animalId,
}: {
  photoUrls: string[];
  setPhotoUrls: (urls: string[]) => void;
  householdId: string;
  userId: string;
  animalId: string;
}) {
  const [currentUpload, setCurrentUpload] = useState<string | null>(null);
  const uploadStatus = AdminRecordUIService.getPhotoUploadStatus(photoUrls);

  const handlePhotoUpload = (url: string, _file: File) => {
    setPhotoUrls([...photoUrls, url]);
    setCurrentUpload(null);
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotoUrls(photoUrls.filter((_, index) => index !== indexToRemove));
  };

  const handleStartUpload = () => {
    const uploadId = Date.now().toString();
    setCurrentUpload(uploadId);
  };

  if (!householdId || !userId) {
    return (
      <div className="rounded-lg border-2 border-muted-foreground/25 border-dashed p-4 text-center">
        <Camera className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">
          Photo upload unavailable
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Show existing photos */}
      {photoUrls.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {photoUrls.map((url, index) => (
            <div className="relative" key={url}>
              <Image
                alt={`Evidence ${index + 1}`}
                className="h-20 w-full rounded-md border object-cover"
                height={80}
                src={url}
                width={80}
              />
              <Button
                className="-top-2 -right-2 absolute h-6 w-6 rounded-full p-0"
                onClick={() => handleRemovePhoto(index)}
                size="sm"
                type="button"
                variant="destructive"
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Show uploader for new photos */}
      {uploadStatus.canAddMore && !currentUpload && (
        <Button
          className="w-full bg-transparent"
          onClick={handleStartUpload}
          type="button"
          variant="outline"
        >
          <Camera className="mr-2 h-4 w-4" />
          {photoUrls.length === 0 ? "Add Photo Evidence" : "Add Another Photo"}
        </Button>
      )}

      {/* PhotoUploader component when actively uploading */}
      {currentUpload && (
        <div className="space-y-2">
          <PhotoUploader
            animalId={animalId}
            className="min-h-[120px]"
            householdId={householdId}
            maxSizeKB={2000}
            onError={(error) => {
              console.error("Photo upload error:", error);
              toast.error("Failed to upload photo");
              setCurrentUpload(null);
            }}
            onUpload={handlePhotoUpload}
            placeholder="Drag and drop photo or click to select"
            userId={userId}
          />
          <Button
            className="w-full"
            onClick={() => setCurrentUpload(null)}
            size="sm"
            type="button"
            variant="ghost"
          >
            Cancel Upload
          </Button>
        </div>
      )}

      {!uploadStatus.canAddMore && (
        <p className="text-center text-muted-foreground text-xs">
          {uploadStatus.statusText}
        </p>
      )}
    </div>
  );
}

// Main Content Component
function RecordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { animals, selectedHousehold, selectedAnimal, refreshPendingMeds } =
    useApp();
  const { isMobile, isTablet } = useResponsive();

  const { state, updateState, selectRegimen, transitionToStep, resetWorkflow } =
    useWorkflowState();

  const {
    dueRegimens,
    regimensLoading,
    regimensError,
    inventorySources,
    inventoryLoading,
    createAdminMutation,
    updateInventoryMutation,
    callbacks,
  } = useAdminRecordData(state, selectedHousehold, refreshPendingMeds);

  // Handle URL parameters
  useEffect(() => {
    if (!dueRegimens) return;

    const urlParams = AdminRecordDataService.processUrlParams(searchParams);
    if (urlParams.animalId || urlParams.regimenId) {
      const newState = AdminRecordWorkflowService.applyUrlParams(
        state,
        urlParams,
        dueRegimens,
      );
      if (newState !== state) {
        updateState(newState);
      }
    }
  }, [searchParams, dueRegimens, state, updateState]);

  const timezone =
    selectedAnimal?.timezone || selectedHousehold?.timezone || "UTC";

  const handleRegimenSelect = (regimen: DueRegimen) => {
    selectRegimen(regimen);
    transitionToStep("confirm");
  };

  const handleConfirm = async () => {
    if (!state.selectedRegimen || !selectedHousehold) return;

    updateState({ isSubmitting: true });

    try {
      await AdminRecordDataService.submitAdministration(
        state,
        selectedHousehold.id,
        timezone,
        { createAdminMutation, updateInventoryMutation },
        {
          ...callbacks,
          onAdminSuccess: async () => {
            await callbacks.onAdminSuccess();
            transitionToStep("success");
          },
        },
      );
    } catch (error) {
      callbacks.onAdminError(error);
    } finally {
      updateState({ isSubmitting: false });
    }
  };

  const isSubmitting =
    state.isSubmitting ||
    createAdminMutation.isPending ||
    updateInventoryMutation.isPending;

  const layoutProps: LayoutProps = {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
  };
  const layoutComponent = AdminRecordUIService.getLayoutComponent(layoutProps);

  // Use mobile/tablet layouts if needed
  if (layoutComponent === "mobile") {
    return (
      <MobileRecordLayout
        dueRegimens={dueRegimens}
        onBack={() => {
          if (state.step === "confirm") {
            transitionToStep("select");
          }
        }}
        onCancel={() => router.push(DASHBOARD_ROUTE)}
        onRegimenSelect={handleRegimenSelect}
        regimensError={regimensError}
        regimensLoading={regimensLoading}
        selectedRegimen={state.selectedRegimen}
        step={state.step}
      >
        {state.step === "success" && (
          <MobileSuccessLayout
            animalName={state.selectedRegimen?.animalName}
            medicationName={state.selectedRegimen?.medicationName}
            onRecordAnother={resetWorkflow}
            onReturnHome={() => router.push(DASHBOARD_ROUTE)}
            recordedAt={new Date().toISOString()}
          />
        )}
        {state.step === "confirm" && state.selectedRegimen && (
          <MobileConfirmLayout
            allowOverride={state.allowOverride}
            animals={animals}
            conditionTags={state.conditionTags}
            inventoryLoading={inventoryLoading}
            inventorySourceId={state.inventorySourceId}
            inventorySources={inventorySources}
            isSubmitting={isSubmitting}
            notes={state.notes}
            onConfirm={handleConfirm}
            requiresCoSign={state.requiresCoSign}
            selectedRegimen={state.selectedRegimen}
            setAllowOverride={(allowOverride) => updateState({ allowOverride })}
            setConditionTags={(conditionTags) =>
              updateState({
                conditionTags:
                  typeof conditionTags === "function"
                    ? conditionTags(state.conditionTags)
                    : conditionTags,
              })
            }
            setInventorySourceId={(inventorySourceId) =>
              updateState({ inventorySourceId })
            }
            setNotes={(notes) => updateState({ notes })}
            setRequiresCoSign={(requiresCoSign) =>
              updateState({ requiresCoSign })
            }
            setSite={(site) => updateState({ site })}
            site={state.site}
          />
        )}
      </MobileRecordLayout>
    );
  }

  if (layoutComponent === "tablet") {
    return (
      <TabletRecordLayout
        dueRegimens={dueRegimens}
        onBack={() => {
          if (state.step === "confirm") {
            transitionToStep("select");
          }
        }}
        onCancel={() => router.push(DASHBOARD_ROUTE)}
        onRegimenSelect={handleRegimenSelect}
        regimensError={regimensError}
        regimensLoading={regimensLoading}
        selectedRegimen={state.selectedRegimen}
        step={state.step}
      >
        {state.step === "success" && (
          <TabletSuccessLayout
            animalName={state.selectedRegimen?.animalName}
            medicationName={state.selectedRegimen?.medicationName}
            onRecordAnother={resetWorkflow}
            onReturnHome={() => router.push(DASHBOARD_ROUTE)}
            recordedAt={new Date().toISOString()}
          />
        )}
        {state.step === "confirm" && state.selectedRegimen && (
          <TabletConfirmLayout
            allowOverride={state.allowOverride}
            animals={animals}
            conditionTags={state.conditionTags}
            inventoryLoading={inventoryLoading}
            inventorySourceId={state.inventorySourceId}
            inventorySources={inventorySources}
            isSubmitting={isSubmitting}
            notes={state.notes}
            onConfirm={handleConfirm}
            requiresCoSign={state.requiresCoSign}
            selectedRegimen={state.selectedRegimen}
            setAllowOverride={(allowOverride) => updateState({ allowOverride })}
            setConditionTags={(conditionTags) =>
              updateState({
                conditionTags:
                  typeof conditionTags === "function"
                    ? conditionTags(state.conditionTags)
                    : conditionTags,
              })
            }
            setInventorySourceId={(inventorySourceId) =>
              updateState({ inventorySourceId })
            }
            setNotes={(notes) => updateState({ notes })}
            setRequiresCoSign={(requiresCoSign) =>
              updateState({ requiresCoSign })
            }
            setSite={(site) => updateState({ site })}
            site={state.site}
          />
        )}
      </TabletRecordLayout>
    );
  }

  // Desktop layout
  switch (state.step) {
    case "success":
      return (
        <SuccessStep
          onRecordAnother={resetWorkflow}
          onReturnHome={() => router.push(DASHBOARD_ROUTE)}
          state={state}
          timezone={timezone}
        />
      );

    case "confirm":
      if (!state.selectedRegimen) {
        transitionToStep("select");
        return null;
      }
      return (
        <ConfirmStep
          animals={animals}
          inventoryLoading={inventoryLoading}
          inventorySources={inventorySources}
          isSubmitting={isSubmitting}
          onConfirm={handleConfirm}
          onStateUpdate={updateState}
          state={state}
        />
      );

    default:
      return (
        <SelectionStep
          animals={animals}
          dueRegimens={dueRegimens}
          onRegimenSelect={handleRegimenSelect}
          regimensError={regimensError}
          regimensLoading={regimensLoading}
          router={router}
          searchParams={searchParams}
          selectedHousehold={selectedHousehold}
          state={state}
        />
      );
  }
}

export default function RecordPage() {
  return (
    <RecordAdminErrorBoundary>
      <Suspense
        fallback={<div className="min-h-screen animate-pulse bg-background" />}
      >
        <RecordContent />
      </Suspense>
    </RecordAdminErrorBoundary>
  );
}
