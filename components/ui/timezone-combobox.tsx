"use client";

import { Check, ChevronsUpDown, Globe } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils/general";
import {
  BROWSER_ZONE,
  getCommonTimezones,
  IANA_TIMEZONES,
  type IanaZone,
  isValidTimezone,
  offsetOf,
  searchZones,
  timeIn,
} from "@/utils/timezone-helpers";

interface TimezoneComboboxProps {
  id?: string;
  value?: string;
  onChange: (timezone: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  ariaLabelledBy?: string;
}

export function TimezoneCombobox({
  id,
  value,
  onChange,
  placeholder = "Select timezone...",
  required = false,
  disabled = false,
  className,
  ariaLabelledBy,
}: TimezoneComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Auto-detect browser timezone on mount if no value is set
  useEffect(() => {
    setMounted(true);
    if (!value && BROWSER_ZONE) {
      onChange(BROWSER_ZONE);
    }
  }, [value, onChange]);

  // Validate the current value
  const isValid = value && isValidTimezone(value);
  const currentValue = isValid ? value : undefined;

  // Get zones to display based on search with memoization
  const zones = useMemo(
    () => (query ? searchZones(query) : IANA_TIMEZONES),
    [query],
  );
  const commonZones = useMemo(() => getCommonTimezones(), []);

  // Show common zones when no search query
  const showCommon = !query && zones.length > 20;

  // Get display components safely
  const getTimezoneDisplay = (zone: IanaZone) => {
    const offset = offsetOf(zone);
    const time = timeIn(zone);
    return { offset, time, zone };
  };

  const currentDisplay = currentValue
    ? getTimezoneDisplay(currentValue as IanaZone)
    : null;

  const handleSelect = (zone: string) => {
    onChange(zone);
    setOpen(false);
    setQuery("");
  };

  const handleDetectBrowser = () => {
    if (BROWSER_ZONE) {
      onChange(BROWSER_ZONE);
      setOpen(false);
      setQuery("");
    }
  };

  if (!mounted) {
    // Avoid hydration mismatch by not rendering time-dependent content on server
    return (
      <Button
        aria-labelledby={ariaLabelledBy}
        className={cn("w-full justify-between", className)}
        disabled={disabled}
        id={id}
        variant="outline"
      >
        <span className="text-muted-foreground">{placeholder}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          aria-controls="timezone-listbox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-label="Select timezone"
          aria-labelledby={ariaLabelledBy}
          aria-required={required}
          className={cn(
            "w-full justify-between",
            !currentDisplay && "text-muted-foreground",
            className,
          )}
          disabled={disabled}
          id={id}
          role="combobox"
          variant="outline"
        >
          <span className="truncate">
            {currentDisplay ? (
              <>
                <span className="font-medium">
                  {currentDisplay.zone
                    ?.split("/")
                    .slice(-1)[0]
                    ?.replace(/_/g, " ")}
                </span>
                <span className="ml-2 hidden text-muted-foreground sm:inline">
                  ({currentDisplay.offset}, {currentDisplay.time})
                </span>
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[400px] p-0">
        <Command id="timezone-listbox" shouldFilter={false}>
          <CommandInput
            onValueChange={setQuery}
            placeholder="Search timezones..."
            value={query}
          />
          <CommandList className="max-h-none overflow-visible">
            <CommandEmpty>
              {query.length === 0
                ? "Type to search timezones..."
                : "No timezones found."}
            </CommandEmpty>

            {BROWSER_ZONE && (
              <div className="sticky top-0 z-10 bg-popover">
                <CommandGroup>
                  <CommandItem
                    className="flex items-center gap-2"
                    onSelect={handleDetectBrowser}
                  >
                    <Globe className="h-4 w-4" />
                    <span>Detect from browser</span>
                    <span className="ml-auto text-muted-foreground text-sm">
                      {BROWSER_ZONE}
                    </span>
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
              </div>
            )}

            <ScrollArea className="h-[252px] w-full" type="auto">
              <div className="min-h-full">
                {showCommon && (
                  <>
                    <CommandGroup heading="Common timezones">
                      {commonZones.slice(0, 10).map((zone) => {
                        const display = getTimezoneDisplay(zone as IanaZone);
                        return (
                          <CommandItem
                            className="flex items-start"
                            key={zone}
                            onSelect={handleSelect}
                            value={zone}
                          >
                            <Check
                              className={cn(
                                "mt-0.5 mr-2 h-4 w-4",
                                currentValue === zone
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {zone
                                  ?.split("/")
                                  .slice(-1)[0]
                                  ?.replace(/_/g, " ")}
                              </span>
                              <span className="text-muted-foreground text-sm">
                                {zone}
                                <span className="hidden sm:inline">
                                  {" • "}
                                  {display.offset}, {display.time}
                                </span>
                              </span>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                    <CommandSeparator />
                  </>
                )}

                <CommandGroup
                  heading={query ? "Search results" : "All timezones"}
                >
                  {zones.slice(0, query ? undefined : 50).map((zone) => {
                    const display = getTimezoneDisplay(zone as IanaZone);
                    return (
                      <CommandItem
                        className="flex items-start"
                        key={zone}
                        onSelect={handleSelect}
                        value={zone}
                      >
                        <Check
                          className={cn(
                            "mt-0.5 mr-2 h-4 w-4",
                            currentValue === zone ? "opacity-100" : "opacity-0",
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {zone?.split("/").slice(-1)[0]?.replace(/_/g, " ")}
                          </span>
                          <span className="text-muted-foreground text-sm">
                            {zone}
                            <span className="hidden sm:inline">
                              {" • "}
                              {display.offset}, {display.time}
                            </span>
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                  {!query && zones.length > 50 && (
                    <CommandItem disabled>
                      <span className="text-muted-foreground text-sm">
                        Type to search {zones.length - 50} more timezones...
                      </span>
                    </CommandItem>
                  )}
                </CommandGroup>
              </div>
            </ScrollArea>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
