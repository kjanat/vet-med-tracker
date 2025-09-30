"use client";

import * as React from "react";

export interface BulkSelectionContextValue {
  selectedIds: Set<string>;
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectedCount: number;
  selectionCount: number; // alias for selectedCount
}

const BulkSelectionContext = React.createContext<
  BulkSelectionContextValue | undefined
>(undefined);

export function BulkSelectionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  const selectItem = React.useCallback((id: string) => {
    setSelectedIds((prev) => new Set(prev).add(id));
  }, []);

  const deselectItem = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const selectAll = React.useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const clearSelection = React.useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = React.useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds],
  );

  const value = React.useMemo(
    () => ({
      clearSelection,
      deselectItem,
      isSelected,
      selectAll,
      selectedCount: selectedIds.size,
      selectedIds,
      selectItem,
      selectionCount: selectedIds.size, // alias
    }),
    [
      selectedIds,
      selectItem,
      deselectItem,
      selectAll,
      clearSelection,
      isSelected,
    ],
  );

  return (
    <BulkSelectionContext.Provider value={value}>
      {children}
    </BulkSelectionContext.Provider>
  );
}

export function useBulkSelection() {
  const context = React.useContext(BulkSelectionContext);
  if (!context) {
    throw new Error(
      "useBulkSelection must be used within BulkSelectionProvider",
    );
  }
  return context;
}
