"use client";

import { type ReactNode, useState } from "react";

// Minimal stub for popover
export interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({
  trigger,
  children,
  open,
  onOpenChange,
}: PopoverProps) {
  const [isOpen, setIsOpen] = useState(open || false);

  const handleToggle = () => {
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <div className="relative">
      <div onClick={handleToggle}>{trigger}</div>
      {isOpen && (
        <div className="absolute z-10 mt-1 rounded border bg-white p-4 shadow-lg">
          {children}
        </div>
      )}
    </div>
  );
}

export interface PopoverTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

export function PopoverTrigger({ children }: PopoverTriggerProps) {
  return <>{children}</>;
}

export interface PopoverContentProps {
  children: ReactNode;
  className?: string;
}

export function PopoverContent({ children, className }: PopoverContentProps) {
  return <div className={className}>{children}</div>;
}

export default Popover;
