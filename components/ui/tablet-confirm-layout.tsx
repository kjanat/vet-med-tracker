"use client";

import { Camera, Tag } from "lucide-react";
import type React from "react";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { InventorySourceSelect } from "@/components/ui/inventory-source-select";
import { Label } from "@/components/ui/label";
import { MedConfirmButton } from "@/components/ui/med-confirm-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { InventorySource } from "@/types/inventory";

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
  section: "due" | "later" | "prn";
  isOverdue?: boolean;
  minutesUntilDue?: number;
  instructions?: string | null;
  prnReason?: string | null;
}

interface TabletConfirmLayoutProps {
  selectedRegimen: DueRegimen;
  animals: Array<{
    id: string;
    name: string;
    species: string;
    pendingMeds: number;
    avatar?: string;
  }>;
  inventorySources: InventorySource[];
  inventoryLoading?: boolean;
  isSubmitting?: boolean;
  // Form state
  inventorySourceId: string | null;
  allowOverride: boolean;
  requiresCoSign: boolean;
  notes: string;
  site: string;
  conditionTags: string[];
  // Form handlers
  setInventorySourceId: (id: string | null) => void;
  setAllowOverride: (allow: boolean) => void;
  setRequiresCoSign: (requires: boolean) => void;
  setNotes: (notes: string) => void;
  setSite: (site: string) => void;
  setConditionTags: React.Dispatch<React.SetStateAction<string[]>>;
  // Actions
  onConfirm: () => Promise<void>;
}

export function TabletConfirmLayout({
  selectedRegimen,
  animals,
  inventorySources,
  inventoryLoading,
  isSubmitting,
  inventorySourceId,
  allowOverride,
  requiresCoSign,
  notes,
  site,
  conditionTags,
  setInventorySourceId,
  setAllowOverride,
  setRequiresCoSign,
  setNotes,
  setSite,
  setConditionTags,
  onConfirm,
}: TabletConfirmLayoutProps) {
  const animal = animals.find((a) => a.id === selectedRegimen.animalId);
  const relevantSources = inventorySources.filter((s) =>
    s.name
      .toLowerCase()
      .includes(selectedRegimen.medicationName.toLowerCase() || ""),
  );

  const isDisabled =
    isSubmitting ||
    (relevantSources.some(
      (s) => s.id === inventorySourceId && (s.isExpired || s.isWrongMed),
    ) &&
      !allowOverride);

  return (
    <div className="flex h-full">
      {/* Left column - Form */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="max-w-2xl p-6">
            <div className="space-y-8">
              {/* Medication Summary - Compact for tablet */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    {animal && <AnimalAvatar animal={animal} size="md" />}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-xl">
                        {animal?.name} - {selectedRegimen.medicationName}
                      </div>
                      <div className="font-normal text-base text-muted-foreground">
                        {selectedRegimen.strength} • {selectedRegimen.route} •{" "}
                        {selectedRegimen.form}
                      </div>
                    </div>
                    {selectedRegimen.isHighRisk && (
                      <Badge className="shrink-0" variant="destructive">
                        High Risk
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
              </Card>

              {/* Two-column form layout */}
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Left form column */}
                <div className="space-y-6">
                  {/* Inventory Source */}
                  <div>
                    <Label className="font-medium text-base">
                      Inventory Source
                    </Label>
                    <div className="mt-3">
                      {inventoryLoading ? (
                        <Skeleton className="h-12 w-full" />
                      ) : (
                        <InventorySourceSelect
                          allowOverride={true}
                          onOverrideChange={setAllowOverride}
                          onSelect={setInventorySourceId}
                          selectedId={inventorySourceId ?? undefined}
                          sources={relevantSources}
                        />
                      )}
                    </div>
                  </div>

                  {/* Site and Media */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <Label
                        className="font-medium text-base"
                        htmlFor="tablet-site"
                      >
                        Site/Side (Optional)
                      </Label>
                      <Input
                        className="mt-2 h-11"
                        id="tablet-site"
                        onChange={(e) => setSite(e.target.value)}
                        placeholder="Left ear, right leg..."
                        value={site}
                      />
                    </div>
                    <div>
                      <Label className="font-medium text-base">
                        Photo/Video
                      </Label>
                      <Button
                        className="mt-2 h-11 w-full bg-transparent"
                        type="button"
                        variant="outline"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Add Media
                      </Button>
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <Label
                      className="font-medium text-base"
                      htmlFor="tablet-notes"
                    >
                      Notes (Optional)
                    </Label>
                    <Textarea
                      className="mt-2 min-h-[100px]"
                      id="tablet-notes"
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any observations or notes..."
                      value={notes}
                    />
                  </div>
                </div>

                {/* Right form column */}
                <div className="space-y-6">
                  {/* Condition Tags */}
                  <TabletConditionTagSelector
                    conditionTags={conditionTags}
                    setConditionTags={setConditionTags}
                  />

                  {/* Co-sign Requirement */}
                  {selectedRegimen.isHighRisk && (
                    <Card className="border-orange-200 bg-orange-50">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              checked={requiresCoSign}
                              className="mt-0.5"
                              id="tablet-cosign"
                              onCheckedChange={(checked) =>
                                setRequiresCoSign(checked === true)
                              }
                            />
                            <div className="space-y-1">
                              <Label
                                className="font-medium text-sm"
                                htmlFor="tablet-cosign"
                              >
                                Requires co-sign (high-risk medication)
                              </Label>
                              <p className="text-muted-foreground text-xs">
                                Another caregiver must co-sign this
                                administration within 10 minutes.
                              </p>
                            </div>
                          </div>
                          {requiresCoSign && (
                            <div className="rounded-md bg-orange-100 p-3 text-orange-700 text-xs">
                              Co-sign will be required after confirmation. Make
                              sure another authorized caregiver is available.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Instructions Preview */}
                  {selectedRegimen.instructions && (
                    <Card className="bg-muted/30">
                      <CardContent className="p-4">
                        <h4 className="mb-2 font-medium text-sm">
                          Instructions
                        </h4>
                        <p className="text-muted-foreground text-sm">
                          {selectedRegimen.instructions}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Right column - Action panel */}
      <div className="w-80 shrink-0 border-l bg-muted/30">
        <div className="flex h-full flex-col p-6">
          <div className="mb-6">
            <h3 className="mb-2 font-semibold text-lg">Ready to Record?</h3>
            <p className="text-muted-foreground text-sm">
              Review your selections and hold the button below to confirm the
              administration.
            </p>
          </div>

          <div className="flex-1" />

          <MedConfirmButton
            className="h-14 w-full text-base"
            disabled={isDisabled}
            onConfirm={onConfirm}
            requiresCoSign={requiresCoSign}
          >
            {isSubmitting ? "Recording..." : "Hold to Confirm (3s)"}
          </MedConfirmButton>
        </div>
      </div>
    </div>
  );
}

function TabletConditionTagSelector({
  conditionTags,
  setConditionTags,
}: {
  conditionTags: string[];
  setConditionTags: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const tags = ["Normal", "Improved", "No Change", "Worse", "Side Effects"];

  return (
    <div>
      <Label className="font-medium text-base">Condition Tags</Label>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {tags.map((tag) => (
          <Button
            className="h-10 justify-start px-3"
            key={tag}
            onClick={() => {
              setConditionTags((prev) =>
                prev.includes(tag)
                  ? prev.filter((t) => t !== tag)
                  : [...prev, tag],
              );
            }}
            size="sm"
            type="button"
            variant={conditionTags.includes(tag) ? "default" : "outline"}
          >
            <Tag className="mr-2 h-3 w-3" />
            {tag}
          </Button>
        ))}
      </div>
    </div>
  );
}
