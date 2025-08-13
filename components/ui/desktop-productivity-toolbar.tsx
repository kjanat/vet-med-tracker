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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
            placeholder="Search medications, animals..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-64 pl-10"
            data-shortcut="Ctrl+/"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="-translate-y-1/2 absolute top-1/2 right-2 transform">
                  <Badge variant="outline" className="px-1.5 py-0.5 text-xs">
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

        <Separator orientation="vertical" className="h-6" />

        {/* Filters */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="text-xs">
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
            <Button variant="outline" size="sm" className="gap-2">
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
              variant="outline"
              size="sm"
              onClick={() => onBulkAction?.("record", [])}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Record Selected
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBulkAction?.("snooze", [])}
              className="gap-2"
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
              <Button variant="outline" size="sm" className="gap-2">
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
              <Button variant="outline" size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                Import
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Import data (Ctrl+I)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="h-6" />

        {/* Keyboard shortcuts toggle */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowShortcuts(!showShortcuts);
                  onKeyboardShortcutsToggle?.();
                }}
                className="gap-2"
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
    { key: "Ctrl+/", description: "Focus search" },
    { key: "Ctrl+R", description: "Record medication" },
    { key: "Ctrl+H", description: "View history" },
    { key: "Ctrl+I", description: "View insights" },
    { key: "Ctrl+N", description: "Add new regimen" },
    { key: "Ctrl+?", description: "Show shortcuts" },
    { key: "Escape", description: "Close dialogs" },
    { key: "Enter", description: "Confirm selection" },
    { key: "Space", description: "Select/deselect item" },
    { key: "↑/↓", description: "Navigate list" },
    { key: "D", description: "Toggle due filter" },
    { key: "O", description: "Toggle overdue filter" },
    { key: "L", description: "Toggle later filter" },
    { key: "P", description: "Toggle PRN filter" },
    { key: "T", description: "Sort by time" },
    { key: "A", description: "Sort by animal" },
    { key: "M", description: "Sort by medication" },
    { key: "S", description: "Sort by status" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-lg">Keyboard Shortcuts</h3>
          <Button variant="ghost" size="sm" onClick={closeAction}>
            ×
          </Button>
        </div>

        <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="flex items-center justify-between py-1"
            >
              <span className="text-muted-foreground text-sm">
                {shortcut.description}
              </span>
              <Badge variant="outline" className="font-mono text-xs">
                {shortcut.key}
              </Badge>
            </div>
          ))}
        </div>

        <div className="mt-4 border-t pt-4">
          <p className="text-center text-muted-foreground text-xs">
            Press{" "}
            <Badge variant="outline" className="text-xs">
              Ctrl+?
            </Badge>{" "}
            anytime to toggle this overlay
          </p>
        </div>
      </div>
    </div>
  );
}
