export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout exists to enable useSelectedLayoutSegment in navigation
  // for the reports section
  return <>{children}</>;
}
