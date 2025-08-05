"use client";

import { LogOut, Settings, User } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { LoginButton } from "./login-button";
import { UserMenuDesktop } from "./user-menu-desktop";

// Mobile UserMenu component
function MobileUserMenu() {
	const { user, logout, isLoading } = useAuth();

	if (!user) {
		return <LoginButton variant="outline" size="sm" />;
	}

	const initials = user.name
		? user.name
				.split(" ")
				.map((n) => n[0])
				.join("")
				.toUpperCase()
				.slice(0, 2)
		: user.email?.[0]?.toUpperCase() || "U";

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					className="relative h-9 w-9 rounded-full"
					disabled={isLoading}
					aria-label={`User menu for ${user.name || user.email || "User"}`}
				>
					<Avatar className="h-9 w-9">
						<AvatarImage
							src={user.image ?? undefined}
							alt={user.name || user.email || "User"}
						/>
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="font-medium text-sm leading-none">
							{user.name || "User"}
						</p>
						<p className="text-muted-foreground text-xs leading-none">
							{user.email}
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<Link href="/settings">
						<Settings className="mr-2 h-4 w-4" />
						<span>Settings</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<Link href="/settings#profile">
						<User className="mr-2 h-4 w-4" />
						<span>Profile</span>
					</Link>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem onClick={logout} className="text-red-600">
					<LogOut className="mr-2 h-4 w-4" />
					<span>Log out</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function UserMenu() {
	const isMobile = useMediaQuery("(max-width: 768px)");

	return isMobile ? <MobileUserMenu /> : <UserMenuDesktop />;
}
