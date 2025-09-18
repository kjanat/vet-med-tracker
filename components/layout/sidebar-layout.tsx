/**
 * Sidebar Layout Component - Strategy Pattern Implementation
 *
 * Replaces the complex nested layout structure with a clean, reusable component
 */

import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { PageHeaderEnhanced } from "./page-header-enhanced";

export interface SidebarLayoutProps {
  children: ReactNode;
  sidebarConfig?: {
    defaultOpen?: boolean;
    variant?: "sidebar" | "floating" | "inset";
  };
  headerConfig?: {
    showBreadcrumb?: boolean;
    showSearch?: boolean;
  };
}

export function SidebarLayout({
  children,
  sidebarConfig = {},
  headerConfig = {},
}: SidebarLayoutProps) {
  const { defaultOpen = true } = sidebarConfig;

  const {
    showBreadcrumb: _showBreadcrumb = true,
    showSearch: _showSearch = true,
  } = headerConfig;

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar />
      <SidebarInset>
        <PageHeaderEnhanced />
        <main
          aria-label="Main content"
          className="flex flex-1 flex-col gap-4 p-4 pt-6"
          id="main-content"
        >
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
