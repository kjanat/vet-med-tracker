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
  allergies: z.array(z.string()),
  breed: z.string().optional(),
  clinicName: z.string().optional(),
  color: z.string().optional(),
  conditions: z.array(z.string()),
  dob: z.date().optional(),
  microchipId: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  neutered: z.boolean(),
  notes: z.string().optional(),
  photoUrl: z.url().optional().or(z.literal("")),
  sex: z.enum(["Male", "Female"]).optional(),
  species: z.string().min(1, "Species is required"),
  timezone: z.string().min(1, "Timezone is required"),
  vetEmail: z.email().optional().or(z.literal("")),
  vetName: z.string().optional(),
  vetPhone: z.string().optional(),
  weightKg: z.number().optional(),
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
  createMutation: ReturnType<typeof trpc.animals.create.useMutation>;
  updateMutation: ReturnType<typeof trpc.animals.update.useMutation>;
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
    onClose,
    onOpen,
  });

  // Initialize form with validation
  const form = useForm<AnimalFormData>({
    defaultValues: AnimalDataTransformer.createDefaultValues(),
    mode: "onBlur",
    resolver: zodResolver(formSchema),
  });

  // tRPC mutations
  const createMutation = trpc.animals.create.useMutation({
    onError: (error): void => {
      console.error("Error creating animal:", error);
      toast({
        description: "Failed to create animal. Please try again.",
        title: "Error",
        variant: "destructive",
      });
      onError?.(error, editingAnimal);
    },
    onSuccess: (data): void => {
      // Invalidate queries to refresh data
      utils.animals.list.invalidate();

      if (showSuccessToast && data) {
        const message: string =
          successMessage?.(data as unknown as Animal, true) ||
          `Created ${data.name}`;
        toast({ description: message, title: "Success" });
      }

      if (data) {
        onSave?.(data as unknown as Animal, true);
      }
    },
  });

  const updateMutation = trpc.animals.update.useMutation({
    onError: (error): void => {
      console.error("Error updating animal:", error);
      toast({
        description: "Failed to update animal. Please try again.",
        title: "Error",
        variant: "destructive",
      });
      onError?.(error, editingAnimal);
    },
    onSuccess: (data): void => {
      // Invalidate queries to refresh data
      utils.animals.list.invalidate();

      if (showSuccessToast && data) {
        const message: string =
          successMessage?.(data as unknown as Animal, false) ||
          `Updated ${data.name}`;
        toast({ description: message, title: "Success" });
      }

      if (data) {
        onSave?.(data as unknown as Animal, false);
      }
    },
  });

  /**
   * Fire instrumentation events using the data transformer
   */
  const fireInstrumentationEvent = useCallback(
    (data: AnimalFormData, isNew: boolean): void => {
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
    (animal?: Animal | null): void => {
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
  const closeForm: () => void = useCallback((): void => {
    form.reset();
    closeFormState();
  }, [form, closeFormState]);

  /**
   * Reset the form to default values
   */
  const resetForm: () => void = useCallback((): void => {
    form.reset(AnimalDataTransformer.createDefaultValues());
    setIsDirty(false);
  }, [form, setIsDirty]);

  /**
   * Save the form data
   */
  const saveForm = useCallback(
    async (data: AnimalFormData): Promise<void> => {
      // Validate form data using the validation service
      const validationContext = {
        household: selectedHousehold,
        isEditing: Boolean(editingAnimal),
      };

      if (!AnimalFormValidator.canSubmit(data, validationContext)) {
        const errorMessage: string | null = AnimalFormValidator.getErrorMessage(
          data,
          validationContext,
        );
        if (errorMessage) {
          setError(errorMessage);
          toast({
            description: errorMessage,
            title: "Validation Error",
            variant: "destructive",
          });
        }
        return;
      }

      // Clear any previous errors on successful validation
      clearError();

      try {
        const isNew: boolean = !editingAnimal;
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
  const formState = form.formState;

  // Set dirty state when form data changes
  if (formState.isDirty && !isDirty) {
    setIsDirty(true);
  }

  return {
    clearErrorAction: clearError,
    closeForm,

    // Mutations (for backward compatibility)
    createMutation,
    editingAnimal,
    error,

    // Form management
    form,
    isDirty: isDirty || formState.isDirty,
    isLoading: createMutation.isPending || updateMutation.isPending,
    // Core form state
    isOpen,

    // Core actions
    openForm,

    // Additional actions
    resetForm,
    saveForm,
    setDirty: setIsDirty,
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
    createMutation,
    form,
    isLoading,
    saveAnimal: saveForm,
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
): {
  ageInYears: number | null;
  completenessPercentage: number;
  hasHealthInfo: boolean;
  hasRequiredFields: boolean;
  hasVetInfo: boolean;
  isAgeKnown: boolean;
  isCompleteRecord: boolean;
  isPuppy: boolean;
  isSenior: boolean;
  recordStatus: "complete" | "partial" | "minimal";
} {
  const formData = form.watch();

  // Use data transformer service for consistent calculations
  const completenessPercentage: number =
    AnimalDataTransformer.calculateCompleteness(formData);
  const isCompleteRecord: boolean =
    AnimalDataTransformer.isCompleteRecord(formData);
  const hasRequiredFields: boolean =
    AnimalDataTransformer.hasRequiredFields(formData);

  // Calculate age in years if DOB is available
  const ageInYears: number | null = formData.dob
    ? Math.floor(
        (Date.now() - formData.dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
      )
    : null;

  // Calculate age status
  const isAgeKnown: boolean = Boolean(formData.dob);
  const isPuppy: boolean = ageInYears !== null && ageInYears < 1;
  const isSenior: boolean = ageInYears !== null && ageInYears > 7; // Varies by species/breed

  // Health information completeness
  const hasHealthInfo: boolean = Boolean(
    (formData.allergies && formData.allergies.length > 0) ||
      (formData.conditions && formData.conditions.length > 0) ||
      formData.weightKg ||
      formData.microchipId,
  );

  // Vet contact completeness
  const hasVetInfo: boolean = Boolean(
    formData.vetName ||
      formData.vetPhone ||
      formData.vetEmail ||
      formData.clinicName,
  );

  return {
    // Age calculations
    ageInYears,
    // Core calculations
    completenessPercentage,

    // Information categories
    hasHealthInfo,
    hasRequiredFields,
    hasVetInfo,
    isAgeKnown,
    isCompleteRecord,
    isPuppy,
    isSenior,

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
