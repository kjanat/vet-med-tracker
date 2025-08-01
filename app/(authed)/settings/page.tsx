"use client";

import { Suspense } from "react";
import { MemberList } from "@/components/household/member-list";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { EscalationPanel } from "@/components/notifications/escalation-panel";
import { PushPanel } from "@/components/notifications/push-panel";
import { DataPanel } from "@/components/settings/data/data-panel";
import { PrefsPanel } from "@/components/settings/preferences/prefs-panel";
import { AnimalBreadcrumb } from "@/components/ui/animal-breadcrumb";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { type SettingsTab, useSettingsTabs } from "@/hooks/useSettingsTabs";

function SettingsContent() {
	const { activeTab, setActiveTab } = useSettingsTabs();
	const isMobile = useMediaQuery("(max-width: 640px)");

	const tabs = [
		{ value: "data", label: "Data & Privacy" },
		{ value: "preferences", label: "Preferences" },
		{ value: "notifications", label: "Notifications" },
		{ value: "household", label: "Household" },
	];

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
				<p className="text-sm md:text-base text-muted-foreground">
					Manage household, data privacy, notifications, and application
					preferences
				</p>
			</div>

			{/* Mobile: Select dropdown */}
			{isMobile && (
				<Select value={activeTab} onValueChange={setActiveTab}>
					<SelectTrigger className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{tabs.map((tab) => (
							<SelectItem key={tab.value} value={tab.value}>
								{tab.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}

			<Tabs
				value={activeTab}
				onValueChange={(value) => setActiveTab(value as SettingsTab)}
			>
				{/* Desktop: Tab list */}
				{!isMobile && (
					<TabsList className="w-full h-auto p-1 grid grid-cols-4 gap-1">
						{tabs.map((tab) => (
							<TabsTrigger
								key={tab.value}
								value={tab.value}
								className="w-full justify-start min-h-[44px]"
							>
								{tab.label}
							</TabsTrigger>
						))}
					</TabsList>
				)}

				<TabsContent value="data" className="mt-6 w-full overflow-x-auto">
					<DataPanel />
				</TabsContent>

				<TabsContent
					value="preferences"
					className="mt-6 w-full overflow-x-auto"
				>
					<PrefsPanel />
				</TabsContent>

				<TabsContent
					value="notifications"
					className="mt-6 w-full overflow-x-auto"
				>
					<div className="space-y-6">
						<PushPanel />
						<EscalationPanel />
					</div>
				</TabsContent>

				<TabsContent value="household" className="mt-6 w-full overflow-x-auto">
					<MemberList />
				</TabsContent>
			</Tabs>
		</div>
	);
}

export default function SettingsPage() {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator orientation="vertical" className="mr-2 h-4" />
					<AnimalBreadcrumb />
				</header>
				<div className="flex flex-1 flex-col gap-4 p-4 pt-6">
					<Suspense
						fallback={
							<div className="min-h-screen bg-background animate-pulse" />
						}
					>
						<SettingsContent />
					</Suspense>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
