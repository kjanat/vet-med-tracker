"use client";

import type { LucideIcon } from "lucide-react";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
} from "@/components/ui/sidebar";
import { NavMainItem } from "./nav-main-item-css";

export function NavMain({
	items,
}: {
	items: {
		title: string;
		url?: string;
		icon: LucideIcon;
		isActive?: boolean;
		items?: {
			title: string;
			url?: string;
			onClick?: () => void;
		}[];
	}[];
}) {
	return (
		<SidebarGroup aria-label="Main navigation">
			<SidebarGroupLabel className="cursor-default">
				VetMed Tracker
			</SidebarGroupLabel>
			<SidebarMenu>
				{items.map((item) => (
					<NavMainItem key={item.title} item={item} />
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
