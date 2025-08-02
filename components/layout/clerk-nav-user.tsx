"use client";

import {
	SignedIn,
	SignedOut,
	SignInButton,
	UserButton,
	useUser,
} from "@clerk/nextjs";
import { Heart, Home, Settings, User } from "lucide-react";
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
						<div className="h-8 w-8 rounded-lg bg-gray-200 animate-pulse" />
						<div className="grid flex-1 text-left text-sm leading-tight">
							<div className="h-4 bg-gray-200 rounded animate-pulse" />
							<div className="h-3 bg-gray-200 rounded animate-pulse mt-1" />
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
					<div className="flex items-center w-full">
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
								labelIcon={<Heart className="w-4 h-4" />}
							>
								<div className="p-4">
									<h2 className="text-lg font-semibold mb-4">
										VetMed Preferences
									</h2>
									<p className="text-gray-600 mb-4">
										Configure your medication tracking preferences, timezones,
										and notification settings.
									</p>
									<Button
										onClick={() => router.push("/profile/vetmed-preferences")}
									>
										Go to Full Settings
									</Button>
								</div>
							</UserButton.UserProfilePage>

							<UserButton.UserProfilePage
								label="Household Settings"
								url="household-settings"
								labelIcon={<Home className="w-4 h-4" />}
							>
								<div className="p-4">
									<h2 className="text-lg font-semibold mb-4">
										Household Settings
									</h2>
									<p className="text-gray-600 mb-4">
										Manage your household information, locations, and veterinary
										contacts.
									</p>
									<Button
										onClick={() => router.push("/profile/household-settings")}
									>
										Go to Full Settings
									</Button>
								</div>
							</UserButton.UserProfilePage>

							{/* Links to external pages */}
							<UserButton.UserProfileLink
								label="Full Profile Settings"
								url="/profile"
								labelIcon={<Settings className="w-4 h-4" />}
							/>

							{/* Reorder default pages */}
							<UserButton.UserProfilePage label="account" />
							<UserButton.UserProfilePage label="security" />
						</UserButton>

						{user && (
							<div className="grid flex-1 text-left text-sm leading-tight ml-3">
								<span className="truncate font-medium">
									{user.firstName && user.lastName
										? `${user.firstName} ${user.lastName}`
										: user.firstName ||
											user.username ||
											user.emailAddresses[0]?.emailAddress}
								</span>
								<span className="truncate text-xs text-gray-600">
									{user.emailAddresses[0]?.emailAddress}
								</span>
							</div>
						)}
					</div>
				</SignedIn>

				<SignedOut>
					<div className="flex items-center w-full">
						<SignInButton mode="modal">
							<SidebarMenuButton size="lg">
								<div className="h-8 w-8 rounded-lg bg-gray-300 flex items-center justify-center">
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
