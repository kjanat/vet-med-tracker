"use client";

import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Filter,
  Keyboard,
  Plus,
  RotateCcw,
  Search,
  SortAsc,
  SortDesc,
  Upload,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/app/badge";
import { Button } from "@/components/app/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DesktopProductivityToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortBy: "time" | "animal" | "medication" | "status";
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: string, order: "asc" | "desc") => void;
  filters: {
    showDue: boolean;
    showLater: boolean;
    showPRN: boolean;
    showOverdue: boolean;
  };
  onFiltersChange: (filters: {
    showDue: boolean;
    showLater: boolean;
    showPRN: boolean;
    showOverdue: boolean;
  }) => void;
  onBulkAction?: (action: string, selectedIds: string[]) => void;
  selectedCount?: number;
  totalCount?: number;
  onKeyboardShortcutsToggle?: () => void;
}

export function DesktopProductivityToolbar({
  searchQuery,
  onSearchChange,
  sortBy,
  sortOrder,
  onSortChange,
  filters,
  onFiltersChange,
  onBulkAction,
  selectedCount = 0,
  totalCount = 0,
  onKeyboardShortcutsToggle,
}: DesktopProductivityToolbarProps) {
  const [showShortcuts, setShowShortcuts] = useState(false);

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex items-center justify-between border-b bg-background p-4">
      {/* Left side - Search and filters */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
          <Input
            className="w-64 pl-10"
            data-shortcut="Ctrl+/"
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search medications, animals..."
            value={searchQuery}
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="-translate-y-1/2 absolute top-1/2 right-2 transform">
                  <Badge className="px-1.5 py-0.5 text-xs" variant="outline">
                    Ctrl+/
                  </Badge>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Focus search (Ctrl+/)</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Separator className="h-6" orientation="vertical" />

        {/* Filters */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2" size="sm" variant="outline">
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge className="text-xs" variant="secondary">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Show Medications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={filters.showDue}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, showDue: checked })
              }
            >
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                Due Now
              </div>
              <DropdownMenuShortcut>D</DropdownMenuShortcut>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.showOverdue}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, showOverdue: checked })
              }
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Overdue
              </div>
              <DropdownMenuShortcut>O</DropdownMenuShortcut>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.showLater}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, showLater: checked })
              }
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                Later Today
              </div>
              <DropdownMenuShortcut>L</DropdownMenuShortcut>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={filters.showPRN}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, showPRN: checked })
              }
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                PRN (As Needed)
              </div>
              <DropdownMenuShortcut>P</DropdownMenuShortcut>
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2" size="sm" variant="outline">
              {sortOrder === "asc" ? (
                <SortAsc className="h-4 w-4" />
              ) : (
                <SortDesc className="h-4 w-4" />
              )}
              Sort
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={sortBy === "time"}
              onCheckedChange={() => onSortChange("time", sortOrder)}
            >
              Time Due
              <DropdownMenuShortcut>T</DropdownMenuShortcut>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortBy === "animal"}
              onCheckedChange={() => onSortChange("animal", sortOrder)}
            >
              Animal Name
              <DropdownMenuShortcut>A</DropdownMenuShortcut>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortBy === "medication"}
              onCheckedChange={() => onSortChange("medication", sortOrder)}
            >
              Medication
              <DropdownMenuShortcut>M</DropdownMenuShortcut>
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortBy === "status"}
              onCheckedChange={() => onSortChange("status", sortOrder)}
            >
              Status
              <DropdownMenuShortcut>S</DropdownMenuShortcut>
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem
              checked={sortOrder === "asc"}
              onCheckedChange={() => onSortChange(sortBy, "asc")}
            >
              Ascending
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              checked={sortOrder === "desc"}
              onCheckedChange={() => onSortChange(sortBy, "desc")}
            >
              Descending
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Center - Selection info */}
      {selectedCount > 0 && (
        <div className="flex items-center gap-3">
          <div className="text-muted-foreground text-sm">
            {selectedCount} of {totalCount} selected
          </div>

          <div className="flex items-center gap-2">
            <Button
              className="gap-2"
              onClick={() => onBulkAction?.("record", [])}
              size="sm"
              variant="outline"
            >
              <Plus className="h-4 w-4" />
              Record Selected
            </Button>
            <Button
              className="gap-2"
              onClick={() => onBulkAction?.("snooze", [])}
              size="sm"
              variant="outline"
            >
              <RotateCcw className="h-4 w-4" />
              Snooze
            </Button>
          </div>
        </div>
      )}

      {/* Right side - Actions and shortcuts */}
      <div className="flex items-center gap-2">
        {/* Quick actions */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="gap-2" size="sm" variant="outline">
                <Download className="h-4 w-4" />
                Export
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Export data (Ctrl+E)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="gap-2" size="sm" variant="outline">
                <Upload className="h-4 w-4" />
                Import
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Import data (Ctrl+I)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator className="h-6" orientation="vertical" />

        {/* Keyboard shortcuts toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="gap-2"
                onClick={() => {
                  setShowShortcuts(!showShortcuts);
                  onKeyboardShortcutsToggle?.();
                }}
                size="sm"
                variant="ghost"
              >
                <Keyboard className="h-4 w-4" />
                <span className="sr-only">Toggle keyboard shortcuts</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Show keyboard shortcuts (Ctrl+?)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

// Keyboard shortcuts overlay component
export function KeyboardShortcutsOverlay({
  isOpen,
  closeAction,
}: {
  closeAction: () => void;
  isOpen: boolean;
}) {
  if (!isOpen) return null;

  const shortcuts = [
    { description: "Focus search", key: "Ctrl+/" },
    { description: "Record medication", key: "Ctrl+R" },
    { description: "View history", key: "Ctrl+H" },
    { description: "View insights", key: "Ctrl+I" },
    { description: "Add new regimen", key: "Ctrl+N" },
    { description: "Show shortcuts", key: "Ctrl+?" },
    { description: "Close dialogs", key: "Escape" },
    { description: "Confirm selection", key: "Enter" },
    { description: "Select/deselect item", key: "Space" },
    { description: "Navigate list", key: "↑/↓" },
    { description: "Toggle due filter", key: "D" },
    { description: "Toggle overdue filter", key: "O" },
    { description: "Toggle later filter", key: "L" },
    { description: "Toggle PRN filter", key: "P" },
    { description: "Sort by time", key: "T" },
    { description: "Sort by animal", key: "A" },
    { description: "Sort by medication", key: "M" },
    { description: "Sort by status", key: "S" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Keyboard Shortcuts</h3>
          <Button onClick={closeAction} size="sm" variant="ghost">
            ×
          </Button>
        </div>

        <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto">
          {shortcuts.map((shortcut) => (
            <div
              className="flex items-center justify-between py-1"
              key={shortcut.key}
            >
              <span className="text-muted-foreground text-sm">
                {shortcut.description}
              </span>
              <Badge className="font-mono text-xs" variant="outline">
                {shortcut.key}
              </Badge>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t pt-4">
          <p className="text-center text-muted-foreground text-xs">
            Press{" "}
            <Badge className="text-xs" variant="outline">
              Ctrl+?
            </Badge>{" "}
            anytime to toggle this overlay
          </p>
        </div>
      </div>
    </div>
  );
}
