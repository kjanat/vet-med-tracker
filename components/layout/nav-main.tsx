"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarMenuSub,
	SidebarMenuSubButton,
	SidebarMenuSubItem,
} from "@/components/ui/sidebar";

export function NavMain({
	items,
}: {
	items: {
		title: string;
		url: string;
		icon: LucideIcon;
		isActive?: boolean;
		items?: {
			title: string;
			url?: string;
			onClick?: () => void;
		}[];
	}[];
}) {
	// Initialize state for all items at the top level
	const [openStates, setOpenStates] = useState<Record<string, boolean>>(() => {
		const initialStates: Record<string, boolean> = {};
		items.forEach((item) => {
			initialStates[item.title] = item.isActive || false;
		});
		return initialStates;
	});

	const firstMenuItemRef = useRef<HTMLAnchorElement>(null);

	const toggleOpen = (itemTitle: string) => {
		setOpenStates((prev) => ({
			...prev,
			[itemTitle]: !prev[itemTitle],
		}));
	};

	// Listen for menu toggle events from keyboard shortcuts
	useEffect(() => {
		const handleMenuToggle = () => {
			// Focus the first menu item when Alt+M is pressed
			if (firstMenuItemRef.current) {
				firstMenuItemRef.current.focus();
			}
		};

		window.addEventListener("toggle-main-menu", handleMenuToggle);
		return () =>
			window.removeEventListener("toggle-main-menu", handleMenuToggle);
	}, []);

	return (
		<SidebarGroup aria-label="Main navigation">
			<SidebarGroupLabel className="cursor-default">
				VetMed Tracker
			</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item, index) => {
					const isOpen = openStates[item.title] || false;
					const isFirstItem = index === 0;

					return (
						<Collapsible
							key={item.title}
							asChild
							open={isOpen}
							onOpenChange={() => toggleOpen(item.title)}
						>
							<SidebarMenuItem>
								{item.items?.length ? (
									<CollapsibleTrigger asChild>
										<SidebarMenuButton
											tooltip={item.title}
											isActive={item.isActive}
											className="cursor-pointer"
											aria-expanded={isOpen}
											aria-controls={`submenu-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
											aria-label={`${item.title} menu`}
										>
											<item.icon aria-hidden="true" />
											<span>{item.title}</span>
											<ChevronRight
												aria-hidden="true"
												className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
											/>
										</SidebarMenuButton>
									</CollapsibleTrigger>
								) : (
									<SidebarMenuButton
										asChild
										tooltip={item.title}
										isActive={item.isActive}
										className="cursor-pointer"
									>
										<Link
											ref={isFirstItem ? firstMenuItemRef : undefined}
											href={item.url}
											aria-label={`Navigate to ${item.title}`}
										>
											<item.icon aria-hidden="true" />
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								)}
								{item.items?.length ? (
									<CollapsibleContent
										className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down"
										id={`submenu-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
									>
										<SidebarMenuSub aria-label={`${item.title} submenu`}>
											{item.items?.map((subItem) => (
												<SidebarMenuSubItem key={subItem.title}>
													<SidebarMenuSubButton asChild>
														{subItem.onClick ? (
															<button
																type="button"
																onClick={subItem.onClick}
																className="w-full text-left cursor-pointer"
																aria-label={`${subItem.title} action`}
															>
																<span>{subItem.title}</span>
															</button>
														) : (
															<Link
																href={subItem.url || "#"}
																className="cursor-pointer"
																aria-label={`Navigate to ${subItem.title}`}
															>
																<span>{subItem.title}</span>
															</Link>
														)}
													</SidebarMenuSubButton>
												</SidebarMenuSubItem>
											))}
										</SidebarMenuSub>
									</CollapsibleContent>
								) : null}
							</SidebarMenuItem>
						</Collapsible>
					);
				})}
			</SidebarMenu>
		</SidebarGroup>
	);
}
