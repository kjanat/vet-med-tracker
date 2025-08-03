export default function DashboardLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	// This layout exists to enable useSelectedLayoutSegment in navigation
	// for the dashboard section (overview, history)
	return <>{children}</>;
}
