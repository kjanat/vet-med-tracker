"use client";

import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCircle, Clock, Package } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
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
import { trpc } from "@/server/trpc/client";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string | null;
  priority: string;
}

interface NotificationDropdownProps {
  householdId?: string;
}

export function NotificationDropdown({
  householdId,
}: NotificationDropdownProps) {
  const [open, setOpen] = useState(false);
  const { selectedHouseholdId } = useApp();

  // Use provided householdId or fall back to current household
  const effectiveHouseholdId = householdId || selectedHouseholdId;

  // Fetch notifications
  const { data: notifications = [], refetch: refetchNotifications } =
    trpc.notifications.list.useQuery({
      householdId: effectiveHouseholdId || undefined,
      limit: 20,
    });

  // Fetch unread count
  const { data: unreadCount = 0, refetch: refetchUnreadCount } =
    trpc.notifications.getUnreadCount.useQuery({
      householdId: effectiveHouseholdId || undefined,
    });

  // Mutations
  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      refetchNotifications();
      refetchUnreadCount();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      refetchNotifications();
      refetchUnreadCount();
    },
  });

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

  const handleNotificationClick = async (notification: Notification) => {
    // Mark as read if not already read
    if (!notification.read) {
      try {
        await markAsReadMutation.mutateAsync({ id: notification.id });
      } catch (error) {
        console.error("Failed to mark notification as read:", error);
      }
    }

    // Navigate to action URL if available
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    setOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsReadMutation.mutateAsync({
        householdId: effectiveHouseholdId || undefined,
      });
    } catch (error) {
      console.error("Failed to mark all notifications as read:", error);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="-top-1 -right-1 absolute flex h-5 w-5 items-center justify-center rounded-full p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[280px] sm:w-[380px]">
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
        <ScrollArea className="h-[300px] sm:h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className="flex cursor-pointer items-start gap-3 p-4"
                onClick={() => handleNotificationClick(notification)}
              >
                <div
                  className={getIconColor(notification.type, notification.read)}
                >
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <p
                    className={`font-medium text-sm leading-none ${
                      notification.read ? "text-muted-foreground" : ""
                    }`}
                  >
                    {notification.title}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {notification.message}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {formatDistanceToNow(new Date(notification.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {!notification.read && (
                  <div className="mt-1.5 h-2 w-2 rounded-full bg-blue-500" />
                )}
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
