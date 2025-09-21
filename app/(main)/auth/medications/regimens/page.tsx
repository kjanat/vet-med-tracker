"use client";

import { Suspense } from "react";
import { RegimenFormDialog } from "@/components/forms/regimen-form-dialog";
import { RegimenList } from "@/components/regimens/regimen-list";

function RegimensContent() {
  return (
    <div className="space-y-6">
      {/* Main content */}
      <RegimenList />
      <RegimenFormDialog />
    </div>
  );
}

export default function RegimensPage() {
  return (
    <Suspense
      fallback={<div className="min-h-screen animate-pulse bg-background" />}
    >
      <RegimensContent />
    </Suspense>
  );
}
