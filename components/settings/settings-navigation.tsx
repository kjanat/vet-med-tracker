"use client";

import { useEffect, useState } from "react";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SettingsTab } from "@/hooks/settings/useSettingsTabs";
import { useIsMobile } from "@/hooks/shared/useResponsive";

interface SettingsNavigationProps {
	activeTab: SettingsTab;
	onTabChange: (tab: SettingsTab) => void;
}

const tabs = [
	{ value: "data", label: "Data & Privacy" },
	{ value: "preferences", label: "Preferences" },
	{ value: "notifications", label: "Notifications" },
] as const;

export function SettingsNavigation({
	activeTab,
	onTabChange,
}: SettingsNavigationProps) {
	const [isClient, setIsClient] = useState(false);
	const isMobile = useIsMobile();

	useEffect(() => {
		setIsClient(true);
	}, []);

	// Show skeleton while determining which UI to show
	if (!isClient) {
		return (
			<div className="w-full">
				{/* Mobile skeleton - single select height */}
				<div className="sm:hidden">
					<Skeleton className="h-10 w-full" />
				</div>
				{/* Desktop skeleton - tab list height */}
				<div className="hidden sm:block">
					<Skeleton className="h-12 w-full" />
				</div>
			</div>
		);
	}

	// Mobile: Select dropdown
	if (isMobile) {
		return (
			<Select value={activeTab} onValueChange={onTabChange}>
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
		);
	}

	// Desktop: Tab list
	return (
		<TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1">
			{tabs.map((tab) => (
				<TabsTrigger
					key={tab.value}
					value={tab.value}
					className="min-h-[44px] w-full justify-start"
				>
					{tab.label}
				</TabsTrigger>
			))}
		</TabsList>
	);
}
