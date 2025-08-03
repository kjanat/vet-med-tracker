"use client";

import { AlertTriangle, Bell, Clock } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarMenuButton } from "@/components/ui/sidebar";
import { useMediaQuery } from "@/hooks/useMediaQuery";

// Mock data - in real app this would come from tRPC
const mockNotifications = [
	{
		id: "1",
		type: "due",
		title: "Max - Insulin due",
		message: "Due in 15 minutes",
		timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
		priority: "high" as const,
	},
	{
		id: "2",
		type: "overdue",
		title: "Bella - Tramadol overdue",
		message: "Late by 2h 30m",
		timestamp: new Date(Date.now() - 2.5 * 60 * 60 * 1000), // 2.5 hours ago
		priority: "critical" as const,
	},
	{
		id: "3",
		type: "reminder",
		title: "Luna - Medication refill needed",
		message: "Only 3 doses remaining",
		timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
		priority: "medium" as const,
	},
];

export function NotificationsSidebarItem() {
	const [isOpen, setIsOpen] = useState(false);
	const isMobile = useMediaQuery("(max-width: 768px)");

	const unreadCount = mockNotifications.length;

	const getIcon = (type: string) => {
		switch (type) {
			case "due":
				return <Clock className="h-4 w-4 text-orange-500" />;
			case "overdue":
				return <AlertTriangle className="h-4 w-4 text-red-500" />;
			case "reminder":
				return <Bell className="h-4 w-4 text-blue-500" />;
			default:
				return <Bell className="h-4 w-4" />;
		}
	};

	const getPriorityColor = (priority: string) => {
		switch (priority) {
			case "critical":
				return "border-red-500 bg-red-50 text-red-700";
			case "high":
				return "border-orange-500 bg-orange-50 text-orange-700";
			case "medium":
				return "border-blue-500 bg-blue-50 text-blue-700";
			default:
				return "border-gray-500 bg-gray-50 text-gray-700";
		}
	};

	const formatRelativeTime = (timestamp: Date) => {
		const now = new Date();
		const diffMs = now.getTime() - timestamp.getTime();
		const diffMins = Math.floor(diffMs / (1000 * 60));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

		if (diffMins < 60) {
			return `${diffMins}m ago`;
		} else {
			return `${diffHours}h ago`;
		}
	};

	const NotificationContent = () => (
		<>
			<div className="flex items-center justify-between p-4 pb-2">
				<h4 className="font-semibold">Notifications</h4>
				{unreadCount > 0 && (
					<Badge variant="secondary" className="text-xs">
						{unreadCount} new
					</Badge>
				)}
			</div>
			<Separator />

			{mockNotifications.length === 0 ? (
				<div className="p-4 text-center text-muted-foreground text-sm">
					<Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
					<p>No notifications</p>
					<p className="text-xs">You&apos;re all caught up!</p>
				</div>
			) : (
				<div className="max-h-80 overflow-y-auto">
					{mockNotifications.map((notification, index) => (
						<div key={notification.id}>
							<div className="cursor-pointer p-4 hover:bg-muted/50">
								<div className="flex items-start gap-3">
									{getIcon(notification.type)}
									<div className="flex-1 space-y-1">
										<p className="font-medium text-sm leading-none">
											{notification.title}
										</p>
										<p className="text-muted-foreground text-xs">
											{notification.message}
										</p>
										<p className="text-muted-foreground text-xs">
											{formatRelativeTime(notification.timestamp)}
										</p>
									</div>
									<Badge
										variant="outline"
										className={`text-xs ${getPriorityColor(notification.priority)}`}
									>
										{notification.priority}
									</Badge>
								</div>
							</div>
							{index < mockNotifications.length - 1 && <Separator />}
						</div>
					))}
				</div>
			)}

			<Separator />
			<div className="p-2">
				<Button
					variant="ghost"
					size="sm"
					className="w-full cursor-pointer text-xs"
					onClick={() => {
						setIsOpen(false);
						// In real app, navigate to /admin/record or similar
						window.location.href = "/admin/record";
					}}
				>
					View All & Record Doses
				</Button>
			</div>
		</>
	);

	const triggerButton = (
		<SidebarMenuButton size="sm" className="relative cursor-pointer">
			<Bell />
			<span>Notifications</span>
			{unreadCount > 0 && (
				<Badge
					variant="destructive"
					className="ml-auto flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
				>
					{unreadCount > 9 ? "9+" : unreadCount}
				</Badge>
			)}
		</SidebarMenuButton>
	);

	if (isMobile) {
		return (
			<Sheet open={isOpen} onOpenChange={setIsOpen}>
				<SheetTrigger asChild>{triggerButton}</SheetTrigger>
				<SheetContent side="bottom" className="h-[80vh] p-0">
					<SheetHeader className="p-4 pb-2">
						<SheetTitle>Notifications</SheetTitle>
					</SheetHeader>
					<NotificationContent />
				</SheetContent>
			</Sheet>
		);
	}

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
			<PopoverContent className="w-80 p-0" side="right" align="start">
				<NotificationContent />
			</PopoverContent>
		</Popover>
	);
}
