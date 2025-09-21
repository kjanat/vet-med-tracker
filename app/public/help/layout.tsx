import type React from "react";
import { StaticPublicShell } from "@/components/layout/static-public-shell";

export default function HelpMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StaticPublicShell>{children}</StaticPublicShell>;
}
