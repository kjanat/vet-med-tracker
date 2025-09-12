"use client";

import { Suspense } from "react";
import { PrefsPanel } from "@/components/settings/preferences/prefs-panel";

function PreferencesContent() {
  return (
    <div className="space-y-6">
      <PrefsPanel />
    </div>
  );
}

export default function PreferencesPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen animate-pulse bg-background" />}
    >
      <PreferencesContent />
    </Suspense>
  );
}
