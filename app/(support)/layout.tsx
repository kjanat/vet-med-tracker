import type React from "react";
import { StaticPublicShell } from "@/components/layout/static-public-shell";

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <StaticPublicShell>{children}</StaticPublicShell>;
}
