"use client";

import { Bell, Database, Home, Settings2 } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/components/providers/app-provider";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

const settingsCards = [
	{
		title: "Preferences",
		description: "Customize your app experience and display settings",
		href: "/settings/preferences" as const,
		icon: Settings2,
	},
	{
		title: "Notifications",
		description: "Configure alerts and notification preferences",
		href: "/settings/notifications" as const,
		icon: Bell,
	},
	{
		title: "Household",
		description: "Manage household members and permissions",
		href: "/settings/household" as const,
		icon: Home,
	},
	{
		title: "Data & Privacy",
		description: "Export your data and manage privacy settings",
		href: "/settings/data-privacy" as const,
		icon: Database,
	},
] as const;

export default function SettingsPage() {
	const { selectedHousehold } = useApp();

	return (
		<div className="space-y-6">
			<p className="text-muted-foreground">
				Manage your account and application settings
			</p>

			<div className="grid gap-4 md:grid-cols-2">
				{settingsCards.map((card) => (
					<Link key={card.href} href={card.href}>
						<Card className="h-full transition-colors hover:bg-accent">
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<card.icon className="h-5 w-5" />
									{card.title}
								</CardTitle>
								<CardDescription>{card.description}</CardDescription>
							</CardHeader>
						</Card>
					</Link>
				))}
			</div>

			{!selectedHousehold && (
				<p className="text-center text-muted-foreground text-sm">
					Select a household to manage household-specific settings
				</p>
			)}
		</div>
	);
}
