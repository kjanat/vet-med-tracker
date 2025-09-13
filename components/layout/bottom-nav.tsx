"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationConfig } from "@/lib/navigation/config";
import { cn } from "@/lib/utils/general";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Bottom navigation"
      className="fixed right-0 bottom-0 left-0 z-50 border-t bg-background/95 pb-safe shadow-lg backdrop-blur-md supports-backdrop-filter:bg-background/80"
    >
      <div className="flex">
        {navigationConfig.mobile.map((item) => {
          // Skip items without a URL path (e.g., dialog-only actions)
          if (!item.path) return null;

          // Consider nested routes active (e.g., /settings/profile for /settings)
          const isActive =
            item.path === "/"
              ? pathname === "/"
              : pathname === item.path || pathname.startsWith(`${item.path}/`);

          // Only render the icon if it is a valid component (not a string)
          const Icon =
            item.icon && typeof item.icon !== "string"
              ? (item.icon as LucideIcon)
              : undefined;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 py-3 font-medium text-xs transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              {Icon ? <Icon aria-hidden="true" className="h-5 w-5" /> : null}
              {item.title}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
