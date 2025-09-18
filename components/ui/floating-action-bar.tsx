"use client";

import { Download, Trash2, X } from "lucide-react";
import type React from "react";
import { useBulkSelection } from "@/components/providers/bulk-selection-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/general";

interface FloatingActionBarProps {
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
  className?: string;
}

export function FloatingActionBar({
  onDelete,
  onExport,
  customActions = [],
  className,
}: FloatingActionBarProps) {
  const { selectionCount, selectedIds, clearSelection } = useBulkSelection();

  if (selectionCount === 0) {
    return null;
  }

  const selectedIdsArray = Array.from(selectedIds);

  return (
    <div
      className={cn(
        "-translate-x-1/2 slide-in-from-bottom-2 fixed bottom-4 left-1/2 z-50 flex transform animate-in items-center gap-2 rounded-lg border bg-background px-4 py-3 shadow-lg",
        "sm:bottom-6",
        className,
      )}
    >
      <span className="font-medium text-muted-foreground text-sm">
        {selectionCount} selected
      </span>

      <div className="flex items-center gap-1">
        {/* Custom Actions */}
        {customActions.map((action, index) => (
          <Button
            className="gap-1"
            key={`action-${action.label}-${index}`}
            onClick={() => action.onClick(selectedIdsArray)}
            size="sm"
            variant={action.variant || "outline"}
          >
            <action.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{action.label}</span>
          </Button>
        ))}

        {/* Export Action */}
        {onExport && (
          <Button
            className="gap-1"
            onClick={() => onExport(selectedIdsArray)}
            size="sm"
            variant="outline"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        )}

        {/* Delete Action */}
        {onDelete && (
          <Button
            className="gap-1"
            onClick={() => onDelete(selectedIdsArray)}
            size="sm"
            variant="destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        )}

        {/* Clear Selection */}
        <Button
          aria-label="Clear selection"
          className="gap-1"
          onClick={clearSelection}
          size="sm"
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
