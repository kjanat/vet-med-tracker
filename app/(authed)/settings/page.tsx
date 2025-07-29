"use client";

import { AnimalList } from "@/components/settings/animals/animal-list";
import { DataPanel } from "@/components/settings/data/data-panel";
import { MemberList } from "@/components/settings/household/member-list";
import { EscalationPanel } from "@/components/settings/notifications/escalation-panel";
import { PushPanel } from "@/components/settings/notifications/push-panel";
import { PrefsPanel } from "@/components/settings/preferences/prefs-panel";
import { RegimenList } from "@/components/settings/regimens/regimen-list";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useSettingsTabs } from "@/hooks/useSettingsTabs";

export default function SettingsPage() {
	const { activeTab, setActiveTab } = useSettingsTabs();
	const isMobile = useMediaQuery("(max-width: 640px)");

	const tabs = [
		{ value: "animals", label: "Animals" },
		{ value: "regimens", label: "Regimens" },
		{ value: "household", label: "Household" },
		{ value: "notifications", label: "Notifications" },
		{ value: "data", label: "Data & Privacy" },
		{ value: "preferences", label: "Preferences" },
	];

	return (
		<div className="min-h-screen bg-background max-w-full overflow-x-hidden">
			<div className="p-4 md:p-6 space-y-6">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
					<p className="text-sm md:text-base text-muted-foreground">
						Manage your household, animals, and preferences
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

				<Tabs value={activeTab} onValueChange={setActiveTab}>
					{/* Desktop: Tab list */}
					{!isMobile && (
						<TabsList className="w-full h-auto p-1 grid grid-cols-3 lg:grid-cols-6 gap-1">
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

					<TabsContent value="animals" className="mt-6 w-full overflow-x-auto">
						<AnimalList />
					</TabsContent>

					<TabsContent value="regimens" className="mt-6 w-full overflow-x-auto">
						<RegimenList />
					</TabsContent>

					<TabsContent
						value="household"
						className="mt-6 w-full overflow-x-auto"
					>
						<MemberList />
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

					<TabsContent value="data" className="mt-6 w-full overflow-x-auto">
						<DataPanel />
					</TabsContent>

					<TabsContent
						value="preferences"
						className="mt-6 w-full overflow-x-auto"
					>
						<PrefsPanel />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
}
