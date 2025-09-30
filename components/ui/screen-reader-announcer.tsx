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
