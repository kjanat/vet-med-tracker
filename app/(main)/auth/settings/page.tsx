"use client";

import type { LucideIcon } from "lucide-react";
import { Bell, Database, Settings2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useApp } from "@/components/providers/app-provider-consolidated";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type SettingsTab = {
  title: string;
  description: string;
  icon: LucideIcon;
  path: Route;
};

// Settings tabs with correct /auth prefixes
const settingsTabs: SettingsTab[] = [
  {
    title: "Data & Privacy",
    description: "Export your data and manage privacy settings",
    icon: Database,
    path: "/auth/settings/data-privacy",
  },
  {
    title: "Notifications",
    description: "Configure alerts and notification preferences",
    icon: Bell,
    path: "/auth/settings/notifications",
  },
  {
    title: "Preferences",
    description: "Customize your app experience and display settings",
    icon: Settings2,
    path: "/auth/settings/preferences",
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
