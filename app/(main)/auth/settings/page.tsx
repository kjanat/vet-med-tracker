"use client";

import {
  Database,
  Bell,
  Settings2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useApp } from "@/components/providers/app-provider-consolidated";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Settings tabs with correct /auth prefixes
const settingsTabs = [
  {
    title: "Data & Privacy",
    description: "Export your data and manage privacy settings",
    icon: Database,
    path: "/auth/settings/data-privacy" as Route,
  },
  {
    title: "Notifications",
    description: "Configure alerts and notification preferences",
    icon: Bell,
    path: "/auth/settings/notifications" as Route,
  },
  {
    title: "Preferences",
    description: "Customize your app experience and display settings",
    icon: Settings2,
    path: "/auth/settings/preferences" as Route,
  },
];

export default function SettingsPage() {
  const { selectedHousehold } = useApp();

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Manage your account and application settings
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        {settingsTabs.map((tab) => {
          const Icon = tab.icon as LucideIcon;

          return (
            <Link href={tab.path} key={tab.path}>
              <Card className="h-full transition-colors hover:bg-accent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {tab.title}
                  </CardTitle>
                  <CardDescription>{tab.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>

      {!selectedHousehold && (
        <p className="text-center text-muted-foreground text-sm">
          Select a household to manage household-specific settings
        </p>
      )}
    </div>
  );
}
