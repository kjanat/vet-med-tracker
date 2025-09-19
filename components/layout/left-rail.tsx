"use client";

import {
  Home,
  History,
  Package,
  TrendingUp,
  Settings,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/general";

// Mobile navigation items with correct /auth prefixes
const mobileNavItems = [
  { icon: Home, path: "/auth/dashboard" as Route, title: "Home" },
  { icon: History, path: "/auth/dashboard/history" as Route, title: "History" },
  { icon: Package, path: "/auth/medications/inventory" as Route, title: "Inventory" },
  { icon: TrendingUp, path: "/auth/insights" as Route, title: "Insights" },
  { icon: Settings, path: "/auth/settings" as Route, title: "Settings" },
];

export function LeftRail() {
  const pathname = usePathname();

  return (
    <div className="w-64 border-r bg-muted/10">
      <div className="p-6">
        <h1 className="font-bold text-xl">VetMed Tracker</h1>
      </div>

      <nav className="px-3">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.path;
          const IconComponent = item.icon;

          return (
            <Link
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
              href={item.path}
              key={item.title}
            >
              <IconComponent className="h-4 w-4" />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
