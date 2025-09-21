"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function GlobalLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // Check if we're on a /dev route
  const isDevRoute = pathname?.startsWith("/dev");

  // For dev routes, use simple layout
  if (isDevRoute) {
    return (
      <div className="min-h-screen bg-background">
        <main className="min-h-screen">{children}</main>
      </div>
    );
  }

  return <div className="min-h-screen bg-background">{children}</div>;
}
