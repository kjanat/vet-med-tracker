import {
  BarChart3,
  Bell,
  Building2,
  Clock,
  Database,
  Dog,
  FileText,
  HelpCircle,
  History,
  Home,
  Package,
  Pill,
  Settings,
  Settings2,
  Syringe,
  TrendingUp,
  Users,
} from "lucide-react";
import type { Route } from "next";
import type { NavigationConfig, NavigationItem } from "./types";

/**
 * Centralized navigation configuration for the entire application.
 * This is the single source of truth for all navigation elements.
 */
export const navigationConfig: NavigationConfig = {
  dashboard: [
    {
      icon: Clock,
      path: "/dashboard" as Route,
      title: "Today's Doses",
    },
    {
      icon: Bell,
      path: "/dashboard?filter=overdue" as Route,
      title: "Overdue",
    },
    {
      icon: History,
      path: "/dashboard/history" as Route,
      title: "Recent History",
    },
  ],
  main: {
    dashboard: {
      children: {
        history: {
          description: "View past medication administrations",
          icon: History,
          path: "/dashboard/history" as Route,
          title: "Medication History",
        },
      },
      description: "Today's medication schedule and overview",
      icon: Home,
      isActive: true,
      path: "/dashboard" as Route,
      title: "Dashboard",
    },
    insights: {
      children: {
        history: {
          description: "View medication history",
          icon: History,
          path: "/dashboard/history" as Route,
          title: "History",
        },
        reports: {
          description: "Detailed compliance reports by animal",
          icon: FileText,
          path: "/reports" as Route,
          title: "Animal Reports",
        },
      },
      description: "Medication compliance and patterns",
      icon: TrendingUp,
      path: "/insights" as Route,
      title: "Insights",
    },
    manage: {
      children: {
        animals: {
          description: "Add, edit, and manage your animals' profiles",
          icon: Dog,
          path: "/manage/animals" as Route,
          title: "Animals",
        },
        households: {
          description: "Manage your households and their members",
          icon: Building2,
          path: "/manage/households" as Route,
          title: "Households",
        },
        users: {
          description: "Manage household members and their roles",
          icon: Users,
          path: "/manage/users" as Route,
          title: "Users",
        },
      },
      description: "Manage your households, animals, and team members",
      icon: Users,
      title: "Manage",
    },
    medications: {
      children: {
        inventory: {
          description: "Track your medication stock",
          icon: Package,
          path: "/medications/inventory" as Route,
          title: "Inventory",
        },
        record: {
          description: "Record a medication dose",
          icon: Syringe,
          path: "/admin/record" as Route,
          title: "Record Dose",
        },
        regimens: {
          description: "Manage medication schedules",
          icon: Clock,
          path: "/medications/regimens" as Route,
          title: "Regimens",
        },
      },
      description: "Record doses and manage medications",
      icon: Pill,
      title: "Medications",
    },
    settings: {
      children: {
        dataPrivacy: {
          description: "Export your data and manage privacy settings",
          icon: Database,
          path: "/settings/data-privacy" as Route,
          title: "Data & Privacy",
        },
        notifications: {
          description: "Configure alerts and notification preferences",
          icon: Bell,
          path: "/settings/notifications" as Route,
          title: "Notifications",
        },
        preferences: {
          description: "Customize your app experience and display settings",
          icon: Settings2,
          path: "/settings/preferences" as Route,
          title: "Preferences",
        },
      },
      description: "Manage your account and application settings",
      icon: Settings,
      path: "/settings" as Route,
      title: "Settings",
    },
  },
  mobile: [
    {
      icon: Home,
      path: "/" as Route,
      title: "Home",
    },
    {
      icon: History,
      path: "/dashboard/history" as Route,
      title: "History",
    },
    {
      icon: Package,
      path: "/medications/inventory" as Route,
      title: "Inventory",
    },
    {
      icon: BarChart3,
      path: "/insights" as Route,
      title: "Insights",
    },
    {
      icon: Settings,
      path: "/settings" as Route,
      title: "Settings",
    },
  ],
  secondary: [
    {
      description: "Get help and support",
      icon: HelpCircle,
      path: "/help" as Route,
      title: "Support",
    },
  ],
};

/**
 * Page metadata for enhanced page headers and breadcrumbs
 * Maps route paths to their metadata
 */
export const pageMetadata: Record<string, Partial<NavigationItem>> = {
  "/admin/record": {
    description: "Record a medication dose",
    title: "Record Administration",
  },
  "/dashboard": {
    description: "Today's medication schedule and overview",
    title: "Dashboard",
  },
  "/dashboard/history": {
    description: "View past medication administrations",
    title: "Medication History",
  },
  "/insights": {
    description: "Medication compliance and patterns",
    title: "Insights",
  },
  "/manage": {
    description: "Manage your households, animals, and team members",
    title: "Manage",
  },
  "/manage/animals": {
    description: "Add and manage your animals",
    title: "Manage Animals",
  },
  "/manage/animals/emergency": {
    description: "Critical care information for this animal",
    title: "Emergency Information",
  },
  "/manage/households": {
    description: "Manage your households and their members",
    title: "Manage Households",
  },
  "/manage/users": {
    description: "Manage user roles and permissions",
    title: "Manage Users",
  },
  "/medications/inventory": {
    description: "Track your medication stock",
    title: "Medication Inventory",
  },
  "/medications/regimens": {
    description: "Manage medication schedules",
    title: "Medication Regimens",
  },
  "/reports": {
    description: "Select an animal to view their medication compliance report",
    title: "Reports",
  },
  "/settings": {
    description: "Manage your account and preferences",
    title: "Settings",
  },
  "/settings/data-privacy": {
    description: "Export your data and manage privacy settings",
    title: "Data & Privacy",
  },
  "/settings/data-privacy/audit": {
    description: "View system activity and changes",
    title: "Audit Log",
  },
  "/settings/notifications": {
    description: "Configure alerts and notification preferences",
    title: "Notifications",
  },
  "/settings/preferences": {
    description: "Customize your app experience and display settings",
    title: "Preferences",
  },
};

/**
 * Get all valid settings tabs from the navigation config
 */
export const settingsTabs = Object.keys(
  navigationConfig.main.settings?.children || {},
);

/**
 * Get all valid manage sections from the navigation config
 */
export const manageSections = Object.keys(
  navigationConfig.main.manage?.children || {},
);
