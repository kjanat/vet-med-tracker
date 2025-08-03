"use client";

import type { Route } from "next";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LoadingIndicator } from "@/components/ui/loading-indicator";

export default function SettingsLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const searchParams = useSearchParams();
	const currentTab = searchParams.get("tab") || "general";

	const tabs = [
		{ id: "general", label: "General", href: "/settings" },
		{ id: "data", label: "Data & Privacy", href: "/settings?tab=data" },
		{
			id: "preferences",
			label: "Preferences",
			href: "/settings?tab=preferences",
		},
		{
			id: "notifications",
			label: "Notifications",
			href: "/settings?tab=notifications",
		},
	];

	return (
		<div className="space-y-6">
			<div>
				<h2 className="font-bold text-2xl tracking-tight">Settings</h2>
				<p className="text-muted-foreground">
					Manage your account settings and preferences.
				</p>
			</div>

			<div className="border-b">
				<nav className="-mb-px flex space-x-8" aria-label="Settings tabs">
					{tabs.map((tab) => (
						<Link
							key={tab.id}
							href={tab.href as Route}
							className={`whitespace-nowrap border-b-2 px-1 py-4 font-medium text-sm transition-colors ${
								currentTab === tab.id
									? "border-primary text-foreground"
									: "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
							}`}
							aria-current={currentTab === tab.id ? "page" : undefined}
						>
							{tab.label}
							<LoadingIndicator />
						</Link>
					))}
				</nav>
			</div>

			<div>{children}</div>
		</div>
	);
}
