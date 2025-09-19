"use client";

import {
  Home,
  History,
  Package,
  TrendingUp,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed right-0 bottom-0 left-0 z-50 border-t bg-background/95 pb-safe shadow-lg backdrop-blur-md supports-backdrop-filter:bg-background/80"
    >
      <div className="flex">
        {mobileNavItems.map((item) => {
          // Consider nested routes active (e.g., /auth/settings/profile for /auth/settings)
          const isActive =
            item.path === "/auth/dashboard"
              ? pathname === "/auth/dashboard"
              : pathname === item.path || pathname.startsWith(`${item.path}/`);

          const Icon = item.icon as LucideIcon;

          return (
            <Link
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 py-3 font-medium text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              href={item.path}
              key={item.path}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              {item.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
