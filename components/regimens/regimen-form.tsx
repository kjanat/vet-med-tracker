"use client";

import { format } from "date-fns";
import { Plus, Search, X } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/server/trpc/client";
import type { Regimen } from "./regimen-list";

interface RegimenFormProps {
  regimen: Regimen | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Partial<Regimen>) => Promise<void>;
}

interface MedicationOption {
  id: string;
  generic: string;
  brand?: string;
  route: string;
  form: string;
  strength?: string;
}

// Helper functions
function getInitialFormData(): Partial<Regimen> {
  return {
    animalId: "",
    cutoffMins: 60,
    endDate: undefined,
    form: "",
    highRisk: false,
    medicationId: "",
    medicationName: "",
    route: "",
    scheduleType: "FIXED",
    startDate: undefined,
    strength: "",
    timesLocal: [],
  };
}

function checkFormValidity(formData: Partial<Regimen>): boolean {
  const hasBasicInfo = Boolean(
    formData.animalId && formData.medicationId && formData.medicationName,
  );
  const hasValidSchedule =
    formData.scheduleType === "PRN" ||
    (formData.scheduleType === "FIXED" &&
      formData.timesLocal &&
      formData.timesLocal.length > 0);

  return Boolean(hasBasicInfo && hasValidSchedule);
}

export function RegimenForm({
  regimen,
  open,
  onOpenChange,
  onSave,
}: RegimenFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [medicationSearch, setMedicationSearch] = useState("");
  const [medicationOpen, setMedicationOpen] = useState(false);
  const [newTime, setNewTime] = useState("");
  const [formData, setFormData] = useState<Partial<Regimen>>(
    getInitialFormData(),
  );

  const { animals } = useApp();

  // Search medications from the database when user types
  const { data: searchResults = [], isLoading: searchLoading } =
    trpc.medication.search.useQuery(
      { limit: 20, query: medicationSearch },
      {
        enabled: medicationSearch.length > 0,
        staleTime: 30000, // Cache for 30 seconds
      },
    );

  useEffect(() => {
    setFormData(regimen ? { ...regimen } : getInitialFormData());
  }, [regimen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await onSave(formData);
    } catch {
      // Failed to save regimen
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMedicationSelect = (medication: MedicationOption) => {
    setFormData((prev) => ({
      ...prev,
      form: medication.form,
      medicationId: medication.id,
      medicationName: medication.brand || medication.generic,
      route: medication.route,
      strength: medication.strength,
    }));
    setMedicationOpen(false);
    setMedicationSearch(""); // Clear search
  };

  const addTime = () => {
    if (newTime && !formData.timesLocal?.includes(newTime)) {
      setFormData((prev) => ({
        ...prev,
        timesLocal: [...(prev.timesLocal || []), newTime].sort(),
      }));
      setNewTime("");
    }
  };

  const removeTime = (time: string) => {
    setFormData((prev) => ({
      ...prev,
      timesLocal: prev.timesLocal?.filter((t) => t !== time) || [],
    }));
  };

  // Transform search results to MedicationOption format
  const medicationOptions: MedicationOption[] = searchResults.map((med) => ({
    brand: med.brandName || undefined,
    form: med.form,
    generic: med.genericName,
    id: med.id,
    route: med.route,
    strength: med.strength || undefined,
  }));

  const isFormValid = checkFormValidity(formData);

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-xl md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{regimen ? "Edit Regimen" : "Add Regimen"}</DialogTitle>
          <DialogDescription>
            {regimen
              ? "Update medication schedule and dosing"
              : "Create a new medication regimen"}
          </DialogDescription>
        </DialogHeader>

        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          {/* Animal Selection */}
          <AnimalSelector
            animals={animals}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, animalId: value }))
            }
            value={formData.animalId}
          />

          {/* Medication Selection */}
          <MedicationSelector
            medicationDetails={{
              form: formData.form,
              route: formData.route,
              strength: formData.strength,
            }}
            medicationName={formData.medicationName}
            medicationOpen={medicationOpen}
            medicationOptions={medicationOptions}
            medicationSearch={medicationSearch}
            onSelect={handleMedicationSelect}
            searchLoading={searchLoading}
            setMedicationOpen={setMedicationOpen}
            setMedicationSearch={setMedicationSearch}
          />

          {/* Schedule Type */}
          <ScheduleTypeSelector
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, scheduleType: value }))
            }
            value={formData.scheduleType}
          />

          {/* Fixed Schedule Times */}
          {formData.scheduleType === "FIXED" && (
            <FixedScheduleTimes
              addTime={addTime}
              newTime={newTime}
              removeTime={removeTime}
              setNewTime={setNewTime}
              timesLocal={formData.timesLocal}
            />
          )}

          {/* Course Dates */}
          <CourseDatesSelector
            endDate={formData.endDate}
            onEndDateChange={(date) =>
              setFormData((prev) => ({ ...prev, endDate: date }))
            }
            onStartDateChange={(date) =>
              setFormData((prev) => ({ ...prev, startDate: date }))
            }
            startDate={formData.startDate}
          />

          {/* Settings */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cutoff">Cutoff Minutes</Label>
              <Select
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    cutoffMins: Number.parseInt(value, 10),
                  }))
                }
                value={formData.cutoffMins?.toString()}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                  <SelectItem value="480">8 hours</SelectItem>
                  <SelectItem value="720">12 hours</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-xs">
                Time after scheduled dose when it&apos;s marked as
                &quot;missed&quot;
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.highRisk}
                id="highRisk"
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    highRisk: checked as boolean,
                  }))
                }
              />
              <Label className="text-sm" htmlFor="highRisk">
                High-risk medication (requires co-signature)
              </Label>
            </div>
          </div>

          {/* Preview */}
          {formData.scheduleType === "FIXED" && formData.timesLocal?.length ? (
            <SchedulePreview timesLocal={formData.timesLocal} />
          ) : null}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              onClick={() => onOpenChange(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting || !isFormValid} type="submit">
              {isSubmitting
                ? "Saving..."
                : regimen
                  ? "Update Regimen"
                  : "Create Regimen"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Helper components
function MedicationItem({
  medication,
  onSelect,
}: {
  medication: MedicationOption;
  onSelect: (medication: MedicationOption) => void;
}) {
  return (
    <CommandItem onSelect={() => onSelect(medication)}>
      <div>
        <div className="font-medium">
          {medication.brand || medication.generic}
          {medication.brand && medication.brand !== medication.generic && (
            <span className="font-normal text-muted-foreground">
              {" "}
              ({medication.generic})
            </span>
          )}
        </div>
        <div className="text-muted-foreground text-sm">
          {medication.strength} • {medication.route} • {medication.form}
        </div>
      </div>
    </CommandItem>
  );
}

// New component to reduce complexity
interface MedicationSelectorProps {
  medicationName?: string;
  medicationDetails: {
    strength?: string;
    route?: string;
    form?: string;
  };
  medicationOpen: boolean;
  setMedicationOpen: (open: boolean) => void;
  medicationSearch: string;
  setMedicationSearch: (search: string) => void;
  searchLoading: boolean;
  medicationOptions: MedicationOption[];
  onSelect: (medication: MedicationOption) => void;
}

function MedicationSelector({
  medicationName,
  medicationDetails,
  medicationOpen,
  setMedicationOpen,
  medicationSearch,
  setMedicationSearch,
  searchLoading,
  medicationOptions,
  onSelect,
}: MedicationSelectorProps) {
  const renderSearchEmpty = () => {
    if (searchLoading) {
      return (
        <div className="p-4 text-center">
          <p className="text-muted-foreground text-sm">
            Searching medications...
          </p>
        </div>
      );
    }

    if (medicationSearch.length === 0) {
      return (
        <div className="p-4 text-center">
          <p className="text-muted-foreground text-sm">
            Start typing to search medications
          </p>
        </div>
      );
    }

    return (
      <div className="p-4 text-center">
        <p className="mb-2 text-muted-foreground text-sm">
          No medication found
        </p>
        <p className="text-muted-foreground text-xs">
          Contact admin to add "{medicationSearch}" to the catalog
        </p>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <Label>Medication *</Label>
      <Popover onOpenChange={setMedicationOpen} open={medicationOpen}>
        <PopoverTrigger asChild>
          <Button
            className="w-full justify-between bg-transparent"
            variant="outline"
          >
            {medicationName || "Select medication"}
            <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0">
          <Command>
            <CommandInput
              onValueChange={setMedicationSearch}
              placeholder="Search medications..."
              value={medicationSearch}
            />
            <CommandList>
              <CommandEmpty>{renderSearchEmpty()}</CommandEmpty>
              <CommandGroup>
                {medicationOptions.map((medication) => (
                  <MedicationItem
                    key={medication.id}
                    medication={medication}
                    onSelect={onSelect}
                  />
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {medicationName && (
        <div className="text-muted-foreground text-sm">
          {medicationDetails.strength} • {medicationDetails.route} •{" "}
          {medicationDetails.form}
        </div>
      )}
    </div>
  );
}

interface CourseDatesSelectorProps {
  startDate?: Date;
  endDate?: Date;
  onStartDateChange: (date?: Date) => void;
  onEndDateChange: (date?: Date) => void;
}

function CourseDatesSelector({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
}: CourseDatesSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="startDate">Start Date</Label>
        <Input
          id="startDate"
          onChange={(e) =>
            onStartDateChange(
              e.target.value ? new Date(e.target.value) : undefined,
            )
          }
          type="date"
          value={startDate ? startDate.toISOString().split("T")[0] : ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="endDate">End Date</Label>
        <Input
          id="endDate"
          onChange={(e) =>
            onEndDateChange(
              e.target.value ? new Date(e.target.value) : undefined,
            )
          }
          type="date"
          value={endDate ? endDate.toISOString().split("T")[0] : ""}
        />
      </div>
    </div>
  );
}

function SchedulePreview({ timesLocal }: { timesLocal: string[] }) {
  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Today&apos;s Schedule Preview</CardTitle>
        <CardDescription>Times shown in animal&apos;s timezone</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {timesLocal.map((time) => (
            <Badge key={time} variant="outline">
              {format(new Date(`2000-01-01T${time}`), "h:mm a")}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Animal Selector Component
function AnimalSelector({
  animals,
  value,
  onChange,
}: {
  animals: Array<{ id: string; name: string; species: string }>;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="animal">Animal *</Label>
      <Select onValueChange={onChange} value={value || ""}>
        <SelectTrigger>
          <SelectValue placeholder="Select animal" />
        </SelectTrigger>
        <SelectContent>
          {animals.map((animal) => (
            <SelectItem key={animal.id} value={animal.id}>
              {animal.name} ({animal.species})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Schedule Type Selector Component
function ScheduleTypeSelector({
  value,
  onChange,
}: {
  value: "FIXED" | "PRN" | undefined;
  onChange: (value: "FIXED" | "PRN") => void;
}) {
  return (
    <div className="space-y-3">
      <Label>Schedule Type *</Label>
      <div className="grid grid-cols-2 gap-4">
        <Card
          className={`cursor-pointer transition-colors ${
            value === "FIXED" ? "ring-2 ring-primary" : "hover:bg-accent"
          }`}
          onClick={() => onChange("FIXED")}
        >
          <CardContent className="p-4">
            <div className="font-medium">Fixed Schedule</div>
            <div className="text-muted-foreground text-sm">
              Regular times each day
            </div>
          </CardContent>
        </Card>

        <Card
          className={`cursor-pointer transition-colors ${
            value === "PRN" ? "ring-2 ring-primary" : "hover:bg-accent"
          }`}
          onClick={() => onChange("PRN")}
        >
          <CardContent className="p-4">
            <div className="font-medium">PRN (As Needed)</div>
            <div className="text-muted-foreground text-sm">
              Given when required
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Fixed Schedule Times Component
function FixedScheduleTimes({
  timesLocal,
  newTime,
  setNewTime,
  addTime,
  removeTime,
}: {
  timesLocal?: string[];
  newTime: string;
  setNewTime: (time: string) => void;
  addTime: () => void;
  removeTime: (time: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Label>Daily Times *</Label>
      <div className="flex gap-2">
        <Input
          onChange={(e) => setNewTime(e.target.value)}
          placeholder="Add time"
          type="time"
          value={newTime}
        />
        <Button onClick={addTime} size="sm" type="button">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {timesLocal?.map((time) => (
          <Badge className="gap-1" key={time} variant="secondary">
            {format(new Date(`2000-01-01T${time}`), "h:mm a")}
            <button onClick={() => removeTime(time)} type="button">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {timesLocal?.length === 0 && (
        <p className="text-muted-foreground text-sm">
          Add at least one daily time
        </p>
      )}
    </div>
  );
}
