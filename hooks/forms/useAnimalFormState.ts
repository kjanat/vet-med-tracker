"use client";

import { useCallback, useState } from "react";
import type { Animal } from "@/lib/utils/types";

/**
 * Form state interface for animal form UI management
 */
interface FormState {
  isOpen: boolean;
  editingAnimal: Animal | null;
  isDirty: boolean;
  error: string | null;
}

/**
 * Form actions interface for animal form UI management
 */
interface FormActions {
  openForm: (animal?: Animal | null) => void;
  closeForm: () => void;
  setError: (error: string | null) => void;
  setDirty: (dirty: boolean) => void;
  clearError: () => void;
}

/**
 * Combined return interface for form state management
 */
interface UseAnimalFormStateReturn extends FormState, FormActions {}

/**
 * Options for form state management
 */
interface UseAnimalFormStateOptions {
  /** Called when form is opened */
  onOpen?: (animal: Animal | null) => void;
  /** Called when form is closed */
  onClose?: () => void;
  /** Initial state values */
  initialState?: Partial<FormState>;
}

/**
 * Focused hook for managing animal form UI state
 *
 * This hook handles only UI state management for animal forms:
 * - Form visibility (isOpen)
 * - Editing context (editingAnimal)
 * - Dirty state tracking (isDirty)
 * - Error state management
 *
 * @example
 * ```tsx
 * function AnimalFormDialog() {
 *   const {
 *     isOpen,
 *     editingAnimal,
 *     isDirty,
 *     openForm,
 *     closeForm,
 *     setIsDirty,
 *   } = useAnimalFormState({
 *     onOpen: (animal) => console.log('Opening form for:', animal),
 *     onClose: () => console.log('Form closed'),
 *   });
 *
 *   return (
 *     <Dialog open={isOpen} onOpenChange={closeForm}>
 *       // Dialog content
 *     </Dialog>
 *   );
 * }
 * ```
 */
export function useAnimalFormState(
  options: UseAnimalFormStateOptions = {},
): UseAnimalFormStateReturn {
  const { initialState, onOpen, onClose } = options;

  // State management
  const [isOpen, setIsOpen] = useState(initialState?.isOpen ?? false);
  const [editingAnimal, setEditingAnimal] = useState<Animal | null>(
    initialState?.editingAnimal ?? null,
  );
  const [isDirty, setIsDirty] = useState(initialState?.isDirty ?? false);
  const [error, setError] = useState<string | null>(
    initialState?.error ?? null,
  );

  /**
   * Open the form for creating or editing an animal
   */
  const openForm = useCallback(
    (animal?: Animal | null) => {
      setEditingAnimal(animal || null);
      setIsOpen(true);
      setIsDirty(false);
      setError(null);
      onOpen?.(animal || null);
    },
    [onOpen],
  );

  /**
   * Close the form and reset state
   */
  const closeForm = useCallback(() => {
    setIsOpen(false);
    setEditingAnimal(null);
    setIsDirty(false);
    setError(null);
    onClose?.();
  }, [onClose]);

  /**
   * Clear the current error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isOpen,
    editingAnimal,
    isDirty,
    error,

    // Actions
    openForm,
    closeForm,
    setError,
    setDirty: setIsDirty,
    clearError,
  };
}
