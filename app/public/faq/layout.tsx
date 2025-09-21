import type React from "react";
import { StaticPublicShell } from "@/components/layout/static-public-shell";

export default function FAQMarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StaticPublicShell>{children}</StaticPublicShell>;
}
