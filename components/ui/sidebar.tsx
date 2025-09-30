"use client";

import * as React from "react";
import { cn } from "@/lib/utils/general";

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "left" | "right";
  collapsed?: boolean;
}

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(
  ({ className, side = "left", collapsed = false, ...props }, ref) => {
    return (
      <div
        className={cn(
          "flex flex-col border-r bg-background",
          collapsed ? "w-16" : "w-64",
          side === "right" && "border-r-0 border-l",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Sidebar.displayName = "Sidebar";

export const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      className={cn("flex items-center border-b px-4 py-3", className)}
      ref={ref}
      {...props}
    />
  );
});
SidebarHeader.displayName = "SidebarHeader";

export const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      className={cn("flex-1 overflow-auto px-2 py-4", className)}
      ref={ref}
      {...props}
    />
  );
});
SidebarContent.displayName = "SidebarContent";

export const SidebarFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div className={cn("border-t px-4 py-3", className)} ref={ref} {...props} />
  );
});
SidebarFooter.displayName = "SidebarFooter";

export const SidebarItem = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    active?: boolean;
  }
>(({ className, active, ...props }, ref) => {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "hover:bg-accent hover:text-accent-foreground",
        className,
      )}
      ref={ref}
      type="button"
      {...props}
    />
  );
});
SidebarItem.displayName = "SidebarItem";
