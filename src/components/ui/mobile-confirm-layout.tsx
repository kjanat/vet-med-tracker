"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/app/button";
import { cn } from "@/lib/utils/general";

interface MobileConfirmLayoutProps {
  title: string;
  onBack?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
  cancelText?: string;
  confirmText?: string;
  isLoading?: boolean;
  children: ReactNode;
  className?: string;
}

export function MobileConfirmLayout({
  title,
  onBack,
  onCancel,
  onConfirm,
  cancelText = "Cancel",
  confirmText = "Confirm",
  isLoading = false,
  children,
  className,
}: MobileConfirmLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {/* Header */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-4 py-3">
          {onBack && (
            <Button onClick={onBack} size="icon" variant="ghost">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="flex-1 text-center font-semibold text-lg">{title}</h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">{children}</div>

      {/* Bottom Actions */}
      <div className="sticky bottom-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex gap-3 p-4">
          {onCancel && (
            <Button
              className="flex-1"
              disabled={isLoading}
              onClick={onCancel}
              variant="outline"
            >
              {cancelText}
            </Button>
          )}
          {onConfirm && (
            <Button className="flex-1" disabled={isLoading} onClick={onConfirm}>
              {isLoading ? "Loading..." : confirmText}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
