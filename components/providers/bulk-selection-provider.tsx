"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

interface BulkSelectionContextType {
  selectedIds: Set<string>;
  toggle: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  isSelected: (id: string) => boolean;
  selectionCount: number;
  availableIds: string[];
  setAvailableIds: (ids: string[]) => void;
  isAllSelected: boolean;
  isPartiallySelected: boolean;
}

const BulkSelectionContext = createContext<BulkSelectionContextType | null>(
  null,
);

export function useBulkSelection() {
  const context = useContext(BulkSelectionContext);
  if (!context) {
    throw new Error(
      "useBulkSelection must be used within BulkSelectionProvider",
    );
  }
  return context;
}

interface BulkSelectionProviderProps {
  children: ReactNode;
}

export function BulkSelectionProvider({
  children,
}: BulkSelectionProviderProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [availableIds, setAvailableIds] = useState<string[]>([]);

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(availableIds));
  }, [availableIds]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (id: string) => {
      return selectedIds.has(id);
    },
    [selectedIds],
  );

  const selectionCount = selectedIds.size;

  const isAllSelected = useMemo(() => {
    return availableIds.length > 0 && selectionCount === availableIds.length;
  }, [availableIds.length, selectionCount]);

  const isPartiallySelected = useMemo(() => {
    return selectionCount > 0 && !isAllSelected;
  }, [selectionCount, isAllSelected]);

  const value = useMemo(
    () => ({
      selectedIds,
      toggle,
      selectAll,
      clearSelection,
      isSelected,
      selectionCount,
      availableIds,
      setAvailableIds,
      isAllSelected,
      isPartiallySelected,
    }),
    [
      selectedIds,
      toggle,
      selectAll,
      clearSelection,
      isSelected,
      selectionCount,
      availableIds,
      isAllSelected,
      isPartiallySelected,
    ],
  );

  return (
    <BulkSelectionContext.Provider value={value}>
      {children}
    </BulkSelectionContext.Provider>
  );
}
