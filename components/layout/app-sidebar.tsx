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
import { HouseholdSwitcher } from "../ui/household-switcher";
import { NavDashboard } from "./nav-dashboard";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

// Navigation data for VetMed Tracker
const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: Home,
      isActive: true,
    },
    {
      title: "Manage",
      icon: Users,
      items: [
        {
          title: "Animals",
          url: "/manage/animals",
        },
        {
          title: "Households",
          url: "/manage/households",
        },
        {
          title: "Users",
          url: "/manage/users",
        },
      ],
    },
    {
      title: "Medications",
      icon: Pill,
      items: [
        {
          title: "Record Dose",
          url: "/admin/record",
        },
        {
          title: "Dosage Calculator",
          url: "/medications/dosage-calculator",
        },
        {
          title: "Inventory",
          url: "/medications/inventory",
        },
        {
          title: "Regimens",
          url: "/medications/regimens",
        },
      ],
    },
    {
      title: "Insights",
      url: "/insights",
      icon: TrendingUp,
      items: [
        {
          title: "History",
          url: "/dashboard/history",
        },
        {
          title: "Animal Reports",
          url: "/reports",
        },
      ],
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings,
      items: [
        {
          title: "Preferences",
          url: "/settings/preferences",
        },
        {
          title: "Notifications",
          url: "/settings/notifications",
        },
        {
          title: "Data & Privacy",
          url: "/settings/data-privacy",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "/help",
      icon: HelpCircle,
    },
  ],
  dashboard: [
    {
      name: "Today's Doses",
      url: "/dashboard",
      icon: Clock,
    },
    {
      name: "Overdue",
      url: "/dashboard?filter=overdue",
      icon: Bell,
    },
    {
      name: "Recent History",
      url: "/dashboard/history",
      icon: History,
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
                    <Link href={item.url as Route} className="cursor-pointer">
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
