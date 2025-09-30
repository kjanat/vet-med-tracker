"use client";

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
      router.push = (href: any, options?: any) => {
        if (window.confirm(message)) {
          return originalPush.call(router, href, options);
        }
        return Promise.resolve(false);
      };

      router.replace = (href: any, options?: any) => {
        if (window.confirm(message)) {
          return originalReplace.call(router, href, options);
        }
        return Promise.resolve(false);
      };

      return () => {
        // Restore original methods
        router.push = originalPush;
        router.replace = originalReplace;
      };
    }
  }, [when, message, router]);

  return <>{children}</>;
}
