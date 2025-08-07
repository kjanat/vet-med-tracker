import {
	BarChart3,
	Bell,
	Building2,
	Clock,
	Database,
	Dog,
	FileText,
	HelpCircle,
	History,
	Home,
	Package,
	Pill,
	Settings,
	Settings2,
	Syringe,
	TrendingUp,
	Users,
} from "lucide-react";
import type { Route } from "next";
import type { NavigationConfig, NavigationItem } from "./types";

/**
 * Centralized navigation configuration for the entire application.
 * This is the single source of truth for all navigation elements.
 */
export const navigationConfig: NavigationConfig = {
	main: {
		dashboard: {
			title: "Dashboard",
			path: "/dashboard" as Route,
			description: "Today's medication schedule and overview",
			icon: Home,
			isActive: true,
			children: {
				history: {
					title: "Medication History",
					path: "/dashboard/history" as Route,
					description: "View past medication administrations",
					icon: History,
				},
			},
		},
		manage: {
			title: "Manage",
			icon: Users,
			description: "Manage your households, animals, and team members",
			children: {
				animals: {
					title: "Animals",
					path: "/manage/animals" as Route,
					description: "Add, edit, and manage your animals' profiles",
					icon: Dog,
				},
				households: {
					title: "Households",
					path: "/manage/households" as Route,
					description: "Manage your households and their members",
					icon: Building2,
				},
				users: {
					title: "Users",
					path: "/manage/users" as Route,
					description: "Manage household members and their roles",
					icon: Users,
				},
			},
		},
		medications: {
			title: "Medications",
			icon: Pill,
			description: "Record doses and manage medications",
			children: {
				record: {
					title: "Record Dose",
					path: "/admin/record" as Route,
					description: "Record a medication dose",
					icon: Syringe,
				},
				inventory: {
					title: "Inventory",
					path: "/medications/inventory" as Route,
					description: "Track your medication stock",
					icon: Package,
				},
				regimens: {
					title: "Regimens",
					path: "/medications/regimens" as Route,
					description: "Manage medication schedules",
					icon: Clock,
				},
			},
		},
		insights: {
			title: "Insights",
			path: "/insights" as Route,
			description: "Medication compliance and patterns",
			icon: TrendingUp,
			children: {
				history: {
					title: "History",
					path: "/dashboard/history" as Route,
					description: "View medication history",
					icon: History,
				},
				reports: {
					title: "Animal Reports",
					path: "/reports" as Route,
					description: "Detailed compliance reports by animal",
					icon: FileText,
				},
			},
		},
		settings: {
			title: "Settings",
			path: "/settings" as Route,
			description: "Manage your account and application settings",
			icon: Settings,
			children: {
				preferences: {
					title: "Preferences",
					path: "/settings/preferences" as Route,
					description: "Customize your app experience and display settings",
					icon: Settings2,
				},
				notifications: {
					title: "Notifications",
					path: "/settings/notifications" as Route,
					description: "Configure alerts and notification preferences",
					icon: Bell,
				},
				dataPrivacy: {
					title: "Data & Privacy",
					path: "/settings/data-privacy" as Route,
					description: "Export your data and manage privacy settings",
					icon: Database,
				},
			},
		},
	},
	secondary: [
		{
			title: "Support",
			path: "/help" as Route,
			icon: HelpCircle,
			description: "Get help and support",
		},
	],
	mobile: [
		{
			title: "Home",
			path: "/" as Route,
			icon: Home,
		},
		{
			title: "History",
			path: "/dashboard/history" as Route,
			icon: History,
		},
		{
			title: "Inventory",
			path: "/medications/inventory" as Route,
			icon: Package,
		},
		{
			title: "Insights",
			path: "/insights" as Route,
			icon: BarChart3,
		},
		{
			title: "Settings",
			path: "/settings" as Route,
			icon: Settings,
		},
	],
	dashboard: [
		{
			title: "Today's Doses",
			path: "/dashboard" as Route,
			icon: Clock,
		},
		{
			title: "Overdue",
			path: "/dashboard?filter=overdue" as Route,
			icon: Bell,
		},
		{
			title: "Recent History",
			path: "/dashboard/history" as Route,
			icon: History,
		},
	],
};

/**
 * Page metadata for enhanced page headers and breadcrumbs
 * Maps route paths to their metadata
 */
export const pageMetadata: Record<string, Partial<NavigationItem>> = {
	"/dashboard": {
		title: "Dashboard",
		description: "Today's medication schedule and overview",
	},
	"/dashboard/history": {
		title: "Medication History",
		description: "View past medication administrations",
	},
	"/manage": {
		title: "Manage",
		description: "Manage your households, animals, and team members",
	},
	"/manage/animals": {
		title: "Manage Animals",
		description: "Add and manage your animals",
	},
	"/manage/animals/emergency": {
		title: "Emergency Information",
		description: "Critical care information for this animal",
	},
	"/manage/households": {
		title: "Manage Households",
		description: "Manage your households and their members",
	},
	"/manage/users": {
		title: "Manage Users",
		description: "Manage user roles and permissions",
	},
	"/medications/inventory": {
		title: "Medication Inventory",
		description: "Track your medication stock",
	},
	"/medications/regimens": {
		title: "Medication Regimens",
		description: "Manage medication schedules",
	},
	"/admin/record": {
		title: "Record Administration",
		description: "Record a medication dose",
	},
	"/reports": {
		title: "Reports",
		description: "Select an animal to view their medication compliance report",
	},
	"/insights": {
		title: "Insights",
		description: "Medication compliance and patterns",
	},
	"/settings": {
		title: "Settings",
		description: "Manage your account and preferences",
	},
	"/settings/data-privacy": {
		title: "Data & Privacy",
		description: "Export your data and manage privacy settings",
	},
	"/settings/preferences": {
		title: "Preferences",
		description: "Customize your app experience and display settings",
	},
	"/settings/notifications": {
		title: "Notifications",
		description: "Configure alerts and notification preferences",
	},
	"/settings/data-privacy/audit": {
		title: "Audit Log",
		description: "View system activity and changes",
	},
};

/**
 * Get all valid settings tabs from the navigation config
 */
export const settingsTabs = Object.keys(
	navigationConfig.main.settings?.children || {},
);

/**
 * Get all valid manage sections from the navigation config
 */
export const manageSections = Object.keys(
	navigationConfig.main.manage?.children || {},
);
