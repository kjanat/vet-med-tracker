"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useMemo } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { inventoryFormSchema } from "@/lib/schemas/inventory";
import { InventoryDataTransformer } from "@/lib/services/inventoryDataTransformer";
import { InventoryFormValidator } from "@/lib/services/inventoryFormValidator";
import { trpc } from "@/server/trpc/client";
import { useInventoryFormState } from "./useInventoryFormState";

type InventoryFormData = z.infer<typeof inventoryFormSchema>;

// Export the type for use in other modules
export type { InventoryFormData };

/**
 * Simplified inventory form hook return type
 * Composes focused services while maintaining backward compatibility
 */
interface UseInventoryFormReturn {
  // Core form state (3 properties)
  isOpen: boolean;
  isLoading: boolean;
  error: string | null;

  // Form management (4 properties)
  form: UseFormReturn<InventoryFormData>;
  isDirty: boolean;

  // Core actions (3 properties)
  openForm: () => void;
  closeForm: () => void;
  saveForm: (data: InventoryFormData) => Promise<void>;

  // Additional actions
  resetForm: () => void;
  setDirty: (dirty: boolean) => void;
  clearErrorAction: () => void;

  // Mutations (for backward compatibility)
  createMutation: ReturnType<typeof trpc.inventory.create.useMutation>;
  setInUseMutation: ReturnType<typeof trpc.inventory.setInUse.useMutation>;
}

/**
 * Hook options interface
 */
interface UseInventoryFormOptions {
  /** Called when form is successfully saved */
  onSave?: (itemId: string, data: InventoryFormData) => void;
  /** Called when form is opened */
  onOpen?: () => void;
  /** Called when form is closed */
  onClose?: () => void;
  /** Called when form encounters an error */
  onError?: (error: unknown, data?: InventoryFormData) => void;
  /** Whether to automatically close form on successful save */
  autoClose?: boolean;
  /** Whether to show success toast on save */
  showSuccessToast?: boolean;
  /** Custom success message */
  successMessage?: (data: InventoryFormData) => string;
  /** Default storage type */
  defaultStorage?: "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED";
  /** Default expiry date (days from now) */
  defaultExpiryDays?: number;
  /** Whether to enable quantity validation */
  validateQuantity?: boolean;
}

/**
 * Re-export storage options from data transformer for backward compatibility
 */
export const STORAGE_OPTIONS = InventoryDataTransformer.getStorageOptions();

/**
 * Refactored inventory form management hook using composed services
 *
 * This hook now follows Single Responsibility Principle by composing
 * focused services: form state, validation, and data transformation.
 * Maintains the same API for backward compatibility while dramatically
 * improving maintainability and testability.
 *
 * @example
 * ```tsx
 * function InventoryManagement() {
 *   const {
 *     isOpen,
 *     form,
 *     openForm,
 *     closeForm,
 *     saveForm,
 *     isLoading,
 *   } = useInventoryForm({
 *     onSave: (itemId, data) => {
 *       console.log('Created inventory item:', itemId, data);
 *     },
 *     showSuccessToast: true,
 *     defaultStorage: "ROOM",
 *     defaultExpiryDays: 730,
 *   });
 *
 *   return (
 *     <div>
 *       <Button onClick={openForm}>Add Inventory Item</Button>
 *       <InventoryFormDialog
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
export function useInventoryForm(
  options: UseInventoryFormOptions = {},
): UseInventoryFormReturn {
  const {
    onSave,
    onOpen,
    onClose,
    onError,
    autoClose = true,
    showSuccessToast = true,
    successMessage,
    defaultStorage = "ROOM",
    defaultExpiryDays = 730,
    validateQuantity = true,
  } = options;

  const { selectedHousehold } = useApp();
  const utils = trpc.useUtils();

  // Use focused form state management hook
  const formState = useInventoryFormState({
    onClose,
    onOpen,
  });

  // Generate default values using data transformer
  const defaultValues = useMemo(
    () =>
      InventoryDataTransformer.setDefaultValues({
        expiryDays: defaultExpiryDays,
        storage: defaultStorage,
      }),
    [defaultStorage, defaultExpiryDays],
  );

  // Initialize form with validation
  const form = useForm({
    defaultValues,
    mode: "onBlur",
    resolver: zodResolver(inventoryFormSchema),
  });

  // tRPC mutations with focused error handling
  const createMutation = trpc.inventory.create.useMutation({
    onError: (error) => {
      console.error("Error creating inventory item:", error);
      const errorMessage = "Failed to add inventory item. Please try again.";
      formState.setError(errorMessage);
      toast.error(errorMessage);
      onError?.(error, form.getValues());
    },
    onSuccess: async (data) => {
      // Invalidate queries to refresh data
      await utils.inventory.list.invalidate();

      if (showSuccessToast && data) {
        const message =
          successMessage?.(form.getValues()) || `Added medication to inventory`;
        toast.success(message);
      }

      if (data) {
        onSave?.(data.id, form.getValues());
      }
    },
  });

  const setInUseMutation = trpc.inventory.setInUse.useMutation({
    onError: (error) => {
      console.error("Error setting inventory item in use:", error);
      toast.warning(
        "Item was created but failed to set as in use. You can update this later.",
      );
    },
    onSuccess: async () => {
      // Invalidate queries to refresh data
      await utils.inventory.list.invalidate();
    },
  });

  // Business logic and form management
  const validateFormData = useCallback(
    (data: InventoryFormData): boolean => {
      const validationResult = InventoryFormValidator.validate(data, {
        allowPastExpiry: false,
        householdId: selectedHousehold?.id,
        validateQuantity,
      });

      if (!validationResult.isValid) {
        const errorMessage =
          InventoryFormValidator.getDisplayMessage(validationResult);
        if (errorMessage) {
          formState.setError(errorMessage);
          toast.error(errorMessage);
        }
        return false;
      }

      formState.clearError();
      return true;
    },
    [selectedHousehold, validateQuantity, formState],
  );

  const transformInventoryData = useCallback(
    (data: InventoryFormData) => {
      if (!selectedHousehold) {
        throw new Error("No household selected");
      }
      return InventoryDataTransformer.toApiPayload(data, selectedHousehold.id);
    },
    [selectedHousehold],
  );

  const fireInstrumentationEvent = useCallback((data: InventoryFormData) => {
    const instrumentationData =
      InventoryDataTransformer.createInstrumentationData(data);
    window.dispatchEvent(
      new CustomEvent("inventory_item_create", {
        detail: instrumentationData,
      }),
    );
  }, []);

  // Enhanced form lifecycle management
  const openForm = useCallback(() => {
    formState.openForm();

    // Reset form with fresh default values
    const freshDefaults = InventoryDataTransformer.createFreshDefaults({
      expiryDays: defaultExpiryDays,
      storage: defaultStorage,
    });

    form.reset(freshDefaults);
  }, [form, defaultStorage, defaultExpiryDays, formState]);

  const closeForm = useCallback(() => {
    formState.closeForm();
    form.reset();
  }, [form, formState]);

  const resetForm = useCallback(() => {
    const freshDefaults = InventoryDataTransformer.createFreshDefaults({
      expiryDays: defaultExpiryDays,
      storage: defaultStorage,
    });

    form.reset(freshDefaults);
    formState.setDirty(false);
    formState.clearError();
  }, [form, defaultStorage, defaultExpiryDays, formState]);

  const clearErrorAction = useCallback(() => {
    formState.clearError();
  }, [formState]);

  // Streamlined save function using composed services
  const saveForm = useCallback(
    async (data: InventoryFormData) => {
      if (!validateFormData(data)) {
        return;
      }

      try {
        fireInstrumentationEvent(data);

        const payload = transformInventoryData(data);
        const result = await createMutation.mutateAsync(payload);

        // Handle setInUse workflow if requested
        if (
          data.setInUse &&
          data.assignedAnimalId &&
          result?.id &&
          selectedHousehold?.id
        ) {
          await setInUseMutation.mutateAsync({
            householdId: selectedHousehold.id,
            inUse: true,
            itemId: result.id,
          });
        }

        if (autoClose) {
          closeForm();
        } else {
          formState.setDirty(false);
          formState.clearError();
        }
      } catch (error) {
        console.error("Error saving inventory item:", error);
        // Error handling is done in the mutation onError callbacks
      }
    },
    [
      validateFormData,
      fireInstrumentationEvent,
      transformInventoryData,
      createMutation,
      setInUseMutation,
      selectedHousehold,
      autoClose,
      closeForm,
      formState,
    ],
  );

  // Watch form changes to set dirty state
  const reactHookFormState = form.formState;
  const setDirtyState = formState.setDirty;

  // Update dirty state when form becomes dirty
  if (reactHookFormState.isDirty && !formState.isDirty) {
    setDirtyState(true);
  }

  // Enhanced quantity synchronization using transformer
  const quantityUnits = form.watch("quantityUnits");
  const unitsRemaining = form.watch("unitsRemaining");

  // Auto-sync remaining units when total changes (non-destructive)
  if (quantityUnits && unitsRemaining > quantityUnits) {
    const syncedData = InventoryDataTransformer.syncRemainingUnits(
      form.getValues(),
      quantityUnits,
    );
    if (syncedData.unitsRemaining !== undefined) {
      form.setValue("unitsRemaining", syncedData.unitsRemaining);
    }
  }

  return {
    clearErrorAction,
    closeForm,

    // Mutations (for backward compatibility)
    createMutation,
    error: formState.error,

    // Form management
    form,
    isDirty: formState.isDirty || reactHookFormState.isDirty,
    isLoading: createMutation.isPending || setInUseMutation.isPending,
    // Core state (composed from focused services)
    isOpen: formState.isOpen,

    // Actions (using composed services)
    openForm,
    resetForm,
    saveForm,
    setDirty: setDirtyState,
    setInUseMutation,
  };
}

/**
 * Refactored hook for inventory form calculations using data transformer
 *
 * This hook now uses the InventoryDataTransformer service for consistent
 * calculations across the application. Provides derived values and metrics
 * from form data.
 *
 * @example
 * ```tsx
 * function InventoryCalculator() {
 *   const form = useForm<InventoryFormData>();
 *   const { percentRemaining, isExpiringSoon, storageDescription } =
 *     useInventoryCalculations(form);
 *
 *   return (
 *     <div>
 *       <p>Remaining: {percentRemaining}%</p>
 *       <p>Storage: {storageDescription}</p>
 *       {isExpiringSoon && <p>⚠️ Expires soon!</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useInventoryCalculations(
  form: UseFormReturn<InventoryFormData>,
) {
  const formData = form.getValues();

  // Use data transformer service for consistent calculations
  return InventoryDataTransformer.calculateDerivedFields(formData);
}

// Export types for backward compatibility
export type { UseInventoryFormOptions, UseInventoryFormReturn };
