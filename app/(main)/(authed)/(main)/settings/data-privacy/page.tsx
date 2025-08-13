"use client";

import { Suspense } from "react";
import { DataPanel } from "@/components/settings/data/data-panel";

function DataPrivacyContent() {
  return (
    <div className="space-y-6">
      <DataPanel />
    </div>
  );
}

export default function DataPrivacyPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen animate-pulse bg-background" />}
    >
      <DataPrivacyContent />
    </Suspense>
  );
}
