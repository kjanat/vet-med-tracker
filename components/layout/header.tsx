"use client";

import { useMediaQuery } from "@/hooks/useMediaQuery";
import { UserMenu } from "../auth/user-menu";
import { AnimalBreadcrumb } from "../ui/animal-breadcrumb";
import { HouseholdSwitcher } from "../ui/household-switcher";
import { Logo } from "../ui/logo";
import { NotificationDropdown } from "../ui/notification-dropdown";
import { SidebarTrigger } from "../ui/sidebar";
import { SyncStatus } from "../ui/sync-status";

export function Header() {
	const isMobile = useMediaQuery("(max-width: 768px)");

	return (
		<header className="w-full border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
			<div className="flex h-14 items-center justify-between px-4">
				<div className="flex items-center gap-4">
					{/* Desktop: Show sidebar trigger */}
					{!isMobile && <SidebarTrigger />}

					{/* Mobile: Show household switcher */}
					{isMobile && <HouseholdSwitcher />}

					{/* Desktop: Show VetMed Tracker title */}
					{!isMobile && (
						<h1 className="font-semibold text-lg">VetMed Tracker</h1>
					)}

					{/* Animal breadcrumb - integrated into main header row */}
					<AnimalBreadcrumb />
				</div>

				<div className="flex items-center gap-4">
					<SyncStatus />
					{/* Mobile: Show notification dropdown, desktop has it in sidebar */}
					{isMobile && <NotificationDropdown />}
					{/* Mobile: Show user menu in header, desktop shows in sidebar */}
					{isMobile && <UserMenu />}
					{/* Logo - always shown on the right */}
					<Logo size={isMobile ? "sm" : "md"} />
				</div>
			</div>
		</header>
	);
}
