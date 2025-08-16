"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { useToast } from "@/hooks/shared/use-toast";
import type { AnimalFormData } from "@/lib/schemas/animal";
import type { Animal } from "@/lib/utils/types";
import { trpc } from "@/server/trpc/client";
import { BROWSER_ZONE } from "@/utils/timezone-helpers";

// Simplified schema for form validation to avoid complex type inference issues
const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  species: z.string().min(1, "Species is required"),
  breed: z.string().optional(),
  sex: z.enum(["Male", "Female"]).optional(),
  neutered: z.boolean(),
  dob: z.date().optional(),
  weightKg: z.number().optional(),
  microchipId: z.string().optional(),
  color: z.string().optional(),
  timezone: z.string().min(1, "Timezone is required"),
  vetName: z.string().optional(),
  vetPhone: z.string().optional(),
  vetEmail: z.string().email().optional().or(z.literal("")),
  clinicName: z.string().optional(),
  notes: z.string().optional(),
  allergies: z.array(z.string()),
  conditions: z.array(z.string()),
  photoUrl: z.string().url().optional().or(z.literal("")),
});

/**
 * Animal form state interface
 */
interface AnimalFormState {
  isOpen: boolean;
  editingAnimal: Animal | null;
  isLoading: boolean;
  isDirty: boolean;
}

/**
 * Animal form actions interface
 */
interface AnimalFormActions {
  openForm: (animal?: Animal | null) => void;
  closeForm: () => void;
  saveForm: (data: AnimalFormData) => Promise<void>;
  resetForm: () => void;
  setDirty: (dirty: boolean) => void;
}

/**
 * Animal form hook return type
 */
interface UseAnimalFormReturn extends AnimalFormState, AnimalFormActions {
  form: ReturnType<typeof useForm<AnimalFormData>>;
  createMutation: ReturnType<typeof trpc.animal.create.useMutation>;
  updateMutation: ReturnType<typeof trpc.animal.update.useMutation>;
}

/**
 * Hook options interface
 */
interface UseAnimalFormOptions {
  /** Called when form is successfully saved */
  onSave?: (animal: Animal, isNew: boolean) => void;
  /** Called when form is opened */
  onOpen?: (animal: Animal | null) => void;
  /** Called when form is closed */
  onClose?: () => void;
  /** Called when form encounters an error */
  onError?: (error: unknown, animal?: Animal | null) => void;
  /** Whether to automatically close form on successful save */
  autoClose?: boolean;
  /** Whether to show success toast on save */
  showSuccessToast?: boolean;
  /** Custom success message */
  successMessage?: (animal: Animal, isNew: boolean) => string;
  /** Whether to enable draft saving */
  enableDraftSaving?: boolean;
  /** Draft save interval in milliseconds */
  draftSaveInterval?: number;
}

/**
 * Advanced animal form management hook with validation, mutations, and state management
 *
 * This hook provides complete form management for animal creation and editing,
 * including validation, tRPC mutations, error handling, and state management.
 *
 * @example
 * ```tsx
 * function AnimalManagement() {
 *   const {
 *     isOpen,
 *     form,
 *     openForm,
 *     closeForm,
 *     saveForm,
 *     isLoading,
 *   } = useAnimalForm({
 *     onSave: (animal, isNew) => {
 *       console.log(`${isNew ? 'Created' : 'Updated'} animal:`, animal);
 *     },
 *     showSuccessToast: true,
 *   });
 *
 *   return (
 *     <div>
 *       <Button onClick={() => openForm()}>Add Animal</Button>
 *       <AnimalFormDialog
 *         open={isOpen}
 *         onOpenChange={closeForm}
 *         form={form}
 *         onSubmit={saveForm}
 *         isLoading={isLoading}
 *       />
 *     </div>
 *   );
 * }
 * ```
 */
export function useAnimalForm(
  options: UseAnimalFormOptions = {},
): UseAnimalFormReturn {
  const {
    onSave,
    onOpen,
    onClose,
    onError,
    autoClose = true,
    showSuccessToast = true,
    successMessage,
    // Draft saving options currently disabled - commented out unused parameters
    // enableDraftSaving = false,
    // draftSaveInterval = 5000,
  } = options;

  const [isOpen, setIsOpen] = useState(false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const { selectedHousehold } = useApp();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Initialize form with validation
  const form = useForm<AnimalFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      species: "",
      breed: "",
      sex: undefined,
      neutered: false,
      dob: undefined,
      weightKg: undefined,
      microchipId: "",
      color: "",
      timezone: BROWSER_ZONE || "America/New_York",
      vetName: "",
      vetPhone: "",
      vetEmail: "",
      clinicName: "",
      notes: "",
      allergies: [],
      conditions: [],
      photoUrl: "",
    },
    mode: "onBlur",
  });

  // tRPC mutations
  const createMutation = trpc.animal.create.useMutation({
    onSuccess: (data) => {
      // Invalidate queries to refresh data
      utils.animal.list.invalidate();
      utils.household.getAnimals.invalidate();

      if (showSuccessToast && data) {
        const message =
          successMessage?.(data as unknown as Animal, true) ||
          `Created ${data.name}`;
        toast({ title: "Success", description: message });
      }

      if (data) {
        onSave?.(data as unknown as Animal, true);
      }
    },
    onError: (error) => {
      console.error("Error creating animal:", error);
      toast({
        title: "Error",
        description: "Failed to create animal. Please try again.",
        variant: "destructive",
      });
      onError?.(error, editingAnimal);
    },
  });

  const updateMutation = trpc.animal.update.useMutation({
    onSuccess: (data) => {
      // Invalidate queries to refresh data
      utils.animal.list.invalidate();
      utils.household.getAnimals.invalidate();

      if (showSuccessToast && data) {
        const message =
          successMessage?.(data as unknown as Animal, false) ||
          `Updated ${data.name}`;
        toast({ title: "Success", description: message });
      }

      if (data) {
        onSave?.(data as unknown as Animal, false);
      }
    },
    onError: (error) => {
      console.error("Error updating animal:", error);
      toast({
        title: "Error",
        description: "Failed to update animal. Please try again.",
        variant: "destructive",
      });
      onError?.(error, editingAnimal);
    },
  });

  /**
   * Transform form data for API calls
   */
  const transformAnimalData = useCallback((data: AnimalFormData) => {
    return {
      ...data,
      dob: data.dob ? data.dob.toISOString() : undefined,
      weightKg: data.weightKg || undefined,
      breed: data.breed || undefined,
      microchipId: data.microchipId || undefined,
      color: data.color || undefined,
      vetName: data.vetName || undefined,
      vetPhone: data.vetPhone || undefined,
      vetEmail: data.vetEmail || undefined,
      clinicName: data.clinicName || undefined,
      notes: data.notes || undefined,
      photoUrl: data.photoUrl || undefined,
    };
  }, []);

  /**
   * Validate form data before submission
   */
  const validateFormData = useCallback(
    (data: AnimalFormData): boolean => {
      if (!selectedHousehold) {
        toast({
          title: "Error",
          description: "No household selected",
          variant: "destructive",
        });
        return false;
      }

      if (!data.name?.trim() || !data.species?.trim()) {
        toast({
          title: "Error",
          description: "Name and species are required",
          variant: "destructive",
        });
        return false;
      }

      return true;
    },
    [selectedHousehold, toast],
  );

  /**
   * Fire instrumentation events
   */
  const fireInstrumentationEvent = useCallback(
    (data: AnimalFormData, isNew: boolean) => {
      const eventType = isNew
        ? "settings_animals_create"
        : "settings_animals_update";
      window.dispatchEvent(
        new CustomEvent(eventType, {
          detail: { animalId: editingAnimal?.id, name: data.name },
        }),
      );
    },
    [editingAnimal?.id],
  );

  /**
   * Get form data from existing animal
   */
  const getFormDataFromAnimal = useCallback(
    (animal: Animal): AnimalFormData => {
      return {
        name: animal.name,
        species: animal.species,
        breed: animal.breed || "",
        sex: animal.sex,
        neutered: animal.neutered || false,
        dob: animal.dob,
        weightKg: animal.weightKg,
        microchipId: animal.microchipId || "",
        color: animal.color || "",
        timezone: animal.timezone || BROWSER_ZONE || "America/New_York",
        vetName: animal.vetName || "",
        vetPhone: animal.vetPhone || "",
        vetEmail: animal.vetEmail || "",
        clinicName: animal.clinicName || "",
        notes: animal.notes || "",
        allergies: animal.allergies || [],
        conditions: animal.conditions || [],
        // Use photo property from Animal type instead of photoUrl
        photoUrl: animal.photo || "",
      };
    },
    [],
  );

  /**
   * Initialize form state for opening
   */
  const initializeFormState = useCallback((animal?: Animal | null) => {
    setEditingAnimal(animal || null);
    setIsOpen(true);
    setIsDirty(false);
  }, []);

  /**
   * Setup form data based on animal
   */
  const setupFormData = useCallback(
    (animal?: Animal | null) => {
      if (animal) {
        const formData = getFormDataFromAnimal(animal);
        form.reset(formData);
      } else {
        form.reset();
      }
    },
    [form, getFormDataFromAnimal],
  );

  /**
   * Open the form for creating or editing an animal
   */
  const openForm = useCallback(
    (animal?: Animal | null) => {
      initializeFormState(animal);
      setupFormData(animal);
      onOpen?.(animal || null);
    },
    [initializeFormState, setupFormData, onOpen],
  );

  /**
   * Close the form
   */
  const closeForm = useCallback(() => {
    setIsOpen(false);
    setEditingAnimal(null);
    setIsDirty(false);
    form.reset();
    onClose?.();
  }, [form, onClose]);

  /**
   * Reset the form to default values
   */
  const resetForm = useCallback(() => {
    form.reset();
    setIsDirty(false);
  }, [form]);

  /**
   * Save the form data
   */
  const saveForm = useCallback(
    async (data: AnimalFormData) => {
      if (!validateFormData(data)) {
        return;
      }

      try {
        const isNew = !editingAnimal;
        fireInstrumentationEvent(data, isNew);

        const transformedData = transformAnimalData(data);

        if (editingAnimal) {
          // Update existing animal
          await updateMutation.mutateAsync({
            id: editingAnimal.id,
            ...transformedData,
          });
        } else {
          // Create new animal
          await createMutation.mutateAsync({
            ...transformedData,
            name: data.name,
            species: data.species,
            allergies: data.allergies || [],
            conditions: data.conditions || [],
            timezone: data.timezone || BROWSER_ZONE || "America/New_York",
          });
        }

        if (autoClose) {
          closeForm();
        } else {
          setIsDirty(false);
        }
      } catch (error) {
        console.error("Error saving animal:", error);
        // Error handling is done in the mutation onError callbacks
      }
    },
    [
      validateFormData,
      editingAnimal,
      fireInstrumentationEvent,
      transformAnimalData,
      updateMutation,
      createMutation,
      autoClose,
      closeForm,
    ],
  );

  /**
   * Set dirty state
   */
  const setDirtyState = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
  }, []);

  // Watch form changes to set dirty state
  const _watchedValues = form.watch();
  const formState = form.formState;

  // Set dirty state when form data changes
  if (formState.isDirty && !isDirty) {
    setDirtyState(true);
  }

  return {
    // State
    isOpen,
    editingAnimal,
    isLoading: createMutation.isPending || updateMutation.isPending,
    isDirty: isDirty || formState.isDirty,

    // Form
    form,

    // Actions
    openForm,
    closeForm,
    saveForm,
    resetForm,
    setDirty: setDirtyState,

    // Mutations
    createMutation,
    updateMutation,
  };
}

/**
 * Simplified animal form hook for basic use cases
 *
 * @example
 * ```tsx
 * function SimpleAnimalForm() {
 *   const { form, saveAnimal, isLoading } = useSimpleAnimalForm();
 *
 *   return (
 *     <form onSubmit={form.handleSubmit(saveAnimal)}>
 *       // Form fields go here
 *     </form>
 *   );
 * }
 * ```
 */
export function useSimpleAnimalForm(animal?: Animal | null) {
  const { form, saveForm, isLoading, createMutation, updateMutation } =
    useAnimalForm({
      autoClose: false,
      showSuccessToast: true,
    });

  // Initialize with animal data if provided
  if (animal && !form.formState.isDirty) {
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
      timezone: animal.timezone || BROWSER_ZONE || "America/New_York",
      vetName: animal.vetName || "",
      vetPhone: animal.vetPhone || "",
      vetEmail: animal.vetEmail || "",
      clinicName: animal.clinicName || "",
      notes: animal.notes || "",
      allergies: animal.allergies || [],
      conditions: animal.conditions || [],
      // Use photo property from Animal type instead of photoUrl
      photoUrl: animal.photo || "",
    });
  }

  return {
    form,
    saveAnimal: saveForm,
    isLoading,
    createMutation,
    updateMutation,
  };
}
