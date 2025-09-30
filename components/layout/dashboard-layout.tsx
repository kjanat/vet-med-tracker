"use client";

import { cn } from "@/lib/utils/general";

interface DashboardLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
  className?: string;
}

export function DashboardLayout({
  children,
  sidebar,
  header,
  className,
}: DashboardLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-background", className)}>
      {header && (
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {header}
        </header>
      )}
      <div className="flex">
        {sidebar && (
          <aside className="w-64 border-r bg-muted/40">{sidebar}</aside>
        )}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
