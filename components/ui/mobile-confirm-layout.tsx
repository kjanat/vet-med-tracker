"use client";

import { Camera, Tag } from "lucide-react";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
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

interface MobileConfirmLayoutProps {
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

export function MobileConfirmLayout({
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
}: MobileConfirmLayoutProps) {
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
    <div className="flex h-full flex-col">
      {/* Medication Summary Card - Fixed at top */}
      <div className="shrink-0 border-b bg-background p-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-base">
              {animal && <AnimalAvatar animal={animal} size="sm" />}
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">
                  {animal?.name} - {selectedRegimen.medicationName}
                </div>
                <div className="font-normal text-muted-foreground text-sm">
                  {selectedRegimen.strength} • {selectedRegimen.route} •{" "}
                  {selectedRegimen.form}
                </div>
              </div>
              {selectedRegimen.isHighRisk && (
                <Badge variant="destructive" className="shrink-0 text-xs">
                  High Risk
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Scrollable Form Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-6 p-4">
          {/* Inventory Source */}
          <div>
            <Label className="font-medium text-base">Inventory Source</Label>
            <div className="mt-2">
              {inventoryLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <InventorySourceSelect
                  sources={relevantSources}
                  selectedId={inventorySourceId ?? undefined}
                  onSelect={setInventorySourceId}
                  allowOverride={true}
                  onOverrideChange={setAllowOverride}
                />
              )}
            </div>
          </div>

          {/* Site and Media Row */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="mobile-site" className="font-medium text-base">
                Site/Side (Optional)
              </Label>
              <Input
                id="mobile-site"
                placeholder="Left ear, right leg..."
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="mt-2 h-12"
              />
            </div>
            <div>
              <Label className="font-medium text-base">Photo/Video</Label>
              <Button
                variant="outline"
                className="mt-2 h-12 w-full bg-transparent"
                type="button"
              >
                <Camera className="mr-2 h-5 w-5" />
                Add Media
              </Button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="mobile-notes" className="font-medium text-base">
              Notes (Optional)
            </Label>
            <Textarea
              id="mobile-notes"
              placeholder="Any observations or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2 min-h-[80px]"
            />
          </div>

          {/* Condition Tags */}
          <MobileConditionTagSelector
            conditionTags={conditionTags}
            setConditionTags={setConditionTags}
          />

          {/* Co-sign Requirement */}
          {selectedRegimen.isHighRisk && (
            <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="mobile-cosign"
                  checked={requiresCoSign}
                  onCheckedChange={(checked) =>
                    setRequiresCoSign(checked === true)
                  }
                  className="mt-0.5"
                />
                <Label
                  htmlFor="mobile-cosign"
                  className="text-sm leading-relaxed"
                >
                  Requires co-sign (high-risk medication)
                </Label>
              </div>
              {requiresCoSign && (
                <div className="rounded bg-orange-100 p-2 text-orange-600 text-xs">
                  Another caregiver must co-sign this administration within 10
                  minutes.
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Fixed Action Button */}
      <div className="shrink-0 border-t bg-background p-4">
        <MedConfirmButton
          onConfirm={onConfirm}
          disabled={isDisabled}
          requiresCoSign={requiresCoSign}
          className="h-14 w-full text-base"
        >
          {isSubmitting ? "Recording..." : "Hold to Confirm (3s)"}
        </MedConfirmButton>
      </div>
    </div>
  );
}

function MobileConditionTagSelector({
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
      <div className="mt-3 flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Button
            key={tag}
            variant={conditionTags.includes(tag) ? "default" : "outline"}
            size="sm"
            className="h-10 px-4"
            onClick={() => {
              setConditionTags((prev) =>
                prev.includes(tag)
                  ? prev.filter((t) => t !== tag)
                  : [...prev, tag],
              );
            }}
            type="button"
          >
            <Tag className="mr-2 h-3 w-3" />
            {tag}
          </Button>
        ))}
      </div>
    </div>
  );
}
