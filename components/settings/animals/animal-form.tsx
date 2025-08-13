import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@stackframe/stack";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PhotoUploader } from "@/components/ui/photo-uploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TimezoneCombobox } from "@/components/ui/timezone-combobox";
import {
  type AnimalFormData,
  animalFormBaseSchema,
} from "@/lib/schemas/animal";
import type { Animal } from "@/lib/utils/types";

interface AnimalFormProps {
  animal: Animal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: AnimalFormData) => Promise<void>;
}

export function AnimalForm({
  animal,
  open,
  onOpenChange,
  onSave,
}: AnimalFormProps) {
  const user = useUser();
  const { selectedHousehold } = useApp();
  const [newAllergy, setNewAllergy] = useState("");
  const [newCondition, setNewCondition] = useState("");

  const form = useForm<AnimalFormData>({
    resolver: zodResolver(animalFormBaseSchema) as any,
    defaultValues: {
      name: "",
      species: "",
      breed: undefined,
      sex: undefined,
      neutered: false,
      dob: undefined,
      weightKg: undefined,
      microchipId: undefined,
      color: undefined,
      timezone: "America/New_York",
      vetName: undefined,
      vetPhone: undefined,
      vetEmail: undefined,
      clinicName: undefined,
      notes: undefined,
      allergies: [],
      conditions: [],
      photoUrl: undefined,
    },
  });

  useEffect(() => {
    if (animal) {
      form.reset({
        name: animal.name,
        species: animal.species,
        breed: animal.breed || "",
        sex: animal.sex,
        neutered: animal.neutered || false,
        dob: animal.dob,
        weightKg: animal.weightKg,
        microchipId: animal.microchipId || "",
        color: animal.color || "",
        timezone: animal.timezone || "America/New_York",
        vetName: animal.vetName || "",
        vetPhone: animal.vetPhone || "",
        vetEmail: animal.vetEmail || "",
        clinicName: animal.clinicName || "",
        notes: animal.notes || "",
        allergies: animal.allergies || [],
        conditions: animal.conditions || [],
      });
    } else {
      form.reset();
    }
  }, [animal, form]);

  const onSubmit = async (data: AnimalFormData) => {
    try {
      await onSave(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save animal:", error);
    }
  };

  const addAllergy = () => {
    const currentAllergies = form.getValues("allergies");
    if (newAllergy.trim() && !currentAllergies.includes(newAllergy.trim())) {
      form.setValue("allergies", [...currentAllergies, newAllergy.trim()]);
      setNewAllergy("");
    }
  };

  const removeAllergy = (allergy: string) => {
    const currentAllergies = form.getValues("allergies");
    form.setValue(
      "allergies",
      currentAllergies.filter((a) => a !== allergy),
    );
  };

  const addCondition = () => {
    const currentConditions = form.getValues("conditions");
    if (
      newCondition.trim() &&
      !currentConditions.includes(newCondition.trim())
    ) {
      form.setValue("conditions", [...currentConditions, newCondition.trim()]);
      setNewCondition("");
    }
  };

  const removeCondition = (condition: string) => {
    const currentConditions = form.getValues("conditions");
    form.setValue(
      "conditions",
      currentConditions.filter((c) => c !== condition),
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-[95vw] overflow-y-auto sm:max-w-xl md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{animal ? "Edit Animal" : "Add Animal"}</DialogTitle>
          <DialogDescription>
            {animal
              ? "Update animal profile and medical information"
              : "Create a new animal profile"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-6 space-y-6"
          >
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Basic Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="species"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Species *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select species" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Dog">Dog</SelectItem>
                          <SelectItem value="Cat">Cat</SelectItem>
                          <SelectItem value="Bird">Bird</SelectItem>
                          <SelectItem value="Rabbit">Rabbit</SelectItem>
                          <SelectItem value="Horse">Horse</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="breed"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Breed</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Color</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="sex"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sex</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select sex" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={
                            field.value
                              ? field.value.toISOString().split("T")[0]
                              : ""
                          }
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? new Date(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="weightKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weight (kg)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(
                              e.target.value
                                ? Number.parseFloat(e.target.value)
                                : undefined,
                            )
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="neutered"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="font-normal">
                      Spayed/Neutered
                    </FormLabel>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="microchipId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Microchip ID</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="timezone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Timezone *</FormLabel>
                      <FormControl>
                        <TimezoneCombobox
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Select timezone"
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Veterinary Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Veterinary Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vetName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Veterinarian Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vetPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Veterinarian Phone</FormLabel>
                      <FormControl>
                        <Input type="tel" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="vetEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Veterinarian Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="clinicName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Clinic Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes about the animal..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Medical Info */}
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Medical Information</h3>

              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allergies</FormLabel>
                      <div className="mt-1 flex gap-2">
                        <Input
                          placeholder="Add allergy"
                          value={newAllergy}
                          onChange={(e) => setNewAllergy(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addAllergy();
                            }
                          }}
                        />
                        <Button type="button" onClick={addAllergy} size="sm">
                          Add
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {field.value?.map((allergy) => (
                          <Badge
                            key={allergy}
                            variant="destructive"
                            className="gap-1"
                          >
                            {allergy}
                            <button
                              type="button"
                              onClick={() => removeAllergy(allergy)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="conditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medical Conditions</FormLabel>
                      <div className="mt-1 flex gap-2">
                        <Input
                          placeholder="Add condition"
                          value={newCondition}
                          onChange={(e) => setNewCondition(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              addCondition();
                            }
                          }}
                        />
                        <Button type="button" onClick={addCondition} size="sm">
                          Add
                        </Button>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {field.value?.map((condition) => (
                          <Badge
                            key={condition}
                            variant="secondary"
                            className="gap-1"
                          >
                            {condition}
                            <button
                              type="button"
                              onClick={() => removeCondition(condition)}
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Photo Upload */}
            {user?.id && selectedHousehold?.id && (
              <PhotoUploader
                onUpload={(url, _file) => {
                  form.setValue("photoUrl", url);
                }}
                value={form.watch("photoUrl") || undefined}
                householdId={selectedHousehold.id}
                userId={user.id}
                animalId={animal?.id}
                maxSizeKB={5000}
                placeholder="Click to upload animal photo or drag and drop"
              />
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Saving..."
                  : animal
                    ? "Update Animal"
                    : "Create Animal"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
