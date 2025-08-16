"use client";

import {
  ChevronDown,
  ExternalLink,
  Monitor,
  Moon,
  RotateCw,
  Smartphone,
  Sun,
} from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import type { ColorScheme, ViewportState } from "./constants";

interface MobileToolbarProps {
  state: ViewportState;
  deviceCount: number;
  onRotate: () => void;
  onColorSchemeChange: (scheme: ColorScheme) => void;
  onOpenDeviceSelector: () => void;
  onOpenInNewTab: () => void;
}

export const MobileToolbar = memo(function MobileToolbar({
  state,
  onRotate,
  onColorSchemeChange,
  onOpenDeviceSelector,
  onOpenInNewTab,
}: MobileToolbarProps) {
  const getSchemeIcon = () => {
    switch (state.scheme) {
      case "light":
        return <Sun className="h-4 w-4" />;
      case "dark":
        return <Moon className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const cycleColorScheme = () => {
    const schemes: ColorScheme[] = ["system", "light", "dark"];
    const currentIndex = schemes.indexOf(state.scheme);
    const nextIndex = (currentIndex + 1) % schemes.length;
    const nextScheme = schemes[nextIndex];
    if (nextScheme) {
      onColorSchemeChange(nextScheme);
    }
  };

  return (
    <div className="shrink-0 border-b bg-background">
      {/* Current Device Info */}
      <button
        type="button"
        onClick={onOpenDeviceSelector}
        className="flex w-full items-center justify-between px-3 py-2.5 text-left transition-colors active:bg-accent/50"
      >
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <div className="truncate font-medium text-sm">{state.name}</div>
            <div className="text-muted-foreground text-xs">
              {state.width} × {state.height} • {state.orientation}
            </div>
          </div>
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
      </button>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 px-3 pb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onRotate}
          className="h-8 flex-1 text-xs"
        >
          <RotateCw className="mr-1.5 h-3.5 w-3.5" />
          Rotate
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={cycleColorScheme}
          className="h-8 flex-1 text-xs"
        >
          {getSchemeIcon()}
          <span className="ml-1.5 capitalize">{state.scheme}</span>
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onOpenInNewTab}
          className="h-8 w-8"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
});
