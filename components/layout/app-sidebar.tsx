"use client";

import {
  Bell,
  Clock,
  HelpCircle,
  History,
  Home,
  Pill,
  Settings,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useAnimalFormDialog } from "@/components/forms/animal-form-dialog";
import { useInventoryFormDialog } from "@/components/forms/inventory-form-dialog";
import { NotificationsSidebarItem } from "@/components/notifications/notifications-sidebar-item";
import { HouseholdSwitcher } from "@/components/ui/household-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavDashboard } from "./nav-dashboard";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

// Navigation data for VetMed Tracker with correct /auth prefixes
const data = {
  dashboard: [
    {
      icon: Clock,
      name: "Today's Doses",
      url: "/auth/dashboard",
    },
    {
      icon: Bell,
      name: "Overdue",
      url: "/auth/dashboard?filter=overdue",
    },
    {
      icon: History,
      name: "Recent History",
      url: "/auth/dashboard/history",
    },
  ],
  navMain: [
    {
      icon: Home,
      isActive: true,
      title: "Dashboard",
      url: "/auth/dashboard",
    },
    {
      icon: Users,
      items: [
        {
          title: "Animals",
          url: "/auth/manage/animals",
        },
        {
          title: "Households",
          url: "/auth/manage/households",
        },
        {
          title: "Users",
          url: "/auth/manage/users",
        },
      ],
      title: "Manage",
    },
    {
      icon: Pill,
      items: [
        {
          title: "Record Dose",
          url: "/auth/admin/record",
        },
        {
          title: "Dosage Calculator",
          url: "/auth/medications/dosage-calculator",
        },
        {
          title: "Inventory",
          url: "/auth/medications/inventory",
        },
        {
          title: "Regimens",
          url: "/auth/medications/regimens",
        },
      ],
      title: "Medications",
    },
    {
      icon: TrendingUp,
      items: [
        {
          title: "History",
          url: "/auth/dashboard/history",
        },
        {
          title: "Animal Reports",
          url: "/auth/reports",
        },
      ],
      title: "Insights",
      url: "/auth/insights",
    },
    {
      icon: Settings,
      items: [
        {
          title: "Preferences",
          url: "/auth/settings/preferences",
        },
        {
          title: "Notifications",
          url: "/auth/settings/notifications",
        },
        {
          title: "Data & Privacy",
          url: "/auth/settings/data-privacy",
        },
      ],
      title: "Settings",
      url: "/auth/settings",
    },
  ],
  navSecondary: [
    {
      icon: HelpCircle,
      title: "Support",
      url: "/help", // Public route, no /auth prefix
    },
  ],
};

export function AppSidebar({ ...props }: Parameters<typeof Sidebar>[0]) {
  const { openAnimalForm } = useAnimalFormDialog();
  const { openInventoryForm } = useInventoryFormDialog();

  // Add click handlers for dialog-based actions
  const navMainWithHandlers = data.navMain.map((item) => ({
    ...item,
    items: item.items?.map((subItem) => {
      // Convert "Add Animal" links to use the dialog
      if (subItem.title === "Add Animal") {
        return {
          ...subItem,
          onClick: () => openAnimalForm(),
          url: undefined, // Remove the URL to prevent navigation
        };
      }
      // Convert "Add Item" links to use the dialog
      if (subItem.title === "Add Item") {
        return {
          ...subItem,
          onClick: () => openInventoryForm(),
          url: undefined, // Remove the URL to prevent navigation
        };
      }
      return subItem;
    }),
  }));

  return (
    <Sidebar id="main-navigation" variant="inset" {...props}>
      <SidebarHeader>
        <HouseholdSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavDashboard items={data.dashboard} />
        <NavMain items={navMainWithHandlers} />

        {/* Custom secondary navigation with notifications popover */}
        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Notifications with popover */}
              <SidebarMenuItem>
                <NotificationsSidebarItem />
              </SidebarMenuItem>

              {/* Regular nav items */}
              {data.navSecondary.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild size="sm">
                    <Link className="cursor-pointer" href={item.url as Route}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
