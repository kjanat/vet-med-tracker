"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { useEffect, useState } from "react";
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
} from "@/components/ui/sidebar";

interface NavItem {
	title: string;
	url: string;
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
	const segment = useSelectedLayoutSegment();

	// Derive segment from URL if not explicitly provided
	const itemSegment = item.segment || item.url.split("/").filter(Boolean)[0];

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

	if (!hasSubItems) {
		return (
			<SidebarMenuItem>
				<SidebarMenuButton
					asChild
					tooltip={item.title}
					isActive={isActive}
					className="cursor-pointer"
				>
					<Link
						href={item.url as Route}
						aria-label={`Navigate to ${item.title}`}
					>
						<item.icon aria-hidden="true" />
						<span>{item.title}</span>
						<LoadingIndicator />
					</Link>
				</SidebarMenuButton>
			</SidebarMenuItem>
		);
	}

	return (
		<Collapsible asChild open={isOpen} onOpenChange={setIsOpen}>
			<SidebarMenuItem>
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
							className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${
								isOpen ? "rotate-90" : ""
							}`}
						/>
					</SidebarMenuButton>
				</CollapsibleTrigger>
				<CollapsibleContent
					className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
					id={`submenu-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
				>
					<SidebarMenuSub aria-label={`${item.title} submenu`}>
						{item.items?.map((subItem) => {
							const subSegment =
								subItem.segment || subItem.url?.split("/").filter(Boolean)[1];
							const isSubActive = segment === subSegment;

							return (
								<SidebarMenuSubItem key={subItem.title}>
									<SidebarMenuSubButton asChild isActive={isSubActive}>
										{subItem.onClick ? (
											<button
												type="button"
												onClick={subItem.onClick}
												className="w-full cursor-pointer text-left"
												aria-label={`${subItem.title} action`}
											>
												<span>{subItem.title}</span>
											</button>
										) : (
											<Link
												href={(subItem.url || "#") as Route}
												className="cursor-pointer"
												aria-label={`Navigate to ${subItem.title}`}
											>
												<span>{subItem.title}</span>
												<LoadingIndicator />
											</Link>
										)}
									</SidebarMenuSubButton>
								</SidebarMenuSubItem>
							);
						})}
					</SidebarMenuSub>
				</CollapsibleContent>
			</SidebarMenuItem>
		</Collapsible>
	);
}
