import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import { Badge as BaseBadge, type badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils/general";

const statusClasses = {
  success:
    "border-transparent bg-emerald-500 text-white hover:bg-emerald-500/80",
  warning: "border-transparent bg-amber-500 text-black hover:bg-amber-500/80",
} as const;

type BaseVariant = VariantProps<typeof badgeVariants>["variant"];
type AppVariant = BaseVariant | keyof typeof statusClasses;

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: AppVariant | null;
}

export function Badge({ variant = "default", className, ...rest }: BadgeProps) {
  // Add custom classes for app-specific variants
  const extra =
    (variant &&
      variant in statusClasses &&
      statusClasses[variant as keyof typeof statusClasses]) ||
    undefined;

  // For base component, coerce unsupported variants back to "default"
  const baseVariant = (
    variant && variant in statusClasses ? "default" : variant
  ) as BaseVariant;

  return (
    <BaseBadge
      className={cn(extra, className)}
      variant={baseVariant}
      {...rest}
    />
  );
}
