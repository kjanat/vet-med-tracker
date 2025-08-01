"use client";

import { Check, ChevronsUpDown, Home } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@/components/ui/sidebar";
import { getAvatarColor } from "@/lib/avatar-utils";
import { cn } from "@/lib/utils";
import { useApp } from "../providers/app-provider";

export function HouseholdSwitcher() {
	const { selectedHousehold, setSelectedHousehold, households } = useApp();
	const { isMobile } = useSidebar();

	// Handle no household selected
	if (!selectedHousehold) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton size="lg" disabled>
						<div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
							<Home className="size-4" />
						</div>
						<div className="grid flex-1 text-left text-sm leading-tight">
							<span className="truncate font-medium">No household</span>
							<span className="truncate text-xs">Select household</span>
						</div>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground cursor-pointer"
						>
							<Avatar className="h-8 w-8 rounded-lg">
								{selectedHousehold.avatar && (
									<AvatarImage src={selectedHousehold.avatar} />
								)}
								<AvatarFallback
									className={cn(
										getAvatarColor(selectedHousehold.name),
										"text-white font-medium rounded-lg",
									)}
								>
									{selectedHousehold.name[0]}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">
									{selectedHousehold.name}
								</span>
								<span className="truncate text-xs">Household</span>
							</div>
							<ChevronsUpDown className="ml-auto" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
						align="start"
						side={isMobile ? "bottom" : "right"}
						sideOffset={4}
					>
						<DropdownMenuLabel className="text-muted-foreground text-xs cursor-default">
							Households
						</DropdownMenuLabel>
						{households.map((household) => (
							<DropdownMenuItem
								key={household.id}
								onClick={() => setSelectedHousehold(household)}
								className="gap-2 p-2 cursor-pointer"
							>
								<Avatar className="h-6 w-6 rounded-md">
									{household.avatar && <AvatarImage src={household.avatar} />}
									<AvatarFallback
										className={cn(
											getAvatarColor(household.name),
											"text-white font-medium text-xs rounded-md",
										)}
									>
										{household.name[0]}
									</AvatarFallback>
								</Avatar>
								{household.name}
								<Check
									className={cn(
										"ml-auto h-4 w-4",
										selectedHousehold?.id === household.id
											? "opacity-100"
											: "opacity-0",
									)}
								/>
							</DropdownMenuItem>
						))}
						<DropdownMenuSeparator />
						<DropdownMenuItem className="gap-2 p-2 cursor-pointer">
							<div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
								<Home className="size-4" />
							</div>
							<div className="text-muted-foreground font-medium">
								Add household
							</div>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
