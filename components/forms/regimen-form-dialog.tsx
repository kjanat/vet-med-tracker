"use client";

import React, { useState } from "react";
import { RegimenForm } from "@/components/regimens/regimen-form";
import type { Regimen } from "@/components/regimens/regimen-list";

/**
 * Global state for regimen form dialog
 */
const globalRegimenFormState = {
  editingRegimen: null as Regimen | null,
  isOpen: false,
  listeners: new Set<() => void>(),
};

/**
 * Regimen form dialog component that manages its own state
 *
 * This component provides a complete regimen form dialog with state management,
 * validation, and saving functionality.
 */
export function RegimenFormDialog() {
  const [, forceUpdate] = useState({});

  // Subscribe to global state changes
  React.useEffect(() => {
    const listener = () => forceUpdate({});
    globalRegimenFormState.listeners.add(listener);
    return () => {
      globalRegimenFormState.listeners.delete(listener);
    };
  }, []);

  const handleOpenChange = (open: boolean) => {
    globalRegimenFormState.isOpen = open;
    if (!open) {
      globalRegimenFormState.editingRegimen = null;
    }
    globalRegimenFormState.listeners.forEach((listener) => {
      listener();
    });
  };

  const handleSave = async (data: Partial<Regimen>) => {
    // The actual save logic will be handled by the RegimenForm component
    // This is just a placeholder that follows the pattern
    try {
      // The RegimenForm component handles the actual mutation
      console.log("Saving regimen:", data);
      handleOpenChange(false);
    } catch (error) {
      console.error("Failed to save regimen:", error);
    }
  };

  return (
    <RegimenForm
      onOpenChange={handleOpenChange}
      onSave={handleSave}
      open={globalRegimenFormState.isOpen}
      regimen={globalRegimenFormState.editingRegimen}
    />
  );
}

/**
 * Hook that provides regimen form controls and state
 *
 * This hook can be used by components that need to trigger the regimen form
 * or check its state.
 */
export function useRegimenFormDialog() {
  const [, forceUpdate] = useState({});

  // Subscribe to global state changes
  React.useEffect(() => {
    const listener = () => forceUpdate({});
    globalRegimenFormState.listeners.add(listener);
    return () => {
      globalRegimenFormState.listeners.delete(listener);
    };
  }, []);

  const openRegimenForm = (regimen?: Regimen | null) => {
    globalRegimenFormState.editingRegimen = regimen || null;
    globalRegimenFormState.isOpen = true;
    globalRegimenFormState.listeners.forEach((listener) => {
      listener();
    });
  };

  return {
    isFormLoading: false, // Could be connected to mutation state if needed
    isFormOpen: globalRegimenFormState.isOpen,
    openRegimenForm,
  };
}
