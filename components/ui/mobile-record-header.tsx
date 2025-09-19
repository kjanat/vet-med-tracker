"use client";

import { ArrowLeft, X } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Button } from "@/components/ui/button";

interface MobileRecordHeaderProps {
  step: "select" | "confirm" | "success";
  selectedAnimalName?: string;
  selectedMedication?: string;
  onBack?: () => void;
  onCancel?: () => void;
}

/**
 * Mobile-optimized header for medication recording
 * Provides clear navigation and context for the current step
 */
export function MobileRecordHeader({
  step,
  selectedAnimalName,
  selectedMedication,
  onBack,
  onCancel,
}: MobileRecordHeaderProps) {
  const router = useRouter();
  const { animals } = useApp();

  const selectedAnimal = selectedAnimalName
    ? animals.find((a) => a.name === selectedAnimalName)
    : null;

  const stepTitles = {
    confirm: "Confirm Administration",
    select: "Select Medication",
    success: "Recording Complete",
  };

  const stepProgress = {
    confirm: 2,
    select: 1,
    success: 3,
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (step === "select") {
      router.back();
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      router.push("/auth/dashboard" as Route);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Left: Back/Cancel */}
        <div className="flex items-center gap-2">
          {step !== "select" ? (
            <Button
              aria-label="Go back"
              className="h-10 w-10 p-0"
              onClick={handleBack}
              size="sm"
              variant="ghost"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              aria-label="Cancel and return to home"
              className="h-10 w-10 p-0"
              onClick={handleCancel}
              size="sm"
              variant="ghost"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Center: Title and Context */}
        <div className="mx-4 min-w-0 flex-1 text-center">
          <h1 className="truncate font-semibold text-lg">{stepTitles[step]}</h1>

          {/* Animal and medication context */}
          {selectedAnimalName && (
            <div className="mt-1 flex items-center justify-center gap-2">
              {selectedAnimal && (
                <AnimalAvatar
                  animal={selectedAnimal}
                  className="shrink-0"
                  size="xs"
                />
              )}
              <div className="min-w-0">
                <p className="truncate text-muted-foreground text-sm">
                  {selectedAnimalName}
                  {selectedMedication && ` • ${selectedMedication}`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Progress indicator */}
        <output
          aria-label={`Step ${stepProgress[step]} of 3`}
          className="flex items-center gap-1"
        >
          {[1, 2, 3].map((num) => (
            <div
              aria-hidden="true"
              className={`h-2 w-2 rounded-full transition-colors ${
                num <= stepProgress[step]
                  ? "bg-primary"
                  : "bg-muted-foreground/30"
              }`}
              key={num}
            />
          ))}
        </output>
      </div>
    </header>
  );
}

/**
 * Quick stats bar for medication recording context
 * Shows important information like due count, compliance, etc.
 */
export function MobileRecordStats({
  dueCount = 0,
  overdueCount = 0,
  complianceRate = 0,
  className = "",
}: {
  dueCount?: number;
  overdueCount?: number;
  complianceRate?: number;
  className?: string;
}) {
  return (
    <div className={`border-b bg-muted/50 px-4 py-2 ${className}`}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-600" />
            <span className="text-muted-foreground">Due: {dueCount}</span>
          </div>

          {overdueCount > 0 && (
            <div className="flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-red-600" />
              <span className="text-muted-foreground">
                Overdue: {overdueCount}
              </span>
            </div>
          )}
        </div>

        <div className="text-muted-foreground">
          {complianceRate}% compliance
        </div>
      </div>
    </div>
  );
}
