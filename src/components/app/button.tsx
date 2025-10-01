import type { VariantProps } from "class-variance-authority";
import type * as React from "react";
import {
  Button as BaseButton,
  buttonVariants as baseButtonVariants,
} from "@/components/ui/button";

// Export ButtonProps type for use in pagination and other components
export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof baseButtonVariants> & {
    asChild?: boolean;
  };

// Re-export Button and buttonVariants
export const Button = BaseButton;
export const buttonVariants = baseButtonVariants;
