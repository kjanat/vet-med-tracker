"use client";

import { Building2, Calendar, LogOut, Mail, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/server/trpc/client";

export default function ProfilePage() {
	const router = useRouter();
	const { user, selectedHousehold } = useApp();
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	// Get user's households
	const { data: memberships } = trpc.user.getMemberships.useQuery(undefined, {
		enabled: !!user,
	});

	const handleLogout = async () => {
		setIsLoggingOut(true);
		try {
			await fetch("/api/auth/logout", { method: "POST" });
			router.push("/");
		} catch (error) {
			console.error("Logout failed:", error);
			setIsLoggingOut(false);
		}
	};

	if (!user) {
		return (
			<div className="flex items-center justify-center min-h-[50vh]">
				<div className="text-center">
					<h1 className="text-2xl font-bold mb-2">Not logged in</h1>
					<p className="text-muted-foreground">
						Please log in to view your profile
					</p>
				</div>
			</div>
		);
	}

	const initials =
		user.name
			?.split(" ")
			.map((n) => n[0])
			.join("")
			.toUpperCase() ||
		user.email?.[0]?.toUpperCase() ||
		"?";

	return (
		<div className="container max-w-4xl mx-auto space-y-6">
			{/* Profile Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Profile</h1>
					<p className="text-muted-foreground">Manage your account settings</p>
				</div>
				<Button
					variant="destructive"
					onClick={handleLogout}
					disabled={isLoggingOut}
				>
					<LogOut className="mr-2 h-4 w-4" />
					{isLoggingOut ? "Logging out..." : "Log out"}
				</Button>
			</div>

			{/* User Info Card */}
			<Card>
				<CardHeader>
					<CardTitle>Personal Information</CardTitle>
					<CardDescription>
						Your account details and preferences
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex items-center gap-4">
						<Avatar className="h-20 w-20">
							<AvatarImage
								src={user.image || undefined}
								alt={user.name || "User"}
							/>
							<AvatarFallback className="text-lg">{initials}</AvatarFallback>
						</Avatar>
						<div className="space-y-1">
							<h3 className="text-xl font-semibold">
								{user.name || "Unknown"}
							</h3>
							<p className="text-sm text-muted-foreground flex items-center gap-1">
								<Mail className="h-3 w-3" />
								{user.email}
							</p>
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label className="text-sm font-medium">User ID</Label>
							<p className="text-sm text-muted-foreground font-mono">
								{user.id}
							</p>
						</div>
						<div className="space-y-2">
							<Label className="text-sm font-medium">Account Created</Label>
							<p className="text-sm text-muted-foreground flex items-center gap-1">
								<Calendar className="h-3 w-3" />
								{new Date(user.createdAt).toLocaleDateString()}
							</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Households Card */}
			<Card>
				<CardHeader>
					<CardTitle>Households</CardTitle>
					<CardDescription>Organizations you belong to</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						{memberships?.map((membership) => (
							<div
								key={membership.household.id}
								className={`p-4 rounded-lg border ${
									selectedHousehold?.id === membership.household.id
										? "border-primary bg-primary/5"
										: "border-border"
								}`}
							>
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<div className="p-2 rounded-full bg-muted">
											<Building2 className="h-4 w-4" />
										</div>
										<div>
											<h4 className="font-medium">
												{membership.household.name}
											</h4>
											<p className="text-sm text-muted-foreground">
												{membership.household.type} • Joined{" "}
												{new Date(membership.joinedAt).toLocaleDateString()}
											</p>
										</div>
									</div>
									<div className="flex items-center gap-2">
										<Shield className="h-4 w-4 text-muted-foreground" />
										<span className="text-sm font-medium">
											{membership.role}
										</span>
									</div>
								</div>
							</div>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Preferences Card */}
			<Card>
				<CardHeader>
					<CardTitle>Preferences</CardTitle>
					<CardDescription>Notification and display settings</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="email-notifications">Email Notifications</Label>
							<p className="text-sm text-muted-foreground">
								Receive medication reminders via email
							</p>
						</div>
						<Switch id="email-notifications" />
					</div>
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="push-notifications">Push Notifications</Label>
							<p className="text-sm text-muted-foreground">
								Receive medication reminders on your device
							</p>
						</div>
						<Switch id="push-notifications" />
					</div>
					<div className="flex items-center justify-between">
						<div className="space-y-0.5">
							<Label htmlFor="reminder-sounds">Reminder Sounds</Label>
							<p className="text-sm text-muted-foreground">
								Play sounds for medication reminders
							</p>
						</div>
						<Switch id="reminder-sounds" defaultChecked />
					</div>
				</CardContent>
			</Card>

			{/* Security Card */}
			<Card>
				<CardHeader>
					<CardTitle>Security</CardTitle>
					<CardDescription>Manage your account security</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex items-center justify-between">
						<div>
							<h4 className="font-medium">Two-Factor Authentication</h4>
							<p className="text-sm text-muted-foreground">
								Add an extra layer of security to your account
							</p>
						</div>
						<Button variant="outline" size="sm">
							Enable
						</Button>
					</div>
					<div className="flex items-center justify-between">
						<div>
							<h4 className="font-medium">Active Sessions</h4>
							<p className="text-sm text-muted-foreground">
								Manage devices where you&apos;re logged in
							</p>
						</div>
						<Button variant="outline" size="sm">
							View Sessions
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
