"use client";

import { useEffect, useMemo } from "react";
import {
  BulkSelectionProvider,
  useBulkSelection,
} from "@/components/providers/bulk-selection-provider";
import { BulkSelectionCheckbox } from "@/components/ui/bulk-selection-checkbox";
import { FloatingActionBar } from "@/components/ui/floating-action-bar";
import { SelectAllCheckbox } from "@/components/ui/select-all-checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils/general";

export interface BulkSelectionColumn<T> {
  key: keyof T | "actions";
  title: string;
  render?: (item: T, index: number) => React.ReactNode;
  className?: string;
  sortable?: boolean;
}

interface BulkSelectionTableInternalProps<T> {
  data: T[];
  columns: BulkSelectionColumn<T>[];
  getItemId: (item: T) => string;
  getItemLabel?: (item: T) => string;
  onDelete?: (selectedIds: string[]) => void;
  onExport?: (selectedIds: string[]) => void;
  customActions?: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: (selectedIds: string[]) => void;
    variant?:
      | "default"
      | "destructive"
      | "outline"
      | "secondary"
      | "ghost"
      | "link";
  }>;
  emptyMessage?: string;
  className?: string;
  tableClassName?: string;
  rowClassName?: string | ((item: T, isSelected: boolean) => string);
}

function BulkSelectionTableInternal<T>({
  data,
  columns,
  getItemId,
  getItemLabel,
  onDelete,
  onExport,
  customActions,
  emptyMessage = "No data available",
  className,
  tableClassName,
  rowClassName,
}: BulkSelectionTableInternalProps<T>) {
  const { setAvailableIds, isSelected } = useBulkSelection();

  // Update available IDs when data changes
  const availableIds = useMemo(() => data.map(getItemId), [data, getItemId]);

  useEffect(() => {
    setAvailableIds(availableIds);
  }, [availableIds, setAvailableIds]);

  if (data.length === 0) {
    return (
      <div className={cn("w-full", className)}>
        <div className="flex items-center justify-center py-8">
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <Table className={tableClassName}>
        <TableHeader>
          <TableRow>
            {/* Selection Column */}
            <TableHead className="w-[50px]">
              <SelectAllCheckbox aria-label="Select all rows" />
            </TableHead>

            {/* Data Columns */}
            {columns.map((column) => (
              <TableHead key={String(column.key)} className={column.className}>
                {column.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {data.map((item, index) => {
            const itemId = getItemId(item);
            const selected = isSelected(itemId);
            const itemLabel = getItemLabel?.(item) || `Row ${index + 1}`;

            const computedRowClassName =
              typeof rowClassName === "function"
                ? rowClassName(item, selected)
                : rowClassName;

            return (
              <TableRow
                key={itemId}
                data-state={selected ? "selected" : undefined}
                className={computedRowClassName}
              >
                {/* Selection Cell */}
                <TableCell>
                  <BulkSelectionCheckbox
                    id={itemId}
                    aria-label={`Select ${itemLabel}`}
                  />
                </TableCell>

                {/* Data Cells */}
                {columns.map((column) => (
                  <TableCell
                    key={String(column.key)}
                    className={column.className}
                  >
                    {column.render
                      ? column.render(item, index)
                      : column.key === "actions"
                        ? null
                        : String(item[column.key as keyof T] || "")}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {/* Floating Action Bar */}
      <FloatingActionBar
        onDelete={onDelete}
        onExport={onExport}
        customActions={customActions}
      />
    </div>
  );
}

interface BulkSelectionTableProps<T>
  extends BulkSelectionTableInternalProps<T> {
  // Additional props can be added here if needed
}

export function BulkSelectionTable<T>(props: BulkSelectionTableProps<T>) {
  return (
    <BulkSelectionProvider>
      <BulkSelectionTableInternal {...props} />
    </BulkSelectionProvider>
  );
}
