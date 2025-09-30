"use client";

import { useEffect, useRef } from "react";

// Minimal stub for screen reader announcer
export interface ScreenReaderAnnouncerProps {
  message?: string;
  priority?: "polite" | "assertive";
}

export function ScreenReaderAnnouncer({
  message,
  priority = "polite",
}: ScreenReaderAnnouncerProps) {
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (message && announcerRef.current) {
      announcerRef.current.textContent = message;
    }
  }, [message]);

  return (
    <div
      aria-atomic="true"
      aria-live={priority}
      className="sr-only"
      ref={announcerRef}
    />
  );
}

export default ScreenReaderAnnouncer;

// Hook for using screen reader announcements
export function useScreenReaderAnnouncements() {
  const announce = (
    message: string,
    priority: "polite" | "assertive" = "polite",
  ) => {
    // In a full implementation, this would trigger the announcer
    // For now, just log for debugging
    if (process.env.NODE_ENV === "development") {
      console.log(`[SR ${priority}]:`, message);
    }
  };

  return { announce };
}

export interface SkipNavigationProps {
  links?: { href: string; label: string }[];
}

export function SkipNavigation({ links }: SkipNavigationProps = {}) {
  const defaultLinks = links || [
    { href: "#main-content", label: "Skip to main content" },
  ];

  return (
    <>
      {defaultLinks.map((link) => (
        <a
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
          href={link.href}
          key={link.href}
        >
          {link.label}
        </a>
      ))}
    </>
  );
}
