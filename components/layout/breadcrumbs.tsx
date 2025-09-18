"use client";

import { Home } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import React from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function Breadcrumbs() {
  const segments = useSelectedLayoutSegments();

  // Filter out route groups (segments with parentheses) and build breadcrumb data
  const filteredSegments = segments.filter(
    (segment) => !segment.startsWith("(") && !segment.endsWith(")"),
  );

  // Map segments to readable labels
  const segmentLabels: Record<string, string> = {
    admin: "Admin",
    animal: "Animal Report",
    animals: "Animals",
    audit: "Audit Log",
    dashboard: "Dashboard",
    emergency: "Emergency Info",
    help: "Help",
    history: "History",
    households: "Households",
    insights: "Insights",
    inventory: "Inventory",
    manage: "Manage",
    medications: "Medications",
    record: "Record Dose",
    regimens: "Regimens",
    reports: "Reports",
    settings: "Settings",
    users: "Users",
  };

  // Build breadcrumb items with proper href
  const breadcrumbs = filteredSegments.map((segment, index) => {
    const href = `/${filteredSegments.slice(0, index + 1).join("/")}` as Route;
    const label =
      segmentLabels[segment] ||
      segment.charAt(0).toUpperCase() + segment.slice(1);

    return { href, label, segment };
  });

  // Don't show breadcrumbs if we're on the dashboard root
  if (
    filteredSegments.length === 0 ||
    (filteredSegments.length === 1 && filteredSegments[0] === "dashboard")
  ) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link className="flex items-center" href="/auth/dashboard">
              <Home className="h-4 w-4" />
              <span className="sr-only">Home</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.segment}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {index === breadcrumbs.length - 1 ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
