"use client";

import {
	Activity,
	BarChart3,
	Bell,
	HelpCircle,
	History,
	Home,
	Package,
	Settings,
	Stethoscope,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { NotificationsSidebarItem } from "@/components/notifications/notifications-sidebar-item";
import { useAnimalForm } from "@/components/providers/animal-form-provider";
import { useInventoryForm } from "@/components/providers/inventory-form-provider";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupContent,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
} from "@/components/ui/sidebar";
import { UserMenuDesktop } from "../auth/user-menu-desktop";
import { HouseholdSwitcher } from "../ui/household-switcher";
import { NavDashboard } from "./nav-dashboard";
import { NavMain } from "./nav-main";

// Navigation data for VetMed Tracker
const data = {
	navMain: [
		{
			title: "Dashboard",
			url: "/",
			icon: Home,
			isActive: true,
		},
		{
			title: "Animals",
			url: "/animals",
			icon: Stethoscope,
			items: [
				{
					title: "All Animals",
					url: "/animals",
				},
				{
					title: "Add Animal",
					url: "/animals/new",
				},
			],
		},
		{
			title: "Medications",
			url: "/admin/record",
			icon: Activity,
			items: [
				{
					title: "Record Dose",
					url: "/admin/record",
				},
				{
					title: "History",
					url: "/history",
				},
				{
					title: "Regimens",
					url: "/regimens",
				},
			],
		},
		{
			title: "Inventory",
			url: "/inventory",
			icon: Package,
			items: [
				{
					title: "Current Stock",
					url: "/inventory",
				},
				{
					title: "Add Item",
					url: "/inventory?add=true",
				},
			],
		},
		{
			title: "Insights",
			url: "/insights",
			icon: BarChart3,
		},
		{
			title: "Settings",
			url: "/settings",
			icon: Settings,
			items: [
				{
					title: "Data & Privacy",
					url: "/settings?tab=data",
				},
				{
					title: "Preferences",
					url: "/settings?tab=preferences",
				},
				{
					title: "Notifications",
					url: "/settings?tab=notifications",
				},
				{
					title: "Household",
					url: "/settings?tab=household",
				},
			],
		},
	],
	navSecondary: [
		{
			title: "Support",
			url: "/help",
			icon: HelpCircle,
		},
	],
	dashboard: [
		{
			name: "Today's Doses",
			url: "/",
			icon: Activity,
		},
		{
			name: "Overdue",
			url: "/?filter=overdue",
			icon: Bell,
		},
		{
			name: "Recent History",
			url: "/history",
			icon: History,
		},
	],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const pathname = usePathname();
	const { openForm } = useAnimalForm();
	const { openForm: openInventoryForm } = useInventoryForm();

	// Update active state and add click handlers based on current path
	const navMainWithActive = data.navMain.map((item) => ({
		...item,
		isActive: pathname === item.url || pathname.startsWith(`${item.url}/`),
		items: item.items?.map((subItem) => {
			// Convert "Add Animal" links to use the dialog
			if (subItem.title === "Add Animal") {
				return {
					...subItem,
					onClick: () => openForm(),
					url: undefined, // Remove the URL to prevent navigation
				};
			}
			// Convert "Add Item" links to use the dialog
			if (subItem.title === "Add Item") {
				return {
					...subItem,
					onClick: () => openInventoryForm(),
					url: undefined, // Remove the URL to prevent navigation
				};
			}
			return subItem;
		}),
	}));

	return (
		<Sidebar variant="inset" {...props}>
			<SidebarHeader>
				<HouseholdSwitcher />
			</SidebarHeader>
			<SidebarContent>
				<NavDashboard items={data.dashboard} />
				<NavMain items={navMainWithActive} />

				{/* Custom secondary navigation with notifications popover */}
				<SidebarGroup className="mt-auto">
					<SidebarGroupContent>
						<SidebarMenu>
							{/* Notifications with popover */}
							<SidebarMenuItem>
								<NotificationsSidebarItem />
							</SidebarMenuItem>

							{/* Regular nav items */}
							{data.navSecondary.map((item) => (
								<SidebarMenuItem key={item.title}>
									<SidebarMenuButton asChild size="sm">
										<Link href={item.url}>
											<item.icon />
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<UserMenuDesktop />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
