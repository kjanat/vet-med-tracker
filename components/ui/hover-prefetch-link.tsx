"use client";

import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils/general";

interface HoverPrefetchLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  prefetch?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export function HoverPrefetchLink({
  href,
  children,
  className,
  prefetch = true,
  onMouseEnter,
  onMouseLeave,
}: HoverPrefetchLinkProps) {
  const [isPrefetched, setIsPrefetched] = React.useState(false);

  const handleMouseEnter = React.useCallback(() => {
    if (!isPrefetched && prefetch) {
      // Trigger prefetch on hover
      setIsPrefetched(true);
    }
    onMouseEnter?.();
  }, [isPrefetched, prefetch, onMouseEnter]);

  const handleMouseLeave = React.useCallback(() => {
    onMouseLeave?.();
  }, [onMouseLeave]);

  return (
    <Link
      className={cn("transition-colors hover:text-foreground", className)}
      href={href}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      prefetch={isPrefetched}
    >
      {children}
    </Link>
  );
}
