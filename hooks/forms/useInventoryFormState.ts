"use client";

import { useCallback, useState } from "react";

/**
 * Form state interface for inventory form UI management
 */
interface FormState {
  isOpen: boolean;
  isDirty: boolean;
  error: string | null;
}

/**
 * Form actions interface for inventory form UI management
 */
interface FormActions {
  openForm: () => void;
  closeForm: () => void;
  setError: (error: string | null) => void;
  setDirty: (dirty: boolean) => void;
  clearError: () => void;
}

/**
 * Combined return interface for form state management
 */
interface UseInventoryFormStateReturn extends FormState, FormActions {}

/**
 * Options for form state management
 */
interface UseInventoryFormStateOptions {
  /** Called when form is opened */
  onOpen?: () => void;
  /** Called when form is closed */
  onClose?: () => void;
  /** Initial state values */
  initialState?: Partial<FormState>;
}

/**
 * Focused hook for inventory form UI state management
 *
 * Handles only the form dialog state, error state, and dirty tracking.
 * Follows Single Responsibility Principle by managing UI state exclusively.
 *
 * @example
 * ```tsx
 * function InventoryDialog() {
 *   const {
 *     isOpen,
 *     isDirty,
 *     error,
 *     openForm,
 *     closeForm,
 *     setError,
 *     setDirty
 *   } = useInventoryFormState({
 *     onOpen: () => console.log('Dialog opened'),
 *     onClose: () => console.log('Dialog closed')
 *   });
 *
 *   return (
 *     <Dialog open={isOpen} onOpenChange={closeForm}>
 *       {error && <Alert variant="destructive">{error}</Alert>}
 *       {isDirty && <Badge>Unsaved changes</Badge>}
 *       <Button onClick={openForm}>Add Item</Button>
 *     </Dialog>
 *   );
 * }
 * ```
 */
export function useInventoryFormState(
  options: UseInventoryFormStateOptions = {},
): UseInventoryFormStateReturn {
  const { onOpen, onClose, initialState } = options;

  // Core form state
  const [isOpen, setIsOpen] = useState(initialState?.isOpen ?? false);
  const [isDirty, setIsDirty] = useState(initialState?.isDirty ?? false);
  const [error, setError] = useState<string | null>(
    initialState?.error ?? null,
  );

  /**
   * Open the form dialog
   */
  const openForm = useCallback(() => {
    setIsOpen(true);
    setIsDirty(false);
    setError(null);
    onOpen?.();
  }, [onOpen]);

  /**
   * Close the form dialog and reset state
   */
  const closeForm = useCallback(() => {
    setIsOpen(false);
    setIsDirty(false);
    setError(null);
    onClose?.();
  }, [onClose]);

  /**
   * Set or clear error state
   */
  const setErrorState = useCallback((errorMessage: string | null) => {
    setError(errorMessage);
  }, []);

  /**
   * Set dirty state flag
   */
  const setDirtyState = useCallback((dirty: boolean) => {
    setIsDirty(dirty);
  }, []);

  /**
   * Clear any existing error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    clearError,
    closeForm,
    error,
    isDirty,
    // State
    isOpen,

    // Actions
    openForm,
    setDirty: setDirtyState,
    setError: setErrorState,
  };
}
