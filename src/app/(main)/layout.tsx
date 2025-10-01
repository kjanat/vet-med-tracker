import type React from "react";
import { ConsolidatedAppProvider } from "@/components/providers/app-provider-consolidated";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ConsolidatedAppProvider>{children}</ConsolidatedAppProvider>;
}
