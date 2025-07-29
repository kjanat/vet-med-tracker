"use client";

import { UserMenu } from "../auth/user-menu";
import { AnimalSwitcher } from "../ui/animal-switcher";
import { HouseholdSwitcher } from "../ui/household-switcher";
import { NotificationDropdown } from "../ui/notification-dropdown";

export function Header() {
	return (
		<header className="border-b bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60">
			<div className="flex h-16 items-center justify-between px-4">
				<div className="flex items-center gap-4">
					<HouseholdSwitcher />
				</div>

				<div className="flex items-center gap-4">
					<NotificationDropdown />
					<UserMenu />
				</div>
			</div>

			<div className="px-4 pb-3">
				<AnimalSwitcher />
			</div>
		</header>
	);
}
