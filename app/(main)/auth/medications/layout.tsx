import type React from "react";

export default function MedicationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout exists to enable useSelectedLayoutSegment in navigation
  // for the medications section (inventory, regimens)
  return <>{children}</>;
}
