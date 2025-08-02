import { AppSidebar } from "@/components/layout/app-sidebar";
import { PageHeader } from "@/components/layout/page-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<PageHeader />
				<main className="flex flex-1 flex-col gap-4 p-4 pt-6">{children}</main>
			</SidebarInset>
		</SidebarProvider>
	);
}
