"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import React, { useEffect, useState, useTransition } from "react";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LoadingIndicator } from "@/components/ui/loading-indicator";
import {
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface NavItem {
	title: string;
	url?: string; // Made optional for parent items without pages
	icon: LucideIcon;
	segment?: string;
	items?: {
		title: string;
		url?: string;
		segment?: string;
		onClick?: () => void;
	}[];
}

interface NavMainItemProps {
	item: NavItem;
}

// Sub-item component to avoid hooks in loops
const NavSubItem = React.memo(function NavSubItem({
	subItem,
	segment,
	isMobile,
	setOpenMobile,
}: {
	subItem: {
		title: string;
		url?: string;
		segment?: string;
		onClick?: () => void;
	};
	segment: string | null;
	isMobile: boolean;
	setOpenMobile: (open: boolean) => void;
}) {
	const [isSubNavigating, setIsSubNavigating] = useState(false);
	const [isPending, startTransition] = useTransition();

	const subSegment =
		subItem.segment || subItem.url?.split("/").filter(Boolean)[1];
	const isSubActive = segment === subSegment;

	const handleSubNavigation = (_e: React.MouseEvent) => {
		setIsSubNavigating(true);

		startTransition(() => {
			if (isMobile) {
				setTimeout(() => {
					setOpenMobile(false);
				}, 150);
			}
		});

		setTimeout(() => {
			setIsSubNavigating(false);
		}, 500);
	};

	return (
		<SidebarMenuSubItem>
			<SidebarMenuSubButton
				asChild
				isActive={isSubActive}
				className={cn(isSubNavigating && "opacity-70")}
			>
				{subItem.onClick ? (
					<button
						type="button"
						onClick={(e) => {
							handleSubNavigation(e);
							subItem.onClick?.();
						}}
						className="w-full cursor-pointer text-left transition-colors"
						aria-label={`${subItem.title} action`}
					>
						<span>{subItem.title}</span>
						{(isSubNavigating || isPending) && <LoadingIndicator />}
					</button>
				) : (
					<Link
						href={(subItem.url || "#") as Route}
						className="cursor-pointer transition-colors"
						aria-label={`Navigate to ${subItem.title}`}
						onClick={handleSubNavigation}
					>
						<span>{subItem.title}</span>
						{(isSubNavigating || isPending) && <LoadingIndicator />}
					</Link>
				)}
			</SidebarMenuSubButton>
		</SidebarMenuSubItem>
	);
});

export const NavMainItem = React.memo(function NavMainItem({
	item,
}: NavMainItemProps) {
	const segment = useSelectedLayoutSegment();
	const { setOpenMobile, isMobile } = useSidebar();
	const [isPending, startTransition] = useTransition();
	const [isNavigating, setIsNavigating] = useState(false);

	// Derive segment from URL if not explicitly provided
	const itemSegment = item.segment || item.url?.split("/").filter(Boolean)[0];

	// Check if this item or any of its children are active
	const isActive =
		segment === itemSegment ||
		(item.items?.some((subItem) => {
			const subSegment =
				subItem.segment || subItem.url?.split("/").filter(Boolean)[1];
			return segment === subSegment;
		}) ??
			false);

	// Start expanded if active
	const [isOpen, setIsOpen] = useState(isActive);

	// Update open state when active state changes
	useEffect(() => {
		if (isActive && !isOpen) {
			setIsOpen(true);
		}
	}, [isActive, isOpen]);

	const hasSubItems = Boolean(item.items?.length);

	// Handle navigation with loading state and mobile sidebar close
	const handleNavigation = (_e: React.MouseEvent<HTMLAnchorElement>) => {
		// Don't prevent default - let Next.js handle the navigation
		setIsNavigating(true);

		// Start transition for immediate feedback
		startTransition(() => {
			// Close mobile sidebar after a short delay to show the click feedback
			if (isMobile) {
				setTimeout(() => {
					setOpenMobile(false);
				}, 150);
			}
		});

		// Reset navigating state after navigation completes
		setTimeout(() => {
			setIsNavigating(false);
		}, 500);
	};

	// Simple item without sub-items
	if (!hasSubItems) {
		return (
			<SidebarMenuItem>
				<SidebarMenuButton
					asChild
					tooltip={item.title}
					isActive={isActive}
					className={cn(
						"cursor-pointer transition-colors",
						isNavigating && "opacity-70",
					)}
				>
					<Link
						href={item.url as Route}
						aria-label={`Navigate to ${item.title}`}
						onClick={handleNavigation}
					>
						<item.icon aria-hidden="true" />
						<span>{item.title}</span>
						{(isPending || isNavigating) && <LoadingIndicator />}
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	}

	// Parent item with sub-items
	return (
		<Collapsible asChild open={isOpen} onOpenChange={setIsOpen}>
			<SidebarMenuItem>
				{item.url ? (
					// Parent has URL - make it clickable AND collapsible
					<div className="flex items-center">
						<SidebarMenuButton
							asChild
							tooltip={item.title}
							isActive={isActive}
							className={cn(
								"flex-1 cursor-pointer transition-colors",
								isNavigating && "opacity-70",
							)}
						>
							<Link
								href={item.url as Route}
								aria-label={`Navigate to ${item.title}`}
								onClick={handleNavigation}
							>
								<item.icon aria-hidden="true" />
								<span>{item.title}</span>
								{(isPending || isNavigating) && <LoadingIndicator />}
							</Link>
						</SidebarMenuButton>
						<CollapsibleTrigger asChild>
							<SidebarMenuButton
								size="sm"
								className="ml-auto h-8 w-8 p-0"
								aria-label={`${isOpen ? "Collapse" : "Expand"} ${item.title} menu`}
							>
								<ChevronRight
									className={cn(
										"h-4 w-4 transition-transform duration-200",
										isOpen && "rotate-90",
									)}
								/>
							</SidebarMenuButton>
						</CollapsibleTrigger>
					</div>
				) : (
					// Parent has no URL - only collapsible
					<CollapsibleTrigger asChild>
						<SidebarMenuButton
							tooltip={item.title}
							isActive={isActive}
							className="cursor-pointer"
							aria-expanded={isOpen}
							aria-controls={`submenu-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
							aria-label={`${item.title} menu`}
						>
							<item.icon aria-hidden="true" />
							<span>{item.title}</span>
							<ChevronRight
								aria-hidden="true"
								className={cn(
									"ml-auto h-4 w-4 shrink-0 transition-transform duration-200",
									isOpen && "rotate-90",
								)}
							/>
						</SidebarMenuButton>
					</CollapsibleTrigger>
				)}
				<CollapsibleContent
					className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
					id={`submenu-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
				>
					<SidebarMenuSub aria-label={`${item.title} submenu`}>
						{item.items?.map((subItem) => (
							<NavSubItem
								key={subItem.title}
								subItem={subItem}
								segment={segment}
								isMobile={isMobile}
								setOpenMobile={setOpenMobile}
							/>
						))}
					</SidebarMenuSub>
				</CollapsibleContent>
			</SidebarMenuItem>
		</Collapsible>
	);
});
