"use client";

import type { LucideIcon } from "lucide-react";
import { History, Home, Package, Settings, TrendingUp } from "lucide-react";
import type { Route } from "next";
import { usePathname } from "next/navigation";

import { BottomNavItem } from "@/components/ui/active-link";

type MobileNavItem = {
  icon: LucideIcon;
  href: Route;
  label: string;
};

// Mobile navigation items with correct /auth prefixes
const mobileNavItems: MobileNavItem[] = [
  { href: "/auth/dashboard", icon: Home, label: "Home" },
  { href: "/auth/dashboard/history", icon: History, label: "History" },
  {
    href: "/auth/medications/inventory",
    icon: Package,
    label: "Inventory",
  },
  { href: "/auth/insights", icon: TrendingUp, label: "Insights" },
  { href: "/auth/settings", icon: Settings, label: "Settings" },
];

export function BottomNav(currentPathname: string = usePathname()) {
  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed right-0 bottom-0 left-0 z-50 border-t bg-background/95 pb-safe shadow-lg backdrop-blur-md supports-backdrop-filter:bg-background/80"
    >
      <div className="flex">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;

          return (
            <BottomNavItem
              href={item.href}
              isActive={
                item.href === "/auth/dashboard"
                  ? (pathname) => pathname === currentPathname
                  : undefined
              }
              // Special handling for dashboard root
              key={item.href}
            >
              <Icon aria-hidden="true" className="h-5 w-5" />
              {item.label}
            </BottomNavItem>
          );
        })}
      </div>
    </nav>
  );
}
