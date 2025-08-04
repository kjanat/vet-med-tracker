"use client";

import {
	Bell,
	Clock,
	FileChartColumn,
	HelpCircle,
	History,
	Home,
	Pill,
	Settings,
	TrendingUp,
	Users,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
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
import { HouseholdSwitcher } from "../ui/household-switcher";
import { NavDashboard } from "./nav-dashboard";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";

// Navigation data for VetMed Tracker
const data = {
	navMain: [
		{
			title: "Dashboard",
			url: "/dashboard",
			icon: Home,
			isActive: true,
			items: [
				{
					title: "Overview",
					url: "/dashboard",
				},
				{
					title: "History",
					url: "/dashboard/history",
				},
			],
		},
		{
			title: "Manage",
			icon: Users,
			items: [
				{
					title: "Animals",
					url: "/manage/animals",
				},
				{
					title: "Households",
					url: "/manage/households",
				},
				{
					title: "Users",
					url: "/manage/users",
				},
			],
		},
		{
			title: "Medications",
			icon: Pill,
			items: [
				{
					title: "Record Dose",
					url: "/admin/record",
				},
				{
					title: "Inventory",
					url: "/medications/inventory",
				},
				{
					title: "Regimens",
					url: "/medications/regimens",
				},
			],
		},
		{
			title: "Insights",
			url: "/insights",
			icon: TrendingUp,
		},
		{
			title: "Reports",
			icon: FileChartColumn,
			items: [
				{
					title: "Animal Reports",
					url: "/reports/animal",
				},
			],
		},
		{
			title: "Settings",
			url: "/settings",
			icon: Settings,
			items: [
				{
					title: "General",
					url: "/settings?tab=household",
				},
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
					title: "Audit Log",
					url: "/audit",
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
			url: "/dashboard",
			icon: Clock,
		},
		{
			name: "Overdue",
			url: "/dashboard?filter=overdue",
			icon: Bell,
		},
		{
			name: "Recent History",
			url: "/dashboard/history",
			icon: History,
		},
	],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
	const { openForm } = useAnimalForm();
	const { openForm: openInventoryForm } = useInventoryForm();

	// Add click handlers for dialog-based actions
	const navMainWithHandlers = data.navMain.map((item) => ({
		...item,
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
		<Sidebar id="main-navigation" variant="inset" {...props}>
			<SidebarHeader>
				<HouseholdSwitcher />
			</SidebarHeader>
			<SidebarContent>
				<NavDashboard items={data.dashboard} />
				<NavMain items={navMainWithHandlers} />

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
										<Link href={item.url as Route} className="cursor-pointer">
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
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
