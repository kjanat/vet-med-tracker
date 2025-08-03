"use client";

import type { LucideIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import {
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
} from "@/components/ui/sidebar";
import { NavMainItem } from "./nav-main-item";

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
	const firstMenuItemRef = useRef<HTMLDivElement>(null);

	// Listen for menu toggle events from keyboard shortcuts
	useEffect(() => {
		const handleMenuToggle = () => {
			// Focus the first menu item when Alt+M is pressed
			if (firstMenuItemRef.current) {
				const firstLink = firstMenuItemRef.current.querySelector("a, button");
				if (firstLink instanceof HTMLElement) {
					firstLink.focus();
				}
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
				{items.map((item, index) => (
					<div
						key={item.title}
						ref={index === 0 ? firstMenuItemRef : undefined}
					>
						<NavMainItem item={item} />
					</div>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
