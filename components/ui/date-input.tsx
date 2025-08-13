"use client";

import {Calendar as CalendarIcon} from "lucide-react";
import * as React from "react";

import {Button} from "@/components/ui/button";
import {Calendar} from "@/components/ui/calendar";
import {Input} from "@/components/ui/input";
import {Label} from "@/components/ui/label";
import {Popover, PopoverContent, PopoverTrigger,} from "@/components/ui/popover";

function formatDate(date: Date | undefined) {
  if (!date) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function isValidDate(date: Date | undefined) {
  if (!date) {
    return false;
  }
  return !Number.isNaN(date.getTime());
}

interface DateInputProps {
  label?: string;
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  id?: string;
  required?: boolean;
  fromDate?: Date;
  toDate?: Date;
  disabled?: (date: Date) => boolean;
}

export function DateInput({
  label,
  value,
  onChange,
  placeholder = "Select date",
  id,
  required,
  fromDate,
  toDate,
  disabled,
}: DateInputProps) {
  const [open, setOpen] = React.useState(false);
  const [date, setDate] = React.useState<Date | undefined>(value);
  const [month, setMonth] = React.useState<Date | undefined>(
    value || new Date(),
  );
  const [inputValue, setInputValue] = React.useState(formatDate(value));

  React.useEffect(() => {
    setDate(value);
    setInputValue(formatDate(value));
    if (value) {
      setMonth(value);
    }
  }, [value]);

  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
    setInputValue(formatDate(newDate));
    onChange?.(newDate);
  };

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <Label htmlFor={id} className="px-1">
          {label} {required && "*"}
        </Label>
      )}
      <div className="relative flex gap-2">
        <Input
          id={id}
          value={inputValue}
          placeholder={placeholder}
          className="bg-background pr-10"
          onChange={(e) => {
            const date = new Date(e.target.value);
            setInputValue(e.target.value);
            if (isValidDate(date)) {
              handleDateChange(date);
              setMonth(date);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        />
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={id ? `${id}-picker` : undefined}
              variant="ghost"
              className="-translate-y-1/2 absolute top-1/2 right-2 size-6"
            >
              <CalendarIcon className="size-3.5" />
              <span className="sr-only">Select date</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto overflow-hidden p-0"
            align="end"
            alignOffset={-8}
            sideOffset={10}
          >
            <Calendar
              mode="single"
              selected={date}
              captionLayout="dropdown"
              month={month}
              onMonthChange={setMonth}
              onSelect={(date) => {
                handleDateChange(date);
                setOpen(false);
              }}
              startMonth={fromDate || new Date(new Date().getFullYear(), 0)}
              endMonth={toDate || new Date(new Date().getFullYear() + 10, 11)}
              disabled={(date) => {
                // Apply custom disabled function if provided
                if (disabled?.(date)) {
                  return true;
                }

                // Apply date range restrictions
                if (fromDate && date < fromDate) {
                  return true;
                }

                return !!(toDate && date > toDate);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
