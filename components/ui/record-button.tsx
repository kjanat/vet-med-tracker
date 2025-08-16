"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/general";

interface RecordButtonProps {
  onRecord?: () => void;
  prefilled?: boolean;
  className?: string;
}

export function RecordButton({
  onRecord,
  prefilled = false,
  className,
}: RecordButtonProps) {
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  const handleMouseDown = () => {
    setIsHolding(true);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 2;
      setHoldProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        setIsHolding(false);
        setHoldProgress(0);
        onRecord?.();
      }
    }, 30);

    const handleMouseUp = () => {
      clearInterval(interval);
      setIsHolding(false);
      setHoldProgress(0);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <Button
      onMouseDown={handleMouseDown}
      className={cn(
        "relative overflow-hidden",
        prefilled && "ring-2 ring-primary ring-offset-2",
        className,
      )}
      size="lg"
    >
      <div
        className="absolute inset-0 bg-primary-foreground/20 transition-all duration-75"
        style={{ width: `${holdProgress}%` }}
      />
      <Plus className="mr-2 h-4 w-4" />
      {isHolding ? "Hold to Record..." : "Record"}
    </Button>
  );
}
