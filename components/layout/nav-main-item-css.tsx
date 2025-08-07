"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as React from "react";
import {
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { SidebarMenuButton } from "@/components/ui/sidebar-css";
import { cn } from "@/lib/utils/general";

interface NavItem {
	title: string;
	url?: string;
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

export function NavMainItem({ item }: NavMainItemProps) {
	const pathname = usePathname();
	const [isExpanded, setIsExpanded] = React.useState(false);
	const [isClicking, setIsClicking] = React.useState(false);

	// Check if the current path matches this item or any of its children
	const isItemActive = item.url
		? pathname === item.url || pathname.startsWith(`${item.url}/`)
		: false;

	// Check if any child is active
	const hasActiveChild =
		item.items?.some((subItem) => {
			if (!subItem.url) return false;
			return pathname === subItem.url || pathname.startsWith(`${subItem.url}/`);
		}) ?? false;

	// Parent is active if it's directly active or has an active child
	const isActive = isItemActive || hasActiveChild;

	// Set initial expanded state based on active state
	React.useEffect(() => {
		setIsExpanded(isActive);
	}, [isActive]);

	// Reset clicking state when navigation completes
	React.useEffect(() => {
		// Reset when pathname changes
		if (pathname) {
			setIsClicking(false);
		}
	}, [pathname]);

	const hasSubItems = Boolean(item.items?.length);

	// Simple item without sub-items - pure CSS hover effects
	if (!hasSubItems) {
		return (
			<SidebarMenuItem>
				<SidebarMenuButton
					asChild
					isActive={isActive}
					className={cn(
						"group/button relative overflow-hidden transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
						isClicking && "animate-pulse bg-sidebar-accent opacity-70",
					)}
				>
					<Link
						href={item.url as Route}
						aria-label={`Navigate to ${item.title}`}
						className="flex items-center gap-2"
						onClick={() => setIsClicking(true)}
					>
						<item.icon
							aria-hidden="true"
							className="transition-transform duration-200 group-hover/button:scale-110"
						/>
						<span className="transition-colors duration-200">{item.title}</span>
						{/* CSS-only loading indicator on hover */}
						<span className="-translate-x-full absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-all duration-500 group-hover/button:translate-x-full group-hover/button:opacity-100" />
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	}

	// Parent item with sub-items using controlled state for collapsible

	return (
		<SidebarMenuItem className="relative">
			{item.url ? (
				// Parent has URL - make it clickable AND collapsible (like Insights, Settings)
				<div className="group/parent flex items-center">
					<SidebarMenuButton
						asChild
						isActive={isItemActive}
						className={cn(
							"flex-1 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
							isClicking && "bg-sidebar-accent opacity-70",
						)}
					>
						<Link
							href={item.url as Route}
							aria-label={`Navigate to ${item.title}`}
							className="flex items-center gap-2"
							onClick={() => setIsClicking(true)}
						>
							<item.icon
								aria-hidden="true"
								className="transition-transform duration-200 group-hover/parent:scale-110"
							/>
							<span>{item.title}</span>
						</Link>
					</SidebarMenuButton>
					<button
						type="button"
						onClick={() => setIsExpanded(!isExpanded)}
						className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md transition-all duration-200 hover:bg-sidebar-accent"
						aria-label={`Toggle ${item.title} submenu`}
						aria-expanded={isExpanded}
					>
						<ChevronRight
							className={cn(
								"h-4 w-4 transition-transform duration-200",
								isExpanded && "rotate-90",
							)}
						/>
					</button>
				</div>
			) : (
				// Parent has no URL - only collapsible (like Manage, Medications)
				<button
					type="button"
					onClick={() => setIsExpanded(!isExpanded)}
					className="group/toggle flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
					aria-label={`Toggle ${item.title} submenu`}
					aria-expanded={isExpanded}
				>
					<item.icon
						aria-hidden="true"
						className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover/toggle:scale-110"
					/>
					<span className="flex-1 text-left">{item.title}</span>
					<ChevronRight
						aria-hidden="true"
						className={cn(
							"h-4 w-4 shrink-0 transition-transform duration-200",
							isExpanded && "rotate-90",
						)}
					/>
				</button>
			)}

			{/* Submenu with controlled animations - hidden by default, shown when expanded */}
			<div
				className={cn(
					"grid transition-[grid-template-rows] duration-200",
					isExpanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
				)}
			>
				<div className="overflow-hidden">
					<div className="mt-1 ml-4">
						<SidebarMenuSub aria-label={`${item.title} submenu`}>
							{item.items?.map((subItem) => {
								const isSubActive = subItem.url
									? pathname === subItem.url ||
										pathname.startsWith(`${subItem.url}/`)
									: false;

								return (
									<SidebarMenuSubItem key={subItem.title}>
										<SidebarMenuSubButton
											asChild
											isActive={isSubActive}
											className={cn(
												"group/subitem relative overflow-hidden transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
												isClicking &&
													"animate-pulse bg-sidebar-accent opacity-70",
											)}
										>
											{subItem.onClick ? (
												<button
													type="button"
													onClick={subItem.onClick}
													className="flex w-full items-center text-left transition-all duration-200"
													aria-label={`${subItem.title} action`}
												>
													<span className="transition-transform duration-200 group-hover/subitem:translate-x-1">
														{subItem.title}
													</span>
													{/* CSS hover effect */}
													<span className="-translate-x-full absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 transition-all duration-300 group-hover/subitem:translate-x-full group-hover/subitem:opacity-100" />
												</button>
											) : (
												<Link
													href={(subItem.url || "#") as Route}
													className="flex items-center transition-all duration-200"
													aria-label={`Navigate to ${subItem.title}`}
													onClick={() => setIsClicking(true)}
												>
													<span className="transition-transform duration-200 group-hover/subitem:translate-x-1">
														{subItem.title}
													</span>
													{/* CSS hover effect */}
													<span className="-translate-x-full absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 transition-all duration-300 group-hover/subitem:translate-x-full group-hover/subitem:opacity-100" />
												</Link>
											)}
										</SidebarMenuSubButton>
									</SidebarMenuSubItem>
								);
							})}
						</SidebarMenuSub>
					</div>
				</div>
			</div>
		</SidebarMenuItem>
	);
}
