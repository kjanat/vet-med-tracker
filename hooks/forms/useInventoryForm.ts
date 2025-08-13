"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState } from "react";
import { type UseFormReturn, useForm } from "react-hook-form";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { useToast } from "@/hooks/shared/use-toast";
import {
  type InventoryFormData,
  inventoryFormSchema,
} from "@/lib/schemas/inventory";
import { trpc } from "@/server/trpc/client";

/**
 * Inventory form state interface
 */
interface InventoryFormState {
  isOpen: boolean;
  isLoading: boolean;
  isDirty: boolean;
  error: string | null;
}

/**
 * Inventory form actions interface
 */
interface InventoryFormActions {
  openForm: () => void;
  closeForm: () => void;
  saveForm: (data: InventoryFormData) => Promise<void>;
  resetForm: () => void;
  setDirty: (dirty: boolean) => void;
  clearError: () => void;
}

/**
 * Inventory form hook return type
 */
interface UseInventoryFormReturn
  extends InventoryFormState,
    InventoryFormActions {
  form: UseFormReturn<InventoryFormData>;
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
 * Storage type options with descriptions
 */
export const STORAGE_OPTIONS = [
  { value: "ROOM", label: "Room Temperature", description: "Store at 15-25°C" },
  { value: "FRIDGE", label: "Refrigerated", description: "Store at 2-8°C" },
  { value: "FREEZER", label: "Frozen", description: "Store below 0°C" },
  {
    value: "CONTROLLED",
    label: "Controlled",
    description: "Special storage requirements",
  },
] as const;

/**
 * Advanced inventory form management hook with validation, mutations, and calculations
 *
 * This hook provides complete form management for inventory item creation,
 * including validation, tRPC mutations, error handling, and complex calculations
 * for medication inventory management.
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

  const [isOpen, setIsOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { selectedHousehold } = useApp();
  const { toast } = useToast();
  const utils = trpc.useUtils();

  // Calculate default expiry date
  const defaultExpiryDate = new Date();
  defaultExpiryDate.setDate(defaultExpiryDate.getDate() + defaultExpiryDays);

  // Initialize form with validation
  const form = useForm<InventoryFormData>({
    resolver: zodResolver(inventoryFormSchema),
    defaultValues: {
      medicationId: "",
      name: "",
      brand: "",
      route: "",
      form: "",
      strength: "",
      concentration: "",
      quantityUnits: 1,
      unitsRemaining: 1,
      lot: "",
      expiresOn: defaultExpiryDate,
      storage: defaultStorage,
      assignedAnimalId: "",
      barcode: "",
      setInUse: false,
    },
    mode: "onBlur",
  });

  // tRPC mutations
  const createMutation = trpc.inventory.create.useMutation({
    onSuccess: (data) => {
      // Invalidate queries to refresh data
      utils.inventory.list.invalidate();

      if (showSuccessToast && data) {
        const message =
          successMessage?.(form.getValues()) || `Added medication to inventory`;
        toast({ title: "Success", description: message });
      }

      if (data) {
        onSave?.(data.id, form.getValues());
      }
    },
    onError: (error) => {
      console.error("Error creating inventory item:", error);
      const errorMessage = "Failed to add inventory item. Please try again.";
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      onError?.(error, form.getValues());
    },
  });

  const setInUseMutation = trpc.inventory.setInUse.useMutation({
    onSuccess: () => {
      // Invalidate queries to refresh data
      utils.inventory.list.invalidate();
    },
    onError: (error) => {
      console.error("Error setting inventory item in use:", error);
      toast({
        title: "Warning",
        description:
          "Item was created but failed to set as in use. You can update this later.",
        variant: "destructive",
      });
    },
  });

  /**
   * Validate form data before submission
   */
  const validateFormData = useCallback(
    (data: InventoryFormData): boolean => {
      setError(null);

      if (!selectedHousehold?.id) {
        const errorMsg = "No household selected";
        setError(errorMsg);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        return false;
      }

      if (!data.medicationId) {
        const errorMsg = "Please select a medication";
        setError(errorMsg);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        return false;
      }

      if (validateQuantity && data.unitsRemaining > data.quantityUnits) {
        const errorMsg = "Units remaining cannot exceed total quantity";
        setError(errorMsg);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        return false;
      }

      if (data.expiresOn && data.expiresOn < new Date()) {
        const errorMsg = "Expiry date must be in the future";
        setError(errorMsg);
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        });
        return false;
      }

      return true;
    },
    [selectedHousehold, validateQuantity, toast],
  );

  /**
   * Transform form data for API calls
   */
  const transformInventoryData = useCallback(
    (data: InventoryFormData) => {
      if (!selectedHousehold?.id) {
        throw new Error("No household selected");
      }
      return {
        householdId: selectedHousehold.id,
        medicationId: data.medicationId,
        brandOverride: data.brand || undefined,
        lot: data.lot || undefined,
        expiresOn: data.expiresOn,
        storage: data.storage,
        unitsTotal: data.quantityUnits,
        unitsRemaining: data.unitsRemaining,
        unitType: "units", // TODO: Make this configurable
        notes: undefined, // TODO: Add notes field to form
        assignedAnimalId: data.assignedAnimalId || undefined,
      };
    },
    [selectedHousehold],
  );

  /**
   * Fire instrumentation events
   */
  const fireInstrumentationEvent = useCallback((data: InventoryFormData) => {
    window.dispatchEvent(
      new CustomEvent("inventory_item_create", {
        detail: {
          medicationId: data.medicationId,
          medicationName: data.name,
          quantity: data.quantityUnits,
          storage: data.storage,
          assignedAnimalId: data.assignedAnimalId,
        },
      }),
    );
  }, []);

  /**
   * Open the form
   */
  const openForm = useCallback(() => {
    setIsOpen(true);
    setIsDirty(false);
    setError(null);

    // Reset form with fresh default values
    const newExpiryDate = new Date();
    newExpiryDate.setDate(newExpiryDate.getDate() + defaultExpiryDays);

    form.reset({
      medicationId: "",
      name: "",
      brand: "",
      route: "",
      form: "",
      strength: "",
      concentration: "",
      quantityUnits: 1,
      unitsRemaining: 1,
      lot: "",
      expiresOn: newExpiryDate,
      storage: defaultStorage,
      assignedAnimalId: "",
      barcode: "",
      setInUse: false,
    });

    onOpen?.();
  }, [form, defaultStorage, defaultExpiryDays, onOpen]);

  /**
   * Close the form
   */
  const closeForm = useCallback(() => {
    setIsOpen(false);
    setIsDirty(false);
    setError(null);
    form.reset();
    onClose?.();
  }, [form, onClose]);

  /**
   * Reset the form to default values
   */
  const resetForm = useCallback(() => {
    const newExpiryDate = new Date();
    newExpiryDate.setDate(newExpiryDate.getDate() + defaultExpiryDays);

    form.reset({
      medicationId: "",
      name: "",
      brand: "",
      route: "",
      form: "",
      strength: "",
      concentration: "",
      quantityUnits: 1,
      unitsRemaining: 1,
      lot: "",
      expiresOn: newExpiryDate,
      storage: defaultStorage,
      assignedAnimalId: "",
      barcode: "",
      setInUse: false,
    });
    setIsDirty(false);
    setError(null);
  }, [form, defaultStorage, defaultExpiryDays]);

  /**
   * Clear any existing error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Save the form data
   */
  const saveForm = useCallback(
    async (data: InventoryFormData) => {
      if (!validateFormData(data)) {
        return;
      }

      try {
        fireInstrumentationEvent(data);

        const payload = transformInventoryData(data);
        const result = await createMutation.mutateAsync(payload);

        // If setInUse is true and an animal is assigned, call the setInUse mutation
        if (
          data.setInUse &&
          data.assignedAnimalId &&
          result?.id &&
          selectedHousehold?.id
        ) {
          await setInUseMutation.mutateAsync({
            id: result.id,
            householdId: selectedHousehold.id,
            inUse: true,
          });
        }

        if (autoClose) {
          closeForm();
        } else {
          setIsDirty(false);
          setError(null);
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
    ],
  );

  /**
   * Set dirty state
   */
  const setDirtyState = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
  }, []);

  // Watch form changes to set dirty state
  const formState = form.formState;
  if (formState.isDirty && !isDirty) {
    setDirtyState(true);
  }

  /**
   * Sync units remaining with total units when total changes
   */
  const quantityUnits = form.watch("quantityUnits");
  const unitsRemaining = form.watch("unitsRemaining");

  // Auto-sync remaining units when quantity changes
  if (quantityUnits && unitsRemaining > quantityUnits) {
    form.setValue("unitsRemaining", quantityUnits);
  }

  return {
    // State
    isOpen,
    isLoading: createMutation.isPending || setInUseMutation.isPending,
    isDirty: isDirty || formState.isDirty,
    error,

    // Form
    form,

    // Actions
    openForm,
    closeForm,
    saveForm,
    resetForm,
    setDirty: setDirtyState,
    clearError,

    // Mutations
    createMutation,
    setInUseMutation,
  };
}

/**
 * Simplified inventory form hook for basic use cases
 *
 * @example
 * ```tsx
 * function SimpleInventoryForm() {
 *   const { form, saveItem, isLoading } = useSimpleInventoryForm();
 *
 *   return (
 *     <form onSubmit={form.handleSubmit(saveItem)}>
 *       // Form fields go here
 *     </form>
 *   );
 * }
 * ```
 */
export function useSimpleInventoryForm() {
  const { form, saveForm, isLoading, createMutation, setInUseMutation } =
    useInventoryForm({
      autoClose: false,
      showSuccessToast: true,
    });

  return {
    form,
    saveItem: saveForm,
    isLoading,
    createMutation,
    setInUseMutation,
  };
}

/**
 * Hook for inventory form calculations and derived values
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
  const quantityUnits = form.watch("quantityUnits");
  const unitsRemaining = form.watch("unitsRemaining");
  const expiresOn = form.watch("expiresOn");
  const storage = form.watch("storage");

  // Calculate percentage remaining
  const percentRemaining =
    quantityUnits > 0 ? Math.round((unitsRemaining / quantityUnits) * 100) : 0;

  // Check if expiring soon (within 30 days)
  const isExpiringSoon = expiresOn
    ? expiresOn.getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000
    : false;

  // Get storage description
  const storageOption = STORAGE_OPTIONS.find((opt) => opt.value === storage);
  const storageDescription = storageOption?.description || storage;

  // Calculate days until expiry
  const daysUntilExpiry = expiresOn
    ? Math.ceil((expiresOn.getTime() - Date.now()) / (24 * 60 * 60 * 1000))
    : null;

  // Calculate if quantity is low (less than 20%)
  const isQuantityLow = percentRemaining < 20;

  return {
    percentRemaining,
    isExpiringSoon,
    storageDescription,
    daysUntilExpiry,
    isQuantityLow,
  };
}
