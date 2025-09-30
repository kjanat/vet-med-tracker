"use client";

import { AlertTriangle, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/general";

interface MedConfirmButtonProps {
  status?: "pending" | "confirmed" | "overdue";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function MedConfirmButton({
  status = "pending",
  onClick,
  disabled,
  className,
  children,
}: MedConfirmButtonProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "confirmed":
        return {
          className: "bg-green-600 hover:bg-green-700",
          icon: Check,
          text: children || "Confirmed",
          variant: "default" as const,
        };
      case "overdue":
        return {
          className: "bg-red-600 hover:bg-red-700",
          icon: AlertTriangle,
          text: children || "Overdue",
          variant: "destructive" as const,
        };
      default:
        return {
          className: "",
          icon: Clock,
          text: children || "Confirm",
          variant: "outline" as const,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <Button
      className={cn("gap-2", config.className, className)}
      disabled={disabled}
      onClick={onClick}
      variant={config.variant}
    >
      <Icon className="h-4 w-4" />
      {config.text}
    </Button>
  );
}
