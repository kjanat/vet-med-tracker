"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCircle, Clock, Package } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
	id: string;
	type: "medication" | "inventory" | "system";
	title: string;
	message: string;
	timestamp: Date;
	read: boolean;
	actionUrl?: string;
}

interface NotificationDropdownProps {
	notifications?: Notification[];
	notificationCount?: number;
}

// Mock notifications - replace with tRPC query
const mockNotifications: Notification[] = [
	{
		id: "1",
		type: "medication",
		title: "Buddy - Medication Due",
		message: "Rimadyl 75mg due now",
		timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
		read: false,
		actionUrl: "/admin/record",
	},
	{
		id: "2",
		type: "medication",
		title: "Whiskers - Late Dose",
		message: "Insulin is 30 minutes late",
		timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
		read: false,
		actionUrl: "/admin/record",
	},
	{
		id: "3",
		type: "inventory",
		title: "Low Stock Alert",
		message: "Rimadyl running low - 5 doses left",
		timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
		read: false,
		actionUrl: "/inventory",
	},
	{
		id: "4",
		type: "inventory",
		title: "Medication Expiring",
		message: "Joint Supplement expires in 7 days",
		timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000), // 12 hours ago
		read: true,
		actionUrl: "/inventory",
	},
	{
		id: "5",
		type: "system",
		title: "Sync Complete",
		message: "All records synced successfully",
		timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
		read: true,
	},
];

export function NotificationDropdown({
	notifications = mockNotifications,
	notificationCount,
}: NotificationDropdownProps) {
	const [open, setOpen] = useState(false);
	const unreadCount =
		notificationCount ?? notifications.filter((n) => !n.read).length;

	const getIcon = (type: Notification["type"]) => {
		switch (type) {
			case "medication":
				return <Clock className="h-4 w-4" />;
			case "inventory":
				return <Package className="h-4 w-4" />;
			case "system":
				return <CheckCircle className="h-4 w-4" />;
		}
	};

	const getIconColor = (type: Notification["type"], read: boolean) => {
		if (read) return "text-muted-foreground";
		switch (type) {
			case "medication":
				return "text-red-500";
			case "inventory":
				return "text-yellow-500";
			case "system":
				return "text-blue-500";
		}
	};

	const handleNotificationClick = (notification: Notification) => {
		// TODO: Mark as read via tRPC mutation
		console.log("Marking as read:", notification.id);

		if (notification.actionUrl) {
			window.location.href = notification.actionUrl;
		}
		setOpen(false);
	};

	const handleMarkAllAsRead = () => {
		// TODO: Mark all as read via tRPC mutation
		console.log("Marking all as read");
	};

	return (
		<DropdownMenu open={open} onOpenChange={setOpen}>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="relative">
					<Bell className="h-5 w-5" />
					{unreadCount > 0 && (
						<Badge
							variant="destructive"
							className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
						>
							{unreadCount}
						</Badge>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-[380px]">
				<div className="flex items-center justify-between p-2">
					<DropdownMenuLabel>Notifications</DropdownMenuLabel>
					{unreadCount > 0 && (
						<Button
							variant="ghost"
							size="sm"
							className="h-auto p-0 text-xs hover:bg-transparent"
							onClick={handleMarkAllAsRead}
						>
							Mark all as read
						</Button>
					)}
				</div>
				<DropdownMenuSeparator />
				<ScrollArea className="h-[400px]">
					{notifications.length === 0 ? (
						<div className="p-4 text-center text-muted-foreground">
							No notifications
						</div>
					) : (
						notifications.map((notification) => (
							<DropdownMenuItem
								key={notification.id}
								className="flex items-start gap-3 p-4 cursor-pointer"
								onClick={() => handleNotificationClick(notification)}
							>
								<div
									className={getIconColor(notification.type, notification.read)}
								>
									{getIcon(notification.type)}
								</div>
								<div className="flex-1 space-y-1">
									<p
										className={`text-sm font-medium leading-none ${
											notification.read ? "text-muted-foreground" : ""
										}`}
									>
										{notification.title}
									</p>
									<p className="text-sm text-muted-foreground">
										{notification.message}
									</p>
									<p className="text-xs text-muted-foreground">
										{formatDistanceToNow(notification.timestamp, {
											addSuffix: true,
										})}
									</p>
								</div>
								{!notification.read && (
									<div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5" />
								)}
							</DropdownMenuItem>
						))
					)}
				</ScrollArea>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
