"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { useApp } from "@/components/providers/app-provider-consolidated";
import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { getSettingsTabs } from "@/lib/navigation/utils";

export default function SettingsPage() {
	const { selectedHousehold } = useApp();
	const settingsTabs = getSettingsTabs();

	return (
		<div className="space-y-6">
			<p className="text-muted-foreground">
				Manage your account and application settings
			</p>

			<div className="grid gap-4 md:grid-cols-2">
				{settingsTabs.map((tab) => {
					const Icon = tab.icon as LucideIcon;

					// Skip tabs without valid paths
					if (!tab.path) {
						return (
							<Card
								key={tab.title}
								className="h-full cursor-not-allowed opacity-50"
							>
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										{Icon && <Icon className="h-5 w-5" />}
										{tab.title} (Coming Soon)
									</CardTitle>
									<CardDescription>{tab.description}</CardDescription>
								</CardHeader>
							</Card>
						);
					}

					return (
						<Link key={tab.path} href={tab.path}>
							<Card className="h-full transition-colors hover:bg-accent">
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										{Icon && <Icon className="h-5 w-5" />}
										{tab.title}
									</CardTitle>
									<CardDescription>{tab.description}</CardDescription>
								</CardHeader>
							</Card>
						</Link>
					);
				})}
			</div>

			{!selectedHousehold && (
				<p className="text-center text-muted-foreground text-sm">
					Select a household to manage household-specific settings
				</p>
			)}
		</div>
	);
}
