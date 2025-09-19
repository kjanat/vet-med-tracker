import type React from "react";
import { AppProviders } from "@/components/providers/app-providers";

export default function MainLayoutNew({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppProviders>{children}</AppProviders>;
}
