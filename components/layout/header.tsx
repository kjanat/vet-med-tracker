"use client";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import { UserMenu } from "../auth/user-menu";
import { AnimalSwitcher } from "../ui/animal-switcher";
import { HouseholdSwitcher } from "../ui/household-switcher";
import { NotificationDropdown } from "../ui/notification-dropdown";
import { SidebarTrigger } from "../ui/sidebar";
import { SyncStatus } from "../ui/sync-status";

export function Header() {
	const isMobile = useMediaQuery("(max-width: 768px)");

	return (
		<header className="border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
			<div className="flex h-16 items-center justify-between px-4">
				<div className="flex items-center gap-4">
					{/* Desktop: Show sidebar trigger */}
					{!isMobile && <SidebarTrigger />}

					{/* Mobile: Show household switcher */}
					{isMobile && <HouseholdSwitcher />}

					{/* Desktop: Show VetMed Tracker title */}
					{!isMobile && (
						<h1 className="text-lg font-semibold">VetMed Tracker</h1>
					)}
				</div>

				<div className="flex items-center gap-4">
					<SyncStatus />
					{/* Mobile: Show notification dropdown, desktop has it in sidebar */}
					{isMobile && <NotificationDropdown />}
					{/* Mobile: Show user menu in header, desktop shows in sidebar */}
					{isMobile && <UserMenu />}
				</div>
			</div>

			{/* Animal switcher for both mobile and desktop */}
			<div className="px-4 pb-3">
				<AnimalSwitcher />
			</div>
		</header>
	);
}
