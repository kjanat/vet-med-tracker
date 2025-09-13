/**
 * Dashboard Layout Component - Strategy Pattern Implementation
 *
 * Enhanced sidebar layout with dashboard-specific features
 */

import type { ReactNode } from "react";
import { SidebarLayout } from "./sidebar-layout";

export interface DashboardLayoutProps {
  children: ReactNode;
  variant?: "default" | "compact" | "wide";
}

export function DashboardLayout({
  children,
  variant = "default",
}: DashboardLayoutProps) {
  const sidebarConfig = {
    defaultOpen: variant !== "compact",
    variant: "sidebar" as const,
  };

  const headerConfig = {
    showBreadcrumb: true,
    showSearch: variant !== "compact",
  };

  return (
    <SidebarLayout sidebarConfig={sidebarConfig} headerConfig={headerConfig}>
      <div
        className={`dashboard-content ${variant === "wide" ? "max-w-none" : "mx-auto max-w-7xl"}
          ${variant === "compact" ? "space-y-2" : "space-y-4"}
        `}
        data-variant={variant}
      >
        {children}
      </div>
    </SidebarLayout>
  );
}
