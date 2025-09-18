"use client";

import { useUser } from "@stackframe/stack";
import { ArrowLeft, Camera, Tag } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import type React from "react";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { RecordAdminErrorBoundary } from "@/components/error-boundary-page";
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
// Offline queue functionality removed during simplification
import { useResponsive } from "@/hooks/shared/useResponsive";
import { trpc } from "@/server/trpc/client";
import type { InventorySource } from "@/types/inventory";
import { adminKey } from "@/utils/idempotency";
import { formatTimeLocal, localDayISO } from "@/utils/tz";

type RecordStep = "select" | "confirm" | "success";

type RecordState = ReturnType<typeof useRecordState>;

interface DueRegimen {
  id: string;
  animalId: string;
  animalName: string;
  animalSpecies?: string;
  animalPhotoUrl?: string | null;
  medicationName: string;
  brandName?: string | null;
  route: string;
  form: string;
  strength: string;
  dose?: string;
  targetTime?: string;
  isPRN: boolean;
  isHighRisk: boolean;
  requiresCoSign: boolean;
  compliance: number;
  section: "due" | "later" | "prn";
  isOverdue?: boolean;
  minutesUntilDue?: number;
  instructions?: string | null;
  prnReason?: string | null;
  lastAdministration?: {
    id: string;
    recordedAt: string;
    status: string;
  } | null;
}

function useRecordState() {
  const [step, setStep] = useState<RecordStep>("select");
  const [selectedRegimen, setSelectedRegimen] = useState<DueRegimen | null>(
    null,
  );
  const [selectedAnimalId, setSelectedAnimalId] = useState<string | null>(null);
  const [inventorySourceId, setInventorySourceId] = useState<string | null>(
    null,
  );
  const [allowOverride, setAllowOverride] = useState(false);
  const [requiresCoSign, setRequiresCoSign] = useState(false);
  const [notes, setNotes] = useState("");
  const [site, setSite] = useState("");
  const [conditionTags, setConditionTags] = useState<string[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return {
    step,
    setStep,
    selectedRegimen,
    setSelectedRegimen,
    selectedAnimalId,
    setSelectedAnimalId,
    inventorySourceId,
    setInventorySourceId,
    allowOverride,
    setAllowOverride,
    requiresCoSign,
    setRequiresCoSign,
    notes,
    setNotes,
    site,
    setSite,
    conditionTags,
    setConditionTags,
    photoUrls,
    setPhotoUrls,
    isSubmitting,
    setIsSubmitting,
  };
}

// Custom hook to handle data fetching
function useRecordData(
  state: ReturnType<typeof useRecordState>,
  selectedHousehold: { id: string } | null,
  refreshPendingMeds: () => void,
) {
  const utils = trpc.useUtils();

  // Fetch due regimens from API
  const {
    data: dueRegimens,
    isLoading: regimensLoading,
    error: regimensError,
  } = trpc.regimen.listDue.useQuery(
    {
      householdId: selectedHousehold?.id,
      animalId: state.selectedAnimalId || undefined,
      includeUpcoming: true,
    },
    {
      enabled: Boolean(selectedHousehold?.id),
      refetchInterval: 60000, // Refresh every minute
    },
  );

  // Create record administration mutation
  const createAdminMutation = trpc.admin.create.useMutation({
    onSuccess: async () => {
      // Invalidate due regimens to refresh the list
      await utils.regimen.listDue.invalidate();
      // Refresh pending medication counts in app provider
      refreshPendingMeds();
      state.setStep("success");
    },
    onError: (error) => {
      console.error("Failed to record administration:", error);
      toast.error("Failed to record administration");
    },
  });

  // Inventory update mutation
  const updateInventoryMutation = trpc.inventory.updateQuantity.useMutation({
    onSuccess: async () => {
      await utils.inventory.getSources.invalidate();
      await utils.inventory.getHouseholdInventory.invalidate();
    },
    onError: (error) => {
      console.error("Failed to update inventory:", error);
      toast.error("Failed to update inventory");
    },
  });

  // Fetch inventory sources when a regimen is selected
  const { data: inventorySources, isLoading: inventoryLoading } =
    trpc.inventory.getSources.useQuery(
      {
        householdId: selectedHousehold?.id || "",
        medicationName: state.selectedRegimen?.medicationName || "",
        includeExpired: state.allowOverride,
      },
      {
        enabled:
          Boolean(state.selectedRegimen) && Boolean(selectedHousehold?.id),
      },
    );

  return {
    dueRegimens,
    regimensLoading,
    regimensError:
      regimensError instanceof Error
        ? regimensError
        : regimensError
          ? new Error(regimensError.message)
          : null,
    createAdminMutation,
    updateInventoryMutation,
    inventorySources,
    inventoryLoading,
  };
}

// Component for the selection step
function SelectionStep({
  state,
  dueRegimens,
  regimensLoading,
  regimensError,
  selectedHousehold,
  animals,
  isOnline,
  searchParams,
  router,
  handleRegimenSelect,
}: {
  state: ReturnType<typeof useRecordState>;
  dueRegimens?: DueRegimen[];
  regimensLoading: boolean;
  regimensError: Error | null;
  selectedHousehold: { id: string } | null;
  animals: Array<{
    id: string;
    name: string;
    species: string;
    pendingMeds: number;
    avatar?: string;
  }>;
  isOnline: boolean;
  searchParams: ReturnType<typeof useSearchParams>;
  router: ReturnType<typeof useRouter>;
  handleRegimenSelect: (regimen: DueRegimen) => void;
}) {
  const groupedRegimens = getGroupedRegimens(
    dueRegimens || [],
    state.selectedAnimalId,
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          {state.selectedAnimalId
            ? `Recording for ${animals.find((a) => a.id === state.selectedAnimalId)?.name}`
            : "Select a medication to record"}
        </p>
        {searchParams.get("from") === "home" && (
          <Button onClick={() => router.push("/")} variant="ghost">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
        )}
      </div>

      {!isOnline && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-800">
              You&apos;re offline. Recordings will be saved and synced when
              connection is restored.
            </p>
          </CardContent>
        </Card>
      )}

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
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
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
          dueRegimens={dueRegimens}
          groupedRegimens={groupedRegimens}
          handleRegimenSelect={handleRegimenSelect}
        />
      )}
    </div>
  );
}

// Component for medication sections
function MedicationSections({
  groupedRegimens,
  dueRegimens,
  handleRegimenSelect,
}: {
  groupedRegimens: ReturnType<typeof getGroupedRegimens>;
  dueRegimens?: DueRegimen[];
  handleRegimenSelect: (regimen: DueRegimen) => void;
}) {
  return (
    <div className="space-y-6">
      {groupedRegimens.due.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Due Now
              <Badge variant="destructive">{groupedRegimens.due.length}</Badge>
            </CardTitle>
            <CardDescription>
              Medications that are due or overdue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedRegimens.due.map((regimen) => (
              <RegimenCard
                key={regimen.id}
                onSelect={handleRegimenSelect}
                regimen={regimen}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {groupedRegimens.later.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Later Today
              <Badge variant="secondary">{groupedRegimens.later.length}</Badge>
            </CardTitle>
            <CardDescription>
              Upcoming medications scheduled for today
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedRegimens.later.map((regimen) => (
              <RegimenCard
                key={regimen.id}
                onSelect={handleRegimenSelect}
                regimen={regimen}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {groupedRegimens.prn.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              PRN (As Needed)
              <Badge variant="outline">{groupedRegimens.prn.length}</Badge>
            </CardTitle>
            <CardDescription>
              Medications that can be given as needed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedRegimens.prn.map((regimen) => (
              <RegimenCard
                key={regimen.id}
                onSelect={handleRegimenSelect}
                regimen={regimen}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {dueRegimens && dueRegimens.length === 0 && (
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

// Helper function to handle URL parameters
function useURLParams(
  state: RecordState,
  dueRegimens: DueRegimen[] | undefined,
) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const animalId = searchParams.get("animalId");
    const regimenId = searchParams.get("regimenId");

    if (animalId) {
      state.setSelectedAnimalId(animalId);
    }

    if (regimenId && dueRegimens) {
      const regimen = dueRegimens.find((r) => r.id === regimenId);
      if (regimen) {
        state.setSelectedRegimen(regimen);
        state.setSelectedAnimalId(regimen.animalId);
        state.setStep("confirm");
      }
    }
  }, [searchParams, dueRegimens, state]);
}

// Offline administration functionality removed during simplification

// Helper function to handle online administration
async function handleOnlineAdministration(
  state: RecordState,
  selectedHousehold: { id: string } | null,
  timezone: string,
  createAdminMutation: ReturnType<typeof trpc.admin.create.useMutation>,
  updateInventoryMutation: ReturnType<
    typeof trpc.inventory.updateQuantity.useMutation
  >,
) {
  if (!state.selectedRegimen || !selectedHousehold) return;

  const payload = createAdminPayload(state, selectedHousehold.id, timezone);
  await createAdminMutation.mutateAsync(payload);

  if (state.inventorySourceId) {
    await updateInventoryMutation.mutateAsync({
      id: state.inventorySourceId,
      householdId: selectedHousehold.id,
      quantityChange: -1,
      reason: `Administration for ${state.selectedRegimen.animalName}`,
    });
  }
}

// Helper function to reset the state
function resetRecordState(state: RecordState) {
  state.setStep("select");
  state.setSelectedRegimen(null);
  state.setSelectedAnimalId(null);
  state.setInventorySourceId(null);
  state.setNotes("");
  state.setSite("");
  state.setConditionTags([]);
  state.setPhotoUrls([]);
}

function RecordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { animals, selectedHousehold, selectedAnimal, refreshPendingMeds } =
    useApp();
  const isOnline = true; // Simplified: Always assume online connection
  const state = useRecordState();
  const { isMobile, isTablet } = useResponsive();

  const {
    dueRegimens,
    regimensLoading,
    regimensError,
    createAdminMutation,
    updateInventoryMutation,
    inventorySources,
    inventoryLoading,
  } = useRecordData(state, selectedHousehold, refreshPendingMeds);

  // Handle URL params for pre-filling
  useURLParams(state, dueRegimens);

  // Get timezone from animal or household context
  const timezone =
    selectedAnimal?.timezone || selectedHousehold?.timezone || "UTC";

  const handleRegimenSelect = (regimen: DueRegimen) => {
    state.setSelectedRegimen(regimen);
    state.setSelectedAnimalId(regimen.animalId);
    state.setRequiresCoSign(regimen.isHighRisk);
    state.setStep("confirm");
  };

  const handleConfirm = async () => {
    if (!state.selectedRegimen || !selectedHousehold) return;

    state.setIsSubmitting(true);

    try {
      await handleOnlineAdministration(
        state,
        selectedHousehold,
        timezone,
        createAdminMutation,
        updateInventoryMutation,
      );
    } catch (error) {
      console.error("Failed to record administration:", error);
      toast.error("Failed to record administration");
    } finally {
      state.setIsSubmitting(false);
    }
  };

  const isSubmitting =
    state.isSubmitting ||
    createAdminMutation.isPending ||
    updateInventoryMutation.isPending;

  // Use mobile layout on mobile devices
  if (isMobile) {
    return (
      <RenderMobileLayout
        animals={animals}
        dueRegimens={dueRegimens}
        handleConfirm={handleConfirm}
        handleRegimenSelect={handleRegimenSelect}
        inventoryLoading={inventoryLoading}
        inventorySources={inventorySources || []}
        isOnline={isOnline}
        isSubmitting={isSubmitting}
        regimensError={regimensError}
        regimensLoading={regimensLoading}
        resetRecordState={resetRecordState}
        router={router}
        state={state}
      />
    );
  }

  // Use tablet layout on tablet devices
  if (isTablet) {
    return (
      <RenderTabletLayout
        animals={animals}
        dueRegimens={dueRegimens}
        handleConfirm={handleConfirm}
        handleRegimenSelect={handleRegimenSelect}
        inventoryLoading={inventoryLoading}
        inventorySources={inventorySources || []}
        isOnline={isOnline}
        isSubmitting={isSubmitting}
        regimensError={regimensError}
        regimensLoading={regimensLoading}
        resetRecordState={resetRecordState}
        router={router}
        state={state}
      />
    );
  }

  // Desktop layout (original)
  if (state.step === "success") {
    return (
      <SuccessStep isOnline={isOnline} router={router} timezone={timezone} />
    );
  }

  if (state.step === "confirm" && state.selectedRegimen) {
    return (
      <ConfirmStep
        animals={animals}
        handleConfirm={handleConfirm}
        inventoryLoading={inventoryLoading}
        inventorySources={inventorySources || []}
        isSubmitting={isSubmitting}
        state={state}
      />
    );
  }

  return (
    <SelectionStep
      animals={animals}
      dueRegimens={dueRegimens}
      handleRegimenSelect={handleRegimenSelect}
      isOnline={isOnline}
      regimensError={regimensError}
      regimensLoading={regimensLoading}
      router={router}
      searchParams={searchParams}
      selectedHousehold={selectedHousehold}
      state={state}
    />
  );
}

function RegimenCard({
  regimen,
  onSelect,
}: {
  regimen: DueRegimen;
  onSelect: (regimen: DueRegimen) => void;
}) {
  const { selectedAnimal, selectedHousehold } = useApp();
  const animal = {
    id: regimen.animalId,
    name: regimen.animalName,
    species: regimen.animalSpecies || "Unknown",
    avatar: regimen.animalPhotoUrl ?? undefined,
    pendingMeds: 0,
  };

  // Get timezone from animal or household context
  const timezone =
    selectedAnimal?.timezone || selectedHousehold?.timezone || "UTC";
  const timeDisplay = regimen.targetTime
    ? formatTimeLocal(new Date(regimen.targetTime), timezone)
    : "As needed";

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
            {regimen.route} • {regimen.form} • {timeDisplay}
            {regimen.dose && ` • ${regimen.dose}`}
          </div>
          <div className="text-muted-foreground text-xs">
            {regimen.compliance}% compliance
            {regimen.isHighRisk && " • High-risk medication"}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {regimen.isOverdue && <Badge variant="destructive">Overdue</Badge>}
        {regimen.isPRN && <Badge variant="outline">PRN</Badge>}
        {regimen.isHighRisk && <Badge variant="secondary">High-risk</Badge>}
      </div>
    </button>
  );
}

// Helper functions to reduce complexity
function createAdminPayload(
  state: ReturnType<typeof useRecordState>,
  householdId: string,
  timezone: string,
) {
  if (!state.selectedRegimen) throw new Error("No regimen selected");

  const now = new Date();
  const localDay = localDayISO(now, timezone);
  const idempotencyKey = adminKey(
    state.selectedRegimen.animalId,
    state.selectedRegimen.id,
    localDay,
    state.selectedRegimen.isPRN ? undefined : 0,
  );

  return {
    idempotencyKey,
    householdId,
    animalId: state.selectedRegimen.animalId,
    regimenId: state.selectedRegimen.id,
    administeredAt: now.toISOString(),
    inventorySourceId: state.inventorySourceId || undefined,
    notes: state.notes || undefined,
    site: state.site || undefined,
    conditionTags:
      state.conditionTags.length > 0 ? state.conditionTags : undefined,
    mediaUrls: state.photoUrls.length > 0 ? state.photoUrls : undefined,
    requiresCoSign: state.requiresCoSign,
    allowOverride: state.allowOverride,
    // Optional fields for proper status calculation
    dose: state.selectedRegimen.dose,
    status: state.selectedRegimen.isPRN ? ("PRN" as const) : undefined,
  };
}

function getGroupedRegimens(
  regimens: DueRegimen[],
  selectedAnimalId: string | null,
) {
  const filteredRegimens = selectedAnimalId
    ? regimens.filter((r) => r.animalId === selectedAnimalId)
    : regimens;

  return {
    due: filteredRegimens.filter((r) => r.section === "due"),
    later: filteredRegimens.filter((r) => r.section === "later"),
    prn: filteredRegimens.filter((r) => r.section === "prn"),
  };
}

// Success Step Component
function SuccessStep({
  isOnline,
  router,
  timezone = "UTC",
}: {
  isOnline: boolean;
  router: ReturnType<typeof useRouter>;
  timezone?: string;
}) {
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
            Recorded Successfully
          </h1>
          <p className="text-muted-foreground">
            Recorded at {formatTimeLocal(new Date(), timezone)} by You
            {!isOnline && " (will sync when online)"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Button
          className="w-full bg-transparent"
          onClick={() => {
            // TODO: Open reminder adjustment sheet
            console.log("Adjust reminder");
          }}
          variant="outline"
        >
          Adjust Reminder
        </Button>

        <Button className="w-full" onClick={() => router.push("/")}>
          Back to Home
        </Button>
      </div>
    </div>
  );
}

// Confirm Step Component
function ConfirmStep({
  state,
  animals,
  inventorySources,
  inventoryLoading,
  handleConfirm,
  isSubmitting,
}: {
  state: ReturnType<typeof useRecordState>;
  animals: Array<{
    id: string;
    name: string;
    species: string;
    pendingMeds: number;
    avatar?: string;
  }>;
  inventorySources: InventorySource[];
  inventoryLoading?: boolean;
  handleConfirm: () => Promise<void>;
  isSubmitting?: boolean;
}) {
  const user = useUser();
  const { selectedHousehold } = useApp();
  const animal = animals.find((a) => a.id === state.selectedAnimalId);
  const relevantSources = inventorySources.filter((s) =>
    s.name
      .toLowerCase()
      .includes(state.selectedRegimen?.medicationName.toLowerCase() || ""),
  );

  const isDisabled =
    isSubmitting ||
    (relevantSources.some(
      (s) => s.id === state.inventorySourceId && (s.isExpired || s.isWrongMed),
    ) &&
      !state.allowOverride);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button
          onClick={() => state.setStep("select")}
          size="icon"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="font-bold text-2xl">Confirm Administration</h1>
      </div>

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
                onOverrideChange={state.setAllowOverride}
                onSelect={state.setInventorySourceId}
                selectedId={state.inventorySourceId ?? undefined}
                sources={relevantSources}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="site">Site/Side (Optional)</Label>
              <Input
                id="site"
                onChange={(e) => state.setSite(e.target.value)}
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
                setPhotoUrls={state.setPhotoUrls}
                userId={user?.id || ""}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              onChange={(e) => state.setNotes(e.target.value)}
              placeholder="Any observations or notes..."
              value={state.notes}
            />
          </div>

          <ConditionTagSelector
            conditionTags={state.conditionTags}
            setConditionTags={state.setConditionTags}
          />

          {state.selectedRegimen?.isHighRisk && (
            <div className="flex items-center space-x-2 rounded-lg border border-orange-200 bg-orange-50 p-4">
              <Checkbox
                checked={state.requiresCoSign}
                id="cosign"
                onCheckedChange={(checked) =>
                  state.setRequiresCoSign(checked === true)
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
            onConfirm={handleConfirm}
            requiresCoSign={state.requiresCoSign}
          >
            {isSubmitting ? "Recording..." : "Hold to Confirm (3s)"}
          </MedConfirmButton>
        </CardContent>
      </Card>
    </div>
  );
}

// Condition Tag Selector Component
function ConditionTagSelector({
  conditionTags,
  setConditionTags,
}: {
  conditionTags: string[];
  setConditionTags: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const tags = ["Normal", "Improved", "No Change", "Worse", "Side Effects"];

  return (
    <div>
      <Label>Condition Tags</Label>
      <div className="mt-2 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Button
            key={tag}
            onClick={() => {
              setConditionTags((prev) =>
                prev.includes(tag)
                  ? prev.filter((t) => t !== tag)
                  : [...prev, tag],
              );
            }}
            size="sm"
            variant={conditionTags.includes(tag) ? "default" : "outline"}
          >
            <Tag className="mr-1 h-3 w-3" />
            {tag}
          </Button>
        ))}
      </div>
    </div>
  );
}

// Helper component for mobile layout rendering
function RenderMobileLayout({
  state,
  animals,
  dueRegimens,
  regimensLoading,
  regimensError,
  isOnline,
  inventorySources,
  inventoryLoading,
  isSubmitting,
  handleRegimenSelect,
  handleConfirm,
  router,
  resetRecordState,
}: {
  state: ReturnType<typeof useRecordState>;
  animals: Array<{
    id: string;
    name: string;
    species: string;
    pendingMeds: number;
    avatar?: string;
  }>;
  dueRegimens?: DueRegimen[];
  regimensLoading: boolean;
  regimensError: Error | null;
  isOnline: boolean;
  inventorySources: InventorySource[];
  inventoryLoading: boolean;
  isSubmitting: boolean;
  handleRegimenSelect: (regimen: DueRegimen) => void;
  handleConfirm: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
  resetRecordState: (state: RecordState) => void;
}) {
  return (
    <MobileRecordLayout
      dueRegimens={dueRegimens}
      isOnline={isOnline}
      onBack={() => {
        if (state.step === "confirm") {
          state.setStep("select");
        }
      }}
      onCancel={() => router.push("/")}
      onRegimenSelect={handleRegimenSelect}
      regimensError={regimensError}
      regimensLoading={regimensLoading}
      selectedRegimen={state.selectedRegimen}
      step={state.step}
    >
      {state.step === "success" && (
        <MobileSuccessLayout
          animalName={state.selectedRegimen?.animalName}
          isOnline={isOnline}
          medicationName={state.selectedRegimen?.medicationName}
          onRecordAnother={() => resetRecordState(state)}
          onReturnHome={() => router.push("/")}
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
          setAllowOverride={state.setAllowOverride}
          setConditionTags={state.setConditionTags}
          setInventorySourceId={state.setInventorySourceId}
          setNotes={state.setNotes}
          setRequiresCoSign={state.setRequiresCoSign}
          setSite={state.setSite}
          site={state.site}
        />
      )}
    </MobileRecordLayout>
  );
}

// Helper component for tablet layout rendering
function RenderTabletLayout({
  state,
  animals,
  dueRegimens,
  regimensLoading,
  regimensError,
  isOnline,
  inventorySources,
  inventoryLoading,
  isSubmitting,
  handleRegimenSelect,
  handleConfirm,
  router,
  resetRecordState,
}: {
  state: ReturnType<typeof useRecordState>;
  animals: Array<{
    id: string;
    name: string;
    species: string;
    pendingMeds: number;
    avatar?: string;
  }>;
  dueRegimens?: DueRegimen[];
  regimensLoading: boolean;
  regimensError: Error | null;
  isOnline: boolean;
  inventorySources: InventorySource[];
  inventoryLoading: boolean;
  isSubmitting: boolean;
  handleRegimenSelect: (regimen: DueRegimen) => void;
  handleConfirm: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
  resetRecordState: (state: RecordState) => void;
}) {
  return (
    <TabletRecordLayout
      dueRegimens={dueRegimens}
      isOnline={isOnline}
      onBack={() => {
        if (state.step === "confirm") {
          state.setStep("select");
        }
      }}
      onCancel={() => router.push("/")}
      onRegimenSelect={handleRegimenSelect}
      regimensError={regimensError}
      regimensLoading={regimensLoading}
      selectedRegimen={state.selectedRegimen}
      step={state.step}
    >
      {state.step === "success" && (
        <TabletSuccessLayout
          animalName={state.selectedRegimen?.animalName}
          isOnline={isOnline}
          medicationName={state.selectedRegimen?.medicationName}
          onRecordAnother={() => resetRecordState(state)}
          onReturnHome={() => router.push("/")}
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
          setAllowOverride={state.setAllowOverride}
          setConditionTags={state.setConditionTags}
          setInventorySourceId={state.setInventorySourceId}
          setNotes={state.setNotes}
          setRequiresCoSign={state.setRequiresCoSign}
          setSite={state.setSite}
          site={state.site}
        />
      )}
    </TabletRecordLayout>
  );
}

// Photo Evidence Uploader Component for multiple photos
function PhotoEvidenceUploader({
  photoUrls,
  setPhotoUrls,
  householdId,
  userId,
  animalId,
}: {
  photoUrls: string[];
  setPhotoUrls: React.Dispatch<React.SetStateAction<string[]>>;
  householdId: string;
  userId: string;
  animalId: string;
}) {
  const [currentUpload, setCurrentUpload] = useState<string | null>(null);

  const handlePhotoUpload = (url: string, _file: File) => {
    setPhotoUrls((prev) => [...prev, url]);
    setCurrentUpload(null);
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotoUrls((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleStartUpload = () => {
    const uploadId = Date.now().toString();
    setCurrentUpload(uploadId);
  };

  // Don't show uploader if we don't have required IDs
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

      {/* Show uploader for new photos (limit to 4 photos) */}
      {photoUrls.length < 4 && !currentUpload && (
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

      {photoUrls.length >= 4 && (
        <p className="text-center text-muted-foreground text-xs">
          Maximum 4 photos per administration
        </p>
      )}
    </div>
  );
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
