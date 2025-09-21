"use client";

import { FileText, Plus, Syringe } from "lucide-react";
import { useSelectedLayoutSegments } from "next/navigation";
import type React from "react";
import { useAnimalFormDialog } from "@/components/forms/animal-form-dialog";
import { useInventoryFormDialog } from "@/components/forms/inventory-form-dialog";
import { AnimalBreadcrumb } from "@/components/ui/animal-breadcrumb";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Breadcrumbs } from "./breadcrumbs";

interface PageHeaderProps {
  className?: string;
}

interface PageContext {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ className }: PageHeaderProps) {
  const segments = useSelectedLayoutSegments();
  const { openAnimalForm } = useAnimalFormDialog();
  const { openInventoryForm } = useInventoryFormDialog();

  // Filter out route groups
  const filteredSegments = segments.filter(
    (s) => !s.startsWith("(") && !s.endsWith(")"),
  );

  // Page context mappings
  const pageContextMap: Record<string, PageContext | (() => PageContext)> = {
    "admin/record": {
      actions: (
        <Button size="sm" variant="outline">
          <Syringe className="mr-2 h-4 w-4" />
          Quick Record
        </Button>
      ),
      description: "Record a medication dose",
      title: "Record Administration",
    },
    dashboard: {
      description: "Today's medication schedule and overview",
      title: "Dashboard",
    },
    "dashboard/history": {
      description: "View past medication administrations",
      title: "Medication History",
    },
    insights: {
      description: "Medication compliance and patterns",
      title: "Insights",
    },
    "manage/animals": () => ({
      actions: (
        <Button onClick={() => openAnimalForm()} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Animal
        </Button>
      ),
      description: "Add and manage your animals",
      title: "Manage Animals",
    }),
    "manage/animals/emergency": {
      description: "Critical care information for this animal",
      title: "Emergency Information",
    },
    "manage/households": {
      description: "Manage household members and settings",
      title: "Manage Households",
    },
    "manage/users": {
      description: "Manage user roles and permissions",
      title: "Manage Users",
    },
    "medications/inventory": () => ({
      actions: (
        <Button onClick={() => openInventoryForm()} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      ),
      description: "Track your medication stock",
      title: "Medication Inventory",
    }),
    "medications/regimens": {
      actions: (
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          New Regimen
        </Button>
      ),
      description: "Manage medication schedules",
      title: "Medication Regimens",
    },
    reports: {
      actions: (
        <Button size="sm" variant="outline">
          <FileText className="mr-2 h-4 w-4" />
          Export
        </Button>
      ),
      description:
        "Select an animal to view their medication compliance report",
      title: "Reports",
    },
    settings: {
      description: "Manage your account and preferences",
      title: "Settings",
    },
    "settings/data-privacy": {
      description: "Export your data and manage privacy settings",
      title: "Data & Privacy",
    },
    "settings/data-privacy/audit": {
      description: "View system activity and changes",
      title: "Audit Log",
    },
    "settings/notifications": {
      description: "Configure alerts and notification preferences",
      title: "Notifications",
    },
    "settings/preferences": {
      description: "Customize your app experience and display settings",
      title: "Preferences",
    },
  };

  // Determine page context based on segments
  const getPageContext = (): PageContext => {
    // Try exact match first
    const fullPath = filteredSegments.join("/");
    const exactMatch = pageContextMap[fullPath];
    if (exactMatch) {
      return typeof exactMatch === "function" ? exactMatch() : exactMatch;
    }

    // Try partial matches
    for (let i = filteredSegments.length - 1; i >= 0; i--) {
      const partialPath = filteredSegments.slice(0, i + 1).join("/");
      const partialMatch = pageContextMap[partialPath];
      if (partialMatch) {
        return typeof partialMatch === "function"
          ? partialMatch()
          : partialMatch;
      }
    }

    // Default
    return {};
  };

  const context = getPageContext();
  const showBreadcrumbs =
    filteredSegments.length > 0 &&
    !(filteredSegments.length === 1 && filteredSegments[0] === "dashboard");

  return (
    <header className={`shrink-0 border-b ${className || ""}`}>
      <div className="flex h-16 items-center gap-2 px-4">
        <div className="flex items-center gap-2">
          <SidebarTrigger className="-ml-1" />
          <Separator className="mr-2 h-4" orientation="vertical" />
          <AnimalBreadcrumb />
        </div>
        <div className="ml-auto flex items-center gap-4">
          {context.actions}
          <Logo size="sm" />
        </div>
      </div>

      {(showBreadcrumbs || context.title) && (
        <div className="border-t bg-muted/40 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              {showBreadcrumbs && <Breadcrumbs />}
              {context.title && (
                <div className="mt-2">
                  <h1 className="font-semibold text-2xl tracking-tight">
                    {context.title}
                  </h1>
                  {context.description && (
                    <p className="text-muted-foreground text-sm">
                      {context.description}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
