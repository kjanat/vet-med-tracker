"use client";

import { Suspense } from "react";
import { MemberList } from "@/components/household/member-list";
import { EscalationPanel } from "@/components/notifications/escalation-panel";
import { PushPanel } from "@/components/notifications/push-panel";
import { DataPanel } from "@/components/settings/data/data-panel";
import { PrefsPanel } from "@/components/settings/preferences/prefs-panel";
import { SettingsNavigation } from "@/components/settings/settings-navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { type SettingsTab, useSettingsTabs } from "@/hooks/useSettingsTabs";

function SettingsContent() {
	const { activeTab, setActiveTab } = useSettingsTabs();

	return (
		<div className="space-y-6">
			<div>
				<h1 className="font-bold text-2xl md:text-3xl">Settings</h1>
				<p className="text-muted-foreground text-sm md:text-base">
					Manage household, data privacy, notifications, and application
					preferences
				</p>
			</div>

			<Tabs
				value={activeTab}
				onValueChange={(value) => setActiveTab(value as SettingsTab)}
			>
				{/* Settings navigation with skeleton loader */}
				<SettingsNavigation activeTab={activeTab} onTabChange={setActiveTab} />

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
		<Suspense
			fallback={<div className="min-h-screen animate-pulse bg-background" />}
		>
			<SettingsContent />
		</Suspense>
	);
}
