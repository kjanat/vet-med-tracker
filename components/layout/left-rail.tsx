"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationConfig } from "@/lib/navigation/config";
import { cn } from "@/lib/utils/general";

export function LeftRail() {
  const pathname = usePathname();

  return (
    <div className="w-64 border-r bg-muted/10">
      <div className="p-6">
        <h1 className="font-bold text-xl">VetMed Tracker</h1>
      </div>

      <nav className="px-3">
        {navigationConfig.mobile.map((item) => {
          const isActive = pathname === item.path;
          const IconComponent = item.icon;

          // Skip items without paths
          if (!item.path) return null;

          return (
            <Link
              key={item.title}
              href={item.path}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {IconComponent && typeof IconComponent !== "string" && (
                <IconComponent className="h-4 w-4" />
              )}
              {item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
