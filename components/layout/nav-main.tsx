"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

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

	const toggleOpen = (itemTitle: string) => {
		setOpenStates((prev) => ({
			...prev,
			[itemTitle]: !prev[itemTitle],
		}));
	};

	return (
		<SidebarGroup>
			<SidebarGroupLabel className="cursor-default">
				VetMed Tracker
			</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) => {
					const isOpen = openStates[item.title] || false;

					return (
						<Collapsible
							key={item.title}
							asChild
							open={isOpen}
							onOpenChange={() => toggleOpen(item.title)}
						>
							<SidebarMenuItem>
								{item.items?.length ? (
									<>
										<CollapsibleTrigger asChild>
											<SidebarMenuButton
												tooltip={item.title}
												isActive={item.isActive}
												className="cursor-pointer"
											>
												<item.icon />
												<span>{item.title}</span>
												<ChevronRight
													className={`ml-auto h-4 w-4 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
												/>
											</SidebarMenuButton>
										</CollapsibleTrigger>
									</>
								) : (
									<SidebarMenuButton
										asChild
										tooltip={item.title}
										isActive={item.isActive}
										className="cursor-pointer"
									>
										<Link href={item.url}>
											<item.icon />
											<span>{item.title}</span>
										</Link>
									</SidebarMenuButton>
								)}
								{item.items?.length ? (
									<CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
										<SidebarMenuSub>
											{item.items?.map((subItem) => (
												<SidebarMenuSubItem key={subItem.title}>
													<SidebarMenuSubButton asChild>
														{subItem.onClick ? (
															<button
																type="button"
																onClick={subItem.onClick}
																className="w-full text-left cursor-pointer"
															>
																<span>{subItem.title}</span>
															</button>
														) : (
															<Link
																href={subItem.url || "#"}
																className="cursor-pointer"
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
