"use client";

import { format } from "date-fns";
import { Calendar, Filter, X } from "lucide-react";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHistoryFilters } from "@/hooks/history/useHistoryFilters";

export function FilterBar() {
  const { animals } = useApp();
  const { filters, setFilter, setFilters } = useHistoryFilters();

  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    if (key === "view") return false;
    if (key === "type" && value === "all") return false;
    if ((key === "from" || key === "to") && value) return false; // Default date range doesn't count
    return value !== undefined && value !== "";
  }).length;

  const clearFilters = () => {
    setFilters({
      animalId: undefined,
      caregiverId: undefined,
      regimenId: undefined,
      type: "all",
    });
  };

  return (
    <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
      <div className="container max-w-full py-2 md:py-3">
        <div className="flex flex-col gap-2 md:gap-3">
          {/* Mobile: View toggle and date on same row */}
          <div className="flex gap-2 md:flex-wrap md:gap-3">
            {/* View Toggle */}
            <div className="flex rounded-lg border p-1 md:w-auto">
              <Button
                className="px-3 md:px-4"
                onClick={() => {
                  setFilter("view", "list");
                  window.dispatchEvent(
                    new CustomEvent("history_view_toggle", {
                      detail: { view: "list" },
                    }),
                  );
                }}
                size="sm"
                variant={filters.view === "list" ? "default" : "ghost"}
              >
                List
              </Button>
              <Button
                className="px-3 md:px-4"
                onClick={() => {
                  setFilter("view", "calendar");
                  window.dispatchEvent(
                    new CustomEvent("history_view_toggle", {
                      detail: { view: "calendar" },
                    }),
                  );
                }}
                size="sm"
                variant={filters.view === "calendar" ? "default" : "ghost"}
              >
                Calendar
              </Button>
            </div>

            {/* Date Range - Show on same row on mobile */}
            <div className="flex-1 md:flex-none">
              <DateRangePicker
                from={filters.from ? new Date(filters.from) : undefined}
                onSelect={(from, to) => {
                  if (from) setFilter("from", from.toISOString().split("T")[0]);
                  if (to) setFilter("to", to.toISOString().split("T")[0]);
                }}
                to={filters.to ? new Date(filters.to) : undefined}
              />
            </div>
          </div>

          {/* Animal and Type filters on same row */}
          <div className="flex gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3">
            {/* Animal Filter */}
            <Select
              onValueChange={(value) =>
                setFilter("animalId", value === "all" ? undefined : value)
              }
              value={filters.animalId || "all"}
            >
              <SelectTrigger className="flex-1 md:w-[180px]">
                <SelectValue placeholder="All Animals" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Animals</SelectItem>
                {animals.map((animal) => (
                  <SelectItem key={animal.id} value={animal.id}>
                    {animal.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select
              onValueChange={(value) => setFilter("type", value)}
              value={filters.type}
            >
              <SelectTrigger className="flex-1 md:w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="prn">PRN</SelectItem>
              </SelectContent>
            </Select>

            {/* Active Filters Badge */}
            {activeFilterCount > 0 && (
              <div className="flex w-full items-center gap-2 md:w-auto">
                <Badge className="gap-1" variant="secondary">
                  <Filter className="h-3 w-3" />
                  {activeFilterCount} active
                </Badge>
                <Button
                  className="h-9 px-2"
                  onClick={clearFilters}
                  size="sm"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                  <span className="ml-1">Clear</span>
                </Button>
              </div>
            )}
          </div>

          {/* Active Filter Pills - Only show on desktop to save mobile space */}
          {activeFilterCount > 0 && (
            <div className="hidden flex-wrap gap-2 md:flex">
              {filters.animalId && (
                <FilterPill
                  label={`Animal: ${animals.find((a) => a.id === filters.animalId)?.name}`}
                  onRemove={() => setFilter("animalId", undefined)}
                />
              )}
              {filters.type !== "all" && (
                <FilterPill
                  label={`Type: ${filters.type}`}
                  onRemove={() => setFilter("type", "all")}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterPill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <Badge className="gap-1" variant="secondary">
      {label}
      <Button
        className="h-4 w-4 p-0"
        onClick={onRemove}
        size="sm"
        variant="ghost"
      >
        <X className="h-3 w-3" />
      </Button>
    </Badge>
  );
}

function DateRangePicker({
  from,
  to,
  onSelect,
}: {
  from: Date | undefined;
  to: Date | undefined;
  onSelect: (from: Date | undefined, to: Date | undefined) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="h-11 w-full justify-start gap-2 bg-transparent text-left font-normal md:w-auto"
          size="sm"
          variant="outline"
        >
          <Calendar className="h-4 w-4 shrink-0" />
          <span className="truncate text-xs md:text-sm">
            {from && to
              ? `${format(from, "MMM d")} - ${format(to, "MMM d")}`
              : "Select dates"}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0" sideOffset={4}>
        {/* Mobile: Single range calendar */}
        <div className="p-3 md:hidden">
          <CalendarComponent
            autoFocus
            mode="range"
            numberOfMonths={1}
            onSelect={(range) => {
              onSelect(range?.from, range?.to);
            }}
            selected={{ from, to }}
          />
        </div>

        {/* Desktop: Two separate calendars */}
        <div className="hidden flex-row md:flex">
          <div className="border-r p-3">
            <div className="space-y-2">
              <p className="font-medium text-sm">From</p>
              <CalendarComponent
                autoFocus
                mode="single"
                onSelect={(date) => onSelect(date, to)}
                selected={from}
              />
            </div>
          </div>
          <div className="p-3">
            <div className="space-y-2">
              <p className="font-medium text-sm">To</p>
              <CalendarComponent
                mode="single"
                onSelect={(date) => onSelect(from, date)}
                selected={to}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
