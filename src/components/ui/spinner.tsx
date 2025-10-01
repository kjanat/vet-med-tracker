"use client";

import { cn } from "@/lib/utils/general";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Spinner({ size = "md", className }: SpinnerProps) {
  const sizeClasses = {
    lg: "w-8 h-8",
    md: "w-6 h-6",
    sm: "w-4 h-4",
  };

  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-primary border-t-transparent",
        sizeClasses[size],
        className,
      )}
    />
  );
}
