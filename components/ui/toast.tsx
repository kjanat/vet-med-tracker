"use client";

import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils/general";

export interface ToastProps {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variant?: "default" | "destructive";
}

export interface ToastActionElement extends React.ReactElement {
  altText: string;
}

export const Toast = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "destructive";
    onClose?: () => void;
  }
>(({ className, variant = "default", onClose, children, ...props }, ref) => {
  return (
    <div
      className={cn(
        "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all",
        variant === "destructive"
          ? "border-destructive bg-destructive text-destructive-foreground"
          : "border bg-background text-foreground",
        className,
      )}
      ref={ref}
      {...props}
    >
      {children}
      {onClose && (
        <button
          className="absolute top-2 right-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100"
          onClick={onClose}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
});
Toast.displayName = "Toast";

export const ToastAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { altText: string }
>(({ className, altText, ...props }, ref) => {
  return (
    <button
      aria-label={altText}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 font-medium text-sm ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      ref={ref}
      type="button"
      {...props}
    />
  );
});
ToastAction.displayName = "ToastAction";

export const ToastClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, ...props }, ref) => {
  return (
    <button
      className={cn(
        "absolute top-2 right-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100",
        className,
      )}
      ref={ref}
      type="button"
      {...props}
    >
      <X className="h-4 w-4" />
    </button>
  );
});
ToastClose.displayName = "ToastClose";

export const ToastTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p
      className={cn("font-semibold text-sm", className)}
      ref={ref}
      {...props}
    />
  );
});
ToastTitle.displayName = "ToastTitle";

export const ToastDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  return (
    <p className={cn("text-sm opacity-90", className)} ref={ref} {...props} />
  );
});
ToastDescription.displayName = "ToastDescription";

export type ToastVariant = "default" | "destructive";
