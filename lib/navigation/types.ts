import type { LucideIcon } from "lucide-react";
import type { Route } from "next";

/**
 * Core navigation item structure
 */
export interface NavigationItem {
	/** Display title for the navigation item */
	title: string;
	/** Optional URL path for the item */
	path?: Route;
	/** Description text for the item */
	description?: string;
	/** Icon component or icon name */
	icon?: LucideIcon | string;
	/** Whether this item is currently active */
	isActive?: boolean;
	/** Child navigation items */
	children?: Record<string, NavigationItem>;
	/** Optional click handler (for dialog-based actions) */
	onClick?: () => void;
	/** Additional metadata */
	metadata?: {
		/** Show item count badge */
		count?: number;
		/** Badge variant */
		badge?: "default" | "secondary" | "outline" | "destructive";
		/** Whether to show this item on mobile */
		showOnMobile?: boolean;
		/** Whether to show this item on desktop */
		showOnDesktop?: boolean;
	};
}

/**
 * Page metadata for breadcrumbs and headers
 */
export interface PageMetadata {
	/** Page title */
	title: string;
	/** Page description */
	description: string;
	/** Optional actions for the page header */
	actions?: React.ReactNode;
	/** Parent page for breadcrumb generation */
	parent?: string;
}

/**
 * Complete navigation configuration structure
 */
export interface NavigationConfig {
	/** Main navigation sections */
	main: Record<string, NavigationItem>;
	/** Secondary navigation items */
	secondary: NavigationItem[];
	/** Mobile bottom navigation items */
	mobile: NavigationItem[];
	/** Quick access dashboard items */
	dashboard: NavigationItem[];
}

/**
 * Navigation section type
 */
export type NavigationSection = keyof NavigationConfig["main"];

/**
 * Helper type to extract all valid paths from navigation config
 */
export type NavigationPath = Route | undefined;
