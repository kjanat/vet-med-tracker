import type { ReactNode } from "react";
import { cn } from "@/lib/utils/general";

interface SectionProps {
  children: ReactNode;
  className?: string;
  id?: string;
  variant?: "default" | "muted" | "gradient" | "transparent";
  spacing?: "default" | "large" | "small";
}

const variantStyles = {
  default: "bg-background",
  muted: "bg-muted/50",
  gradient: "bg-gradient-to-b from-transparent via-background/50 to-background",
  transparent: "bg-transparent",
};

const spacingStyles = {
  default: "py-20",
  large: "py-32",
  small: "py-12",
};

export function Section({
  children,
  className,
  id,
  variant = "default",
  spacing = "default",
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(
        "relative",
        variantStyles[variant],
        spacingStyles[spacing],
        "scroll-mt-20", // Account for header height when scrolling to anchors
        className,
      )}
    >
      <div className="container relative mx-auto max-w-6xl px-4">
        {children}
      </div>
    </section>
  );
}
