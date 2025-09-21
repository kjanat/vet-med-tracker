import type React from "react";
import { StaticPublicShell } from "@/components/layout/static-public-shell";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StaticPublicShell>{children}</StaticPublicShell>;
}
