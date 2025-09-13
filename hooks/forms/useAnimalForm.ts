"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { useToast } from "@/hooks/shared/use-toast";
import type { AnimalFormData } from "@/lib/schemas/animal";
import { AnimalDataTransformer } from "@/lib/services/animalDataTransformer";
import { AnimalFormValidator } from "@/lib/services/animalFormValidator";
import type { Animal } from "@/lib/utils/types";
import { trpc } from "@/server/trpc/client";
import { useAnimalFormState } from "./useAnimalFormState";

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
  vetEmail: z.email().optional().or(z.literal("")),
  clinicName: z.string().optional(),
  notes: z.string().optional(),
  allergies: z.array(z.string()),
  conditions: z.array(z.string()),
  photoUrl: z.url().optional().or(z.literal("")),
});

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
interface UseAnimalFormReturn extends AnimalFormActions {
  // Core form state
  isOpen: boolean;
  editingAnimal: Animal | null;
  isLoading: boolean;
  isDirty: boolean;
  error: string | null;

  // Form management
  form: ReturnType<typeof useForm<AnimalFormData>>;

  // Additional actions
  clearErrorAction: () => void;

  // tRPC mutations (for backward compatibility)
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

  const { selectedHousehold } = useApp();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Use the extracted state management service
  const {
    isOpen,
    editingAnimal,
    isDirty,
    error,
    setError,
    setDirty: setIsDirty,
    clearError,
    openForm: openFormState,
    closeForm: closeFormState,
  } = useAnimalFormState({
    onOpen,
    onClose,
  });

  // Initialize form with validation
  const form = useForm<AnimalFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: AnimalDataTransformer.createDefaultValues(),
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
   * Fire instrumentation events using the data transformer
   */
  const fireInstrumentationEvent = useCallback(
    (data: AnimalFormData, isNew: boolean) => {
      const eventData = AnimalDataTransformer.toInstrumentationData(
        data,
        isNew,
        editingAnimal?.id,
      );

      window.dispatchEvent(
        new CustomEvent(eventData.eventType, {
          detail: eventData.detail,
        }),
      );
    },
    [editingAnimal?.id],
  );

  /**
   * Open the form for creating or editing an animal
   */
  const openForm = useCallback(
    (animal?: Animal | null) => {
      if (animal) {
        const formData = AnimalDataTransformer.fromAnimalRecord(animal);
        form.reset(formData);
      } else {
        form.reset(AnimalDataTransformer.createDefaultValues());
      }

      openFormState(animal);
    },
    [form, openFormState],
  );

  /**
   * Close the form
   */
  const closeForm = useCallback(() => {
    form.reset();
    closeFormState();
  }, [form, closeFormState]);

  /**
   * Reset the form to default values
   */
  const resetForm = useCallback(() => {
    form.reset(AnimalDataTransformer.createDefaultValues());
    setIsDirty(false);
  }, [form, setIsDirty]);

  /**
   * Save the form data
   */
  const saveForm = useCallback(
    async (data: AnimalFormData) => {
      // Validate form data using the validation service
      const validationContext = {
        household: selectedHousehold,
        isEditing: !!editingAnimal,
      };

      if (!AnimalFormValidator.canSubmit(data, validationContext)) {
        const errorMessage = AnimalFormValidator.getErrorMessage(
          data,
          validationContext,
        );
        if (errorMessage) {
          setError(errorMessage);
          toast({
            title: "Validation Error",
            description: errorMessage,
            variant: "destructive",
          });
        }
        return;
      }

      // Clear any previous errors on successful validation
      clearError();

      try {
        const isNew = !editingAnimal;
        fireInstrumentationEvent(data, isNew);

        if (editingAnimal) {
          // Update existing animal
          const updatePayload = AnimalDataTransformer.toUpdatePayload(
            data,
            editingAnimal.id,
          );
          await updateMutation.mutateAsync(updatePayload);
        } else {
          // Create new animal
          const createPayload = AnimalDataTransformer.toCreatePayload(data);
          await createMutation.mutateAsync(createPayload);
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
      selectedHousehold,
      editingAnimal,
      setError,
      clearError,
      fireInstrumentationEvent,
      updateMutation,
      createMutation,
      autoClose,
      closeForm,
      setIsDirty,
      toast,
    ],
  );

  // Watch form changes to set dirty state
  const _watchedValues = form.watch();
  const formState = form.formState;

  // Set dirty state when form data changes
  if (formState.isDirty && !isDirty) {
    setIsDirty(true);
  }

  return {
    // Core form state
    isOpen,
    editingAnimal,
    isLoading: createMutation.isPending || updateMutation.isPending,
    isDirty: isDirty || formState.isDirty,
    error,

    // Form management
    form,

    // Core actions
    openForm,
    closeForm,
    saveForm,

    // Additional actions
    resetForm,
    setDirty: setIsDirty,
    clearErrorAction: clearError,

    // Mutations (for backward compatibility)
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
    form.reset(AnimalDataTransformer.fromAnimalRecord(animal));
  }

  return {
    form,
    saveAnimal: saveForm,
    isLoading,
    createMutation,
    updateMutation,
  };
}

/**
 * Animal calculations hook for derived values
 *
 * Provides calculated values from form data including completeness percentage,
 * age calculations, and record status indicators. Uses the AnimalDataTransformer
 * service for consistent calculations.
 *
 * @example
 * ```tsx
 * function AnimalSummary() {
 *   const form = useForm<AnimalFormData>();
 *   const { completenessPercentage, ageInYears, isCompleteRecord } =
 *     useAnimalCalculations(form);
 *
 *   return (
 *     <div>
 *       <p>Completion: {completenessPercentage}%</p>
 *       <p>Age: {ageInYears} years</p>
 *       {!isCompleteRecord && <p>⚠️ Incomplete record</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAnimalCalculations(
  form: ReturnType<typeof useForm<AnimalFormData>>,
) {
  const formData = form.watch();

  // Use data transformer service for consistent calculations
  const completenessPercentage =
    AnimalDataTransformer.calculateCompleteness(formData);
  const isCompleteRecord = AnimalDataTransformer.isCompleteRecord(formData);
  const hasRequiredFields = AnimalDataTransformer.hasRequiredFields(formData);

  // Calculate age in years if DOB is available
  const ageInYears = formData.dob
    ? Math.floor(
        (Date.now() - formData.dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      )
    : null;

  // Calculate age status
  const isAgeKnown = !!formData.dob;
  const isPuppy = ageInYears !== null && ageInYears < 1;
  const isSenior = ageInYears !== null && ageInYears > 7; // Varies by species/breed

  // Health information completeness
  const hasHealthInfo = !!(
    (formData.allergies && formData.allergies.length > 0) ||
    (formData.conditions && formData.conditions.length > 0) ||
    formData.weightKg ||
    formData.microchipId
  );

  // Vet contact completeness
  const hasVetInfo = !!(
    formData.vetName ||
    formData.vetPhone ||
    formData.vetEmail ||
    formData.clinicName
  );

  return {
    // Core calculations
    completenessPercentage,
    isCompleteRecord,
    hasRequiredFields,

    // Age calculations
    ageInYears,
    isAgeKnown,
    isPuppy,
    isSenior,

    // Information categories
    hasHealthInfo,
    hasVetInfo,

    // Summary indicators
    recordStatus:
      completenessPercentage >= 80
        ? "complete"
        : completenessPercentage >= 50
          ? "partial"
          : "minimal",
  };
}

// Export types for backward compatibility
export type { UseAnimalFormOptions, UseAnimalFormReturn };
