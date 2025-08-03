"use client";

import {
	SignedIn,
	SignedOut,
	SignInButton,
	UserButton,
	useUser,
} from "@clerk/nextjs";
import { Heart, Home, Settings, User } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";

export function ClerkNavUser() {
	const { user, isLoaded } = useUser();
	const router = useRouter();

	if (!isLoaded) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton size="lg" disabled>
						<div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200" />
						<div className="grid flex-1 text-left text-sm leading-tight">
							<div className="h-4 animate-pulse rounded bg-gray-200" />
							<div className="mt-1 h-3 animate-pulse rounded bg-gray-200" />
						</div>
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<SignedIn>
					<div className="flex w-full items-center">
						<UserButton
							appearance={{
								elements: {
									avatarBox: "h-8 w-8 rounded-lg",
									userButtonTrigger: "flex-shrink-0",
								},
							}}
							afterSignOutUrl="/"
						>
							{/* Custom profile pages */}
							<UserButton.UserProfilePage
								label="VetMed Preferences"
								url="vetmed-preferences"
								labelIcon={<Heart className="h-4 w-4" />}
							>
								<div className="p-4">
									<h2 className="mb-4 font-semibold text-lg">
										VetMed Preferences
									</h2>
									<p className="mb-4 text-gray-600">
										Configure your medication tracking preferences, timezones,
										and notification settings.
									</p>
									<Button onClick={() => router.push("/profile" as Route)}>
										Go to Full Settings
									</Button>
								</div>
							</UserButton.UserProfilePage>

							<UserButton.UserProfilePage
								label="Household Settings"
								url="household-settings"
								labelIcon={<Home className="h-4 w-4" />}
							>
								<div className="p-4">
									<h2 className="mb-4 font-semibold text-lg">
										Household Settings
									</h2>
									<p className="mb-4 text-gray-600">
										Manage your household information, locations, and veterinary
										contacts.
									</p>
									<Button onClick={() => router.push("/profile" as Route)}>
										Go to Full Settings
									</Button>
								</div>
							</UserButton.UserProfilePage>

							{/* Links to external pages */}
							<UserButton.UserProfileLink
								label="Full Profile Settings"
								url="/profile"
								labelIcon={<Settings className="h-4 w-4" />}
							/>

							{/* Reorder default pages */}
							<UserButton.UserProfilePage label="account" />
							<UserButton.UserProfilePage label="security" />
						</UserButton>

						{user && (
							<div className="ml-3 grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-medium">
									{user.firstName && user.lastName
										? `${user.firstName} ${user.lastName}`
										: user.firstName ||
											user.username ||
											user.emailAddresses[0]?.emailAddress}
								</span>
								<span className="truncate text-gray-600 text-xs">
									{user.emailAddresses[0]?.emailAddress}
								</span>
							</div>
						)}
					</div>
				</SignedIn>

				<SignedOut>
					<div className="flex w-full items-center">
						<SignInButton mode="modal">
							<SidebarMenuButton size="lg">
								<div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-300">
									<User className="h-4 w-4" />
								</div>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-medium">Sign In</span>
									<span className="truncate text-xs">Access your account</span>
								</div>
							</SidebarMenuButton>
						</SignInButton>
					</div>
				</SignedOut>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
