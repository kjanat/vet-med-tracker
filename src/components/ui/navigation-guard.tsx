"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface NavigationGuardProps {
  when: boolean;
  message?: string;
  children: React.ReactNode;
}

export function NavigationGuard({
  when,
  message = "You have unsaved changes. Are you sure you want to leave?",
  children,
}: NavigationGuardProps) {
  const router = useRouter();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (when) {
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    if (when) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [when, message]);

  // For Next.js router navigation, we would need additional handling
  // This is a simplified version
  useEffect(() => {
    if (when) {
      // Store original router methods
      const originalPush = router.push;
      const originalReplace = router.replace;

      // Override router methods to show confirmation
      router.push = ((href: string, options?: unknown) => {
        if (window.confirm(message)) {
          return originalPush.call(
            router,
            href as Parameters<typeof originalPush>[0],
            options as Parameters<typeof originalPush>[1],
          );
        }
        return Promise.resolve(false);
      }) as AppRouterInstance["push"];

      router.replace = ((href: string, options?: unknown) => {
        if (window.confirm(message)) {
          return originalReplace.call(
            router,
            href as Parameters<typeof originalReplace>[0],
            options as Parameters<typeof originalReplace>[1],
          );
        }
        return Promise.resolve(false);
      }) as AppRouterInstance["replace"];

      return () => {
        // Restore original methods
        router.push = originalPush;
        router.replace = originalReplace;
      };
    }
  }, [when, message, router]);

  return <>{children}</>;
}
