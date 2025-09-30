"use client";

import { useRouter } from "next/navigation";
import React from "react";

import {
  type ShortcutConfig,
  useKeyboardShortcuts,
} from "@/hooks/shared/useKeyboardShortcuts";
import type { DashboardFilters } from "@/lib/dashboard/next-actions";

type ToggleSetter = React.Dispatch<React.SetStateAction<boolean>>;
type FiltersSetter = React.Dispatch<React.SetStateAction<DashboardFilters>>;

type CreateShortcutArgs = {
  router: ReturnType<typeof useRouter>;
  setFilters: FiltersSetter;
  setShowKeyboardShortcuts: ToggleSetter;
};

const createDashboardShortcuts = ({
  router,
  setFilters,
  setShowKeyboardShortcuts,
}: CreateShortcutArgs): ShortcutConfig[] => [
  {
    action: () => {
      const searchInput = document.querySelector(
        '[data-shortcut="Ctrl+/"]',
      ) as HTMLInputElement | null;
      searchInput?.focus();
    },
    description: "Focus search",
    key: "Ctrl+/",
  },
  {
    action: () => router.push("/auth/admin/record" as any),
    description: "Record medication",
    key: "Ctrl+R",
  },
  {
    action: () => router.push("/auth/dashboard/history"),
    description: "View history",
    key: "Ctrl+H",
  },
  {
    action: () => router.push("/auth/insights"),
    description: "View insights",
    key: "Ctrl+I",
  },
  {
    action: () => router.push("/auth/medications/regimens"),
    description: "Add new regimen",
    key: "Ctrl+N",
  },
  {
    action: () => setShowKeyboardShortcuts((open) => !open),
    description: "Show shortcuts",
    key: "Ctrl+Shift+/",
  },
  {
    action: () =>
      setFilters((current) => ({ ...current, showDue: !current.showDue })),
    description: "Toggle due filter",
    key: "d",
  },
  {
    action: () =>
      setFilters((current) => ({
        ...current,
        showOverdue: !current.showOverdue,
      })),
    description: "Toggle overdue filter",
    key: "o",
  },
  {
    action: () =>
      setFilters((current) => ({ ...current, showLater: !current.showLater })),
    description: "Toggle later filter",
    key: "l",
  },
  {
    action: () =>
      setFilters((current) => ({ ...current, showPRN: !current.showPRN })),
    description: "Toggle PRN filter",
    key: "p",
  },
];

export const useDashboardShortcuts = ({
  setFilters,
  setShowKeyboardShortcuts,
  enabled = true,
}: {
  setFilters: FiltersSetter;
  setShowKeyboardShortcuts: ToggleSetter;
  enabled?: boolean;
}) => {
  const router = useRouter();
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts({
    enabled,
    respectInputs: true,
  });

  React.useEffect(() => {
    if (!enabled) return;

    const shortcuts = createDashboardShortcuts({
      router,
      setFilters,
      setShowKeyboardShortcuts,
    });

    shortcuts.forEach((shortcut) => {
      registerShortcut(shortcut);
    });

    return () => {
      shortcuts.forEach(({ key }) => {
        unregisterShortcut(key);
      });
    };
  }, [
    enabled,
    registerShortcut,
    router,
    setFilters,
    setShowKeyboardShortcuts,
    unregisterShortcut,
  ]);
};
