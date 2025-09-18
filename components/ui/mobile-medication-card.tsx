"use client";

import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { useMemo } from "react";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  getCardAnimation,
  PRIORITY_ANIMATIONS,
} from "@/lib/utils/animation-config";
import {
  getMedicationStatus,
  getStatusConfig,
} from "@/lib/utils/status-config";
import { formatTimeLocal } from "@/utils/tz";
import { layoutPatterns, textPatterns } from "./class-variants";

interface MobileMedicationCardProps {
  regimen: {
    id: string;
    animalId: string;
    animalName: string;
    animalSpecies?: string;
    animalPhotoUrl?: string | null;
    medicationName: string;
    brandName?: string | null;
    route: string;
    form: string;
    strength: string;
    dose?: string;
    targetTime?: string;
    isPRN: boolean;
    isHighRisk: boolean;
    requiresCoSign: boolean;
    section: "due" | "later" | "prn";
    isOverdue?: boolean;
    minutesUntilDue?: number;
    instructions?: string | null;
    prnReason?: string | null;
  };
  animal?: {
    id: string;
    name: string;
    species: string;
    avatar?: string;
  };
  onClick: () => void;
  isSelected?: boolean;
}

/**
 * Mobile-optimized medication card with large touch targets
 * Designed for easy thumb navigation and clear visual hierarchy
 */
export function MobileMedicationCard({
  regimen,
  animal,
  onClick,
  isSelected = false,
}: MobileMedicationCardProps) {
  const statusInfo = useMemo(() => {
    const statusType = getMedicationStatus(regimen);
    const config = getStatusConfig(statusType);

    if (regimen.isPRN) {
      return {
        config,
        icon: CheckCircle,
        label: "PRN",
        priority: "normal" as const,
      };
    }

    if (regimen.isOverdue) {
      return {
        config,
        icon: AlertTriangle,
        label: "Overdue",
        priority: "urgent" as const,
      };
    }

    if (regimen.section === "due") {
      return {
        config,
        icon: Clock,
        label: "Due Now",
        priority: "high" as const,
      };
    }

    return {
      config,
      icon: Clock,
      label: "Later",
      priority: "normal" as const,
    };
  }, [regimen]);
  const StatusIcon = statusInfo.icon;

  const timeDisplay = useMemo(() => {
    if (regimen.isPRN) {
      return "As needed";
    }

    if (regimen.targetTime) {
      const timeStr = formatTimeLocal(
        new Date(regimen.targetTime),
        "America/New_York",
      );
      if (regimen.isOverdue && regimen.minutesUntilDue) {
        const overdueMins = Math.abs(regimen.minutesUntilDue);
        return `${timeStr} (${overdueMins}m overdue)`;
      }
      if (regimen.section === "due" && regimen.minutesUntilDue) {
        return `${timeStr} (${regimen.minutesUntilDue}m)`;
      }
      return timeStr;
    }

    return "No time set";
  }, [
    regimen.isPRN,
    regimen.targetTime,
    regimen.isOverdue,
    regimen.minutesUntilDue,
    regimen.section,
  ]);

  return (
    <Card
      aria-label={`Select ${regimen.medicationName} for ${regimen.animalName}`}
      className={`
        ${getCardAnimation(isSelected)}
        ${statusInfo.config.bg} ${statusInfo.config.border}
      `}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      tabIndex={0}
    >
      <CardContent className="p-4">
        {/* Priority indicator */}
        {statusInfo.priority === "urgent" && (
          <output
            aria-label="Urgent medication"
            className={`absolute top-2 right-2 h-3 w-3 rounded-full bg-red-500 ${PRIORITY_ANIMATIONS.urgent}`}
          />
        )}

        <div className="flex items-start gap-3">
          {/* Animal avatar */}
          {animal && (
            <div className="shrink-0">
              <AnimalAvatar animal={animal} showBadge={false} size="md" />
            </div>
          )}

          {/* Main content */}
          <div className="min-w-0 flex-1">
            {/* Status and time */}
            <div className={`mb-2 ${layoutPatterns.flexBetween}`}>
              <div className={layoutPatterns.flexCenterGap2}>
                <StatusIcon
                  aria-hidden="true"
                  className={`h-4 w-4 ${statusInfo.config.icon}`}
                />
                <Badge
                  className="text-xs"
                  variant={
                    statusInfo.config.badge as
                      | "default"
                      | "secondary"
                      | "destructive"
                      | "outline"
                      | "success"
                      | "warning"
                      | "info"
                  }
                >
                  {statusInfo.label}
                </Badge>
              </div>

              <div className={textPatterns.monoSmall}>{timeDisplay}</div>
            </div>

            {/* Animal name */}
            <div className="mb-1 truncate font-medium text-base">
              {regimen.animalName}
            </div>

            {/* Medication details */}
            <div className="space-y-1">
              <div className="truncate font-semibold text-lg">
                {regimen.medicationName}
                {regimen.brandName &&
                  regimen.brandName !== regimen.medicationName && (
                    <span className="ml-1 font-normal text-base text-muted-foreground">
                      ({regimen.brandName})
                    </span>
                  )}
              </div>

              <div className="text-muted-foreground text-sm">
                {regimen.strength} • {regimen.route}
                {regimen.dose && ` • ${regimen.dose}`}
              </div>
            </div>

            {/* Special indicators */}
            <div className={`mt-2 ${layoutPatterns.flexCenterGap2}`}>
              {regimen.isHighRisk && (
                <Badge className="text-xs" variant="destructive">
                  High Risk
                </Badge>
              )}

              {regimen.requiresCoSign && (
                <Badge className="text-xs" variant="outline">
                  Co-sign Required
                </Badge>
              )}

              {regimen.isPRN && regimen.prnReason && (
                <Badge className="text-xs" variant="secondary">
                  {regimen.prnReason}
                </Badge>
              )}
            </div>

            {/* Instructions preview */}
            {regimen.instructions && (
              <div className="mt-2 line-clamp-2 text-muted-foreground text-sm">
                {regimen.instructions}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Mobile-optimized section header for grouping medications
 */
export function MobileSectionHeader({
  title,
  count,
  subtitle,
  className = "",
}: {
  title: string;
  count?: number;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={`border-y bg-muted/30 px-4 py-3 ${className}`}>
      <div className={layoutPatterns.flexBetween}>
        <div>
          <h2 className="font-semibold text-lg">
            {title}
            {count !== undefined && (
              <span className="ml-2 font-normal text-muted-foreground">
                ({count})
              </span>
            )}
          </h2>
          {subtitle && (
            <p className="mt-1 text-muted-foreground text-sm">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
}
