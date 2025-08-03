"use client";

import { Suspense } from "react";
import { type Member, MemberList } from "@/components/household/member-list";
import { EscalationPanel } from "@/components/notifications/escalation-panel";
import { PushPanel } from "@/components/notifications/push-panel";
import { useApp } from "@/components/providers/app-provider";
import { DataPanel } from "@/components/settings/data/data-panel";
import { PrefsPanel } from "@/components/settings/preferences/prefs-panel";
import { SettingsNavigation } from "@/components/settings/settings-navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { type SettingsTab, useSettingsTabs } from "@/hooks/useSettingsTabs";
import { trpc } from "@/server/trpc/client";

function SettingsContent() {
	const { activeTab, setActiveTab } = useSettingsTabs();
	const { selectedHousehold, user } = useApp();

	// Fetch household members
	const { data: membersData, isLoading: membersLoading } =
		trpc.household.getMembers.useQuery(
			{ householdId: selectedHousehold?.id ?? "" },
			{ enabled: !!selectedHousehold?.id },
		);

	// Transform the data to match the MemberList component's expected format
	const members: Member[] =
		membersData?.map((member) => ({
			id: member.id,
			userId: member.userId,
			email: member.user.email,
			name: member.user.name || undefined,
			avatar: member.user.image || undefined,
			role: member.role,
			joinedAt: new Date(member.createdAt),
			lastActiveAt: member.updatedAt ? new Date(member.updatedAt) : undefined,
		})) ?? [];

	// Find the current user's role in the household
	const currentUserMembership = membersData?.find(
		(member) => member.userId === user?.id,
	);
	const userRole = currentUserMembership?.role;

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
					{membersLoading ? (
						<div className="animate-pulse space-y-4">
							<div className="h-24 rounded-lg bg-muted" />
							<div className="h-24 rounded-lg bg-muted" />
							<div className="h-24 rounded-lg bg-muted" />
						</div>
					) : (
						<MemberList members={members} userRole={userRole} />
					)}
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
