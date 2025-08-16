export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout exists to enable useSelectedLayoutSegment in navigation
  // for the manage section (animals, households, users)
  return <>{children}</>;
}
