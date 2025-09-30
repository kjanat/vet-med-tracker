"use client";

import { useState } from "react";

// Minimal stub for timezone combobox
export interface TimezoneComboboxProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export function TimezoneCombobox({
  value,
  onChange,
  disabled,
}: TimezoneComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);

  const timezones = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "UTC",
  ];

  return (
    <div className="relative">
      <button
        className="w-full rounded border px-3 py-2 text-left"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
      >
        {value || "Select timezone..."}
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full rounded border bg-white shadow-lg">
          {timezones.map((tz) => (
            <button
              className="w-full px-3 py-2 text-left hover:bg-gray-100"
              key={tz}
              onClick={() => {
                onChange?.(tz);
                setIsOpen(false);
              }}
            >
              {tz}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default TimezoneCombobox;
