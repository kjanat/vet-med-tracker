"use client";

import { useGlobalKeyboardShortcuts } from "@/hooks/shared/useKeyboardShortcuts";

/**
 * Global keyboard shortcuts component
 *
 * This component registers global keyboard shortcuts for navigation and actions.
 * It should be placed high in the component tree to ensure shortcuts work throughout the application.
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <div>
 *       <GlobalKeyboardShortcuts />
 *       {children}
 *     </div>
 *   );
 * }
 * ```
 */
export function GlobalKeyboardShortcuts() {
  // This hook automatically registers all global keyboard shortcuts
  useGlobalKeyboardShortcuts({
    enabled: true,
    respectInputs: true,
  });

  // This component doesn't render anything - it just manages shortcuts
  return null;
}
