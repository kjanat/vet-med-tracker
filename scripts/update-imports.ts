#!/usr/bin/env tsx

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { glob } from "glob";

// Mapping of old imports to new imports
const importMappings: Record<string, string> = {
  // Inventory hooks
  "@/hooks/useDaysOfSupply": "@/hooks/inventory/useDaysOfSupply",
  "@/hooks/useBarcodeScanner": "@/hooks/inventory/useBarcodeScanner",

  // History hooks
  "@/hooks/useHistoryFilters": "@/hooks/history/useHistoryFilters",

  // Insights hooks
  "@/hooks/useInsightsFilters": "@/hooks/insights/useInsightsFilters",

  // Admin hooks
  "@/hooks/useRecordParams": "@/hooks/admin/useRecordParams",

  // Settings hooks
  "@/hooks/useSettingsTabs": "@/hooks/settings/useSettingsTabs",

  // Offline hooks
  "@/hooks/useOfflineQueue": "@/hooks/offline/useOfflineQueue",
  "@/hooks/useBackgroundSync": "@/hooks/offline/useBackgroundSync",

  // Shared hooks
  "@/hooks/use-mobile": "@/hooks/shared/use-mobile",
  "@/hooks/useMediaQuery": "@/hooks/shared/useMediaQuery",
  "@/hooks/use-navigation-guard": "@/hooks/shared/use-navigation-guard",
  "@/hooks/use-toast": "@/hooks/shared/use-toast",
  "@/hooks/useTypedSearchParams": "@/hooks/shared/useTypedSearchParams",
  "@/hooks/use-user-preferences": "@/hooks/shared/use-user-preferences",
  "@/hooks/useProgressiveData": "@/hooks/shared/useProgressiveData",

  // Lib utils
  "@/lib/animation-config": "@/lib/utils/animation-config",
  "@/lib/avatar-utils": "@/lib/utils/avatar-utils",
  "@/lib/keyboard-shortcuts": "@/lib/utils/keyboard-shortcuts",
  "@/lib/search-params": "@/lib/utils/search-params",
  "@/lib/status-config": "@/lib/utils/status-config",
  "@/lib/types": "@/lib/utils/types",
  "@/lib/utils": "@/lib/utils/general",

  // Infrastructure
  "@/lib/circuit-breaker": "@/lib/infrastructure/circuit-breaker",
  "@/lib/connection-middleware": "@/lib/infrastructure/connection-middleware",
  "@/lib/connection-queue": "@/lib/infrastructure/connection-queue",
  "@/lib/db-monitoring": "@/lib/infrastructure/db-monitoring",
  "@/lib/error-handling": "@/lib/infrastructure/error-handling",
  "@/lib/error-reporting": "@/lib/infrastructure/error-reporting",
  "@/lib/rate-limiting": "@/lib/infrastructure/rate-limiting",
  "@/lib/lazy-load": "@/lib/infrastructure/lazy-load",

  // Health
  "@/lib/health/checks": "@/lib/infrastructure/health/checks",

  // Validation
  "@/lib/validation/enhanced-schemas":
    "@/lib/infrastructure/validation/enhanced-schemas",
  "@/lib/validation/sanitizer": "@/lib/infrastructure/validation/sanitizer",
};

async function updateImports() {
  const files = await glob("**/*.{ts,tsx}", {
    ignore: ["node_modules/**", ".next/**", "scripts/update-imports.ts"],
    cwd: process.cwd(),
  });

  let updatedCount = 0;
  const updatedFiles: string[] = [];

  for (const file of files) {
    const filePath = path.join(process.cwd(), file);
    let content = readFileSync(filePath, "utf-8");
    let modified = false;

    for (const [oldImport, newImport] of Object.entries(importMappings)) {
      // Match both single and double quotes
      const patterns = [
        new RegExp(`from ['"]${oldImport}['"]`, "g"),
        new RegExp(`import\\(['"]${oldImport}['"]\\)`, "g"),
      ];

      for (const pattern of patterns) {
        if (pattern.test(content)) {
          content = content.replace(pattern, (match) => {
            return match.replace(oldImport, newImport);
          });
          modified = true;
        }
      }
    }

    if (modified) {
      writeFileSync(filePath, content);
      updatedCount++;
      updatedFiles.push(file);
    }
  }

  console.log(`✅ Updated ${updatedCount} files:`);
  updatedFiles.forEach((file) => console.log(`  - ${file}`));
}

updateImports().catch(console.error);
