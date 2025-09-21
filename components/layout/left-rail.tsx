"use client";

import { History, Home, Package, Settings, TrendingUp } from "lucide-react";
import type { Route } from "next";
import { NavButton } from "@/components/ui/active-link";

// Mobile navigation items with correct /auth prefixes
const mobileNavItems = [
  { icon: Home, path: "/auth/dashboard", title: "Home" },
  { icon: History, path: "/auth/dashboard/history", title: "History" },
  {
    icon: Package,
    path: "/auth/medications/inventory",
    title: "Inventory",
  },
  { icon: TrendingUp, path: "/auth/insights", title: "Insights" },
  { icon: Settings, path: "/auth/settings", title: "Settings" },
];

export function LeftRail() {
  return (
    <div className="w-64 border-r bg-muted/10">
      <div className="p-6">
        <h1 className="font-bold text-xl">VetMed Tracker</h1>
      </div>

      <nav className="px-3">
        {mobileNavItems.map((item) => {
          const IconComponent = item.icon;

          return (
            <NavButton exact href={item.path as Route} key={item.title}>
              <IconComponent className="h-4 w-4" />
              {item.title}
            </NavButton>
          );
        })}
      </nav>
    </div>
  );
}
