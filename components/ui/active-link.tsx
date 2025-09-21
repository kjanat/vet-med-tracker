"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { cn } from "@/lib/utils/general";

interface ActiveLinkProps
  extends Omit<React.ComponentProps<typeof Link>, "href"> {
  href: Route;
  children: React.ReactNode;
  /** Custom active class name */
  activeClassName?: string;
  /** Custom inactive class name */
  inactiveClassName?: string;
  /** Exact match only (default: false for nested route matching) */
  exact?: boolean;
  /** Custom match function */
  isActive?: (pathname: string, href: string) => boolean;
}

/**
 * Link component with automatic active state detection
 * Supports exact matching and nested route highlighting
 */
export function ActiveLink({
  href,
  children,
  className = "",
  activeClassName = "text-primary bg-primary/10",
  inactiveClassName = "text-muted-foreground hover:text-foreground hover:bg-accent",
  exact = false,
  isActive: customIsActive,
  ...props
}: ActiveLinkProps) {
  const pathname = usePathname();
  const hrefString = typeof href === "string" ? href : "";

  // Determine if link is active
  const isLinkActive = React.useMemo(() => {
    if (customIsActive) {
      return customIsActive(pathname, hrefString);
    }

    if (exact) {
      return pathname === hrefString;
    }

    // Special handling for dashboard root
    if (hrefString === "/auth/dashboard") {
      return pathname === "/auth/dashboard";
    }

    // Nested route matching
    return pathname === hrefString || pathname.startsWith(`${hrefString}/`);
  }, [pathname, hrefString, exact, customIsActive]);

  return (
    <Link
      aria-current={isLinkActive ? "page" : undefined}
      className={cn(
        className,
        isLinkActive ? activeClassName : inactiveClassName,
      )}
      href={href}
      {...props}
    >
      {children}
    </Link>
  );
}

/**
 * Navigation button with active state for sidebar/navigation
 */
export function NavButton({
  href,
  children,
  className = "",
  exact = false,
  ...props
}: ActiveLinkProps) {
  return (
    <ActiveLink
      activeClassName="bg-primary text-primary-foreground"
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 font-medium text-sm transition-colors",
        className,
      )}
      exact={exact}
      href={href}
      inactiveClassName="text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      {...props}
    >
      {children}
    </ActiveLink>
  );
}

/**
 * Bottom navigation item with active state
 */
export function BottomNavItem({
  href,
  children,
  className = "",
  ...props
}: ActiveLinkProps) {
  return (
    <ActiveLink
      activeClassName="text-primary"
      className={cn(
        "flex min-h-[44px] flex-1 flex-col items-center justify-center gap-1 py-3 font-medium text-xs transition-colors",
        className,
      )}
      href={href}
      inactiveClassName="text-muted-foreground hover:text-foreground"
      {...props}
    >
      {children}
    </ActiveLink>
  );
}

/**
 * Tab-style navigation with active state
 */
export function TabNavItem({
  href,
  children,
  className = "",
  ...props
}: ActiveLinkProps) {
  return (
    <ActiveLink
      activeClassName="border-primary text-primary"
      className={cn(
        "border-b-2 px-4 py-2 font-medium text-sm transition-colors",
        className,
      )}
      exact={true}
      href={href}
      inactiveClassName="border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
      {...props}
    >
      {children}
    </ActiveLink>
  );
}
