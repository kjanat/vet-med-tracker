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
import { SidebarMenuButton } from "@/components/ui/sidebar";

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

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<SidebarMenuButton size="sm" className="relative cursor-pointer">
					<Bell />
					<span>Notifications</span>
					{unreadCount > 0 && (
						<Badge
							variant="destructive"
							className="ml-auto h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
						>
							{unreadCount > 9 ? "9+" : unreadCount}
						</Badge>
					)}
				</SidebarMenuButton>
			</PopoverTrigger>
			<PopoverContent className="w-80 p-0" side="right" align="start">
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
					<div className="p-4 text-center text-sm text-muted-foreground">
						<Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
						<p>No notifications</p>
						<p className="text-xs">You&apos;re all caught up!</p>
					</div>
				) : (
					<div className="max-h-80 overflow-y-auto">
						{mockNotifications.map((notification, index) => (
							<div key={notification.id}>
								<div className="p-4 hover:bg-muted/50 cursor-pointer">
									<div className="flex items-start gap-3">
										{getIcon(notification.type)}
										<div className="flex-1 space-y-1">
											<p className="text-sm font-medium leading-none">
												{notification.title}
											</p>
											<p className="text-xs text-muted-foreground">
												{notification.message}
											</p>
											<p className="text-xs text-muted-foreground">
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
						className="w-full text-xs cursor-pointer"
						onClick={() => {
							setIsOpen(false);
							// In real app, navigate to /admin/record or similar
							window.location.href = "/admin/record";
						}}
					>
						View All & Record Doses
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
