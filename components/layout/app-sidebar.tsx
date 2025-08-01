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
import { usePathname } from "next/navigation";
import type * as React from "react";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "@/components/ui/sidebar";
import { UserMenuDesktop } from "../auth/user-menu-desktop";
import { HouseholdSwitcher } from "../ui/household-switcher";
import { NavDashboard } from "./nav-dashboard";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";

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
					url: "/settings?tab=regimens",
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
					title: "Animals",
					url: "/settings?tab=animals",
				},
				{
					title: "Household",
					url: "/settings?tab=household",
				},
				{
					title: "Notifications",
					url: "/settings?tab=notifications",
				},
				{
					title: "Preferences",
					url: "/settings?tab=preferences",
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
		{
			title: "Notifications",
			url: "/notifications",
			icon: Bell,
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

	// Update active state based on current path
	const navMainWithActive = data.navMain.map((item) => ({
		...item,
		isActive: pathname === item.url || pathname.startsWith(`${item.url}/`),
	}));

	return (
		<Sidebar variant="inset" {...props}>
			<SidebarHeader>
				<HouseholdSwitcher />
			</SidebarHeader>
			<SidebarContent>
				<NavDashboard items={data.dashboard} />
				<NavMain items={navMainWithActive} />
				<NavSecondary items={data.navSecondary} className="mt-auto" />
			</SidebarContent>
			<SidebarFooter>
				<UserMenuDesktop />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
