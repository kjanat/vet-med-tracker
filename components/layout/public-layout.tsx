/**
 * Public Layout Component - Strategy Pattern Implementation
 *
 * Clean public layout without authentication requirements
 */

"use client";

import type { ReactNode } from "react";
import { AnimatedBackground } from "@/components/landing/primitives/animated-background";
import { PublicFooter } from "./public-footer";
import { PublicHeader } from "./public-header";

export interface PublicLayoutProps {
  children: ReactNode;
  backgroundVariant?: "default" | "subtle" | "none";
  showFooter?: boolean;
  showHeader?: boolean;
}

export function PublicLayout({
  children,
  backgroundVariant = "default",
  showFooter = true,
  showHeader = true,
}: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {showHeader && <PublicHeader />}

      <main
        aria-label="Main content"
        className="relative flex-1"
        id="main-content"
      >
        {/* Conditional animated background */}
        {backgroundVariant !== "none" && (
          <AnimatedBackground variant={backgroundVariant} />
        )}

        <div
          className={`relative z-10 ${""}
        `}
        >
          {children}
        </div>
      </main>

      {showFooter && <PublicFooter />}
    </div>
  );
}
