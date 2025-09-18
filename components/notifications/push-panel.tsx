"use client";

import { Bell, BellOff, Smartphone, TestTube } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "@/hooks/shared/use-toast";
import { useIsMobile } from "@/hooks/shared/useResponsive";
import { trpc } from "@/server/trpc/client";

// Custom hook to manage push notification state
function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");

  // tRPC hooks
  const vapidKeyQuery = trpc.notifications.getVAPIDPublicKey.useQuery();
  const subscriptionsQuery =
    trpc.notifications.listPushSubscriptions.useQuery();
  const subscribeMutation = trpc.notifications.subscribeToPush.useMutation();
  const unsubscribeMutation =
    trpc.notifications.unsubscribeFromPush.useMutation();
  const testMutation = trpc.notifications.sendTestNotification.useMutation();

  const checkSubscriptionStatus = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const hasLocalSubscription = Boolean(subscription);
      const hasServerSubscription = (subscriptionsQuery.data?.length || 0) > 0;

      setIsSubscribed(hasLocalSubscription && hasServerSubscription);
    } catch (error) {
      console.error("Failed to check subscription status:", error);
    }
  }, [subscriptionsQuery.data]);

  useEffect(() => {
    // Check if push notifications are supported
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission);
      checkSubscriptionStatus();
    }
  }, [checkSubscriptionStatus]);

  return {
    isLoading,
    isSubscribed,
    isSupported,
    permission,
    setIsLoading,
    setIsSubscribed,
    setPermission,
    subscribeMutation,
    subscriptions: subscriptionsQuery.data || [],
    testMutation,
    unsubscribeMutation,
    vapidPublicKey: vapidKeyQuery.data?.publicKey,
  };
}

export function PushPanel() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    setIsSubscribed,
    setIsLoading,
    setPermission,
    vapidPublicKey,
    subscriptions,
    subscribeMutation,
    unsubscribeMutation,
    testMutation,
  } = usePushNotifications();
  const isMobile = useIsMobile();

  const subscribeToPush = async () => {
    if (!isSupported || !vapidPublicKey) {
      toast({
        description:
          "Push notifications are not supported or VAPID key is not available",
        title: "Error",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult !== "granted") {
        toast({
          description:
            "Please allow notifications to receive medication reminders",
          title: "Permission Required",
          variant: "destructive",
        });
        return;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        userVisibleOnly: true,
      });

      const subscriptionData = subscription.toJSON();

      // Send subscription to server via tRPC
      await subscribeMutation.mutateAsync({
        deviceInfo: {
          deviceName: getDeviceName(),
          userAgent: navigator.userAgent,
        },
        endpoint: subscription.endpoint,
        keys: {
          auth: subscriptionData.keys?.auth || "",
          p256dh: subscriptionData.keys?.p256dh || "",
        },
      });

      // Fire instrumentation event
      window.dispatchEvent(
        new CustomEvent("settings_notifications_subscribe", {
          detail: { endpoint: subscription.endpoint },
        }),
      );

      setIsSubscribed(true);
      toast({
        description: "You're now subscribed to push notifications",
        title: "Success!",
      });
    } catch (error) {
      console.error("Failed to subscribe to push notifications:", error);
      toast({
        description:
          "Failed to subscribe to push notifications. Please try again.",
        title: "Error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
    if (!isSupported) return;

    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from server first
        await unsubscribeMutation.mutateAsync({
          endpoint: subscription.endpoint,
        });

        // Then unsubscribe locally
        await subscription.unsubscribe();

        console.log("Unsubscribed from push notifications");
        toast({
          description: "You will no longer receive push notifications",
          title: "Unsubscribed",
        });
      }

      setIsSubscribed(false);
    } catch (error) {
      console.error("Failed to unsubscribe from push notifications:", error);
      toast({
        description: "Failed to unsubscribe. Please try again.",
        title: "Error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const sendTestNotification = async () => {
    if (!isSubscribed) {
      toast({
        description: "Please subscribe to push notifications first",
        title: "Not Subscribed",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await testMutation.mutateAsync();
      toast({
        description: `Sent ${result.sent} notification(s), ${result.failed} failed`,
        title: "Test Sent!",
      });
    } catch (error) {
      console.error("Failed to send test notification:", error);
      toast({
        description: "Failed to send test notification. Please try again.",
        title: "Error",
        variant: "destructive",
      });
    }
  };

  if (!isSupported) {
    return <UnsupportedBrowser />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>Get reminded when medications are due</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isMobile ? (
          <MobileLayout
            isLoading={isLoading}
            isSubscribed={isSubscribed}
            isTestLoading={testMutation.isPending}
            onSubscribe={subscribeToPush}
            onTest={sendTestNotification}
            onUnsubscribe={unsubscribeFromPush}
            permission={permission}
          />
        ) : (
          <DesktopLayout
            isLoading={isLoading}
            isSubscribed={isSubscribed}
            isTestLoading={testMutation.isPending}
            onSubscribe={subscribeToPush}
            onTest={sendTestNotification}
            onUnsubscribe={unsubscribeFromPush}
            permission={permission}
          />
        )}

        {permission === "denied" && (
          <Alert>
            <AlertDescription>
              To enable notifications, click the lock icon in your
              browser&apos;s address bar and allow notifications for this site.
            </AlertDescription>
          </Alert>
        )}

        {subscriptions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Active Devices</h4>
            <div className="space-y-1">
              {subscriptions.map((sub) => (
                <div className="text-muted-foreground text-xs" key={sub.id}>
                  {sub.deviceName || "Unknown Device"} - Last used:{" "}
                  {new Date(sub.lastUsed).toLocaleDateString()}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Helper components
function UnsupportedBrowser() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellOff className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>Get reminded when medications are due</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert>
          <Smartphone className="h-4 w-4" />
          <AlertDescription>
            Push notifications are not supported in this browser.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

function MobileLayout({
  permission,
  isSubscribed,
  isLoading,
  onSubscribe,
  onUnsubscribe,
  onTest,
  isTestLoading,
}: {
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
  onTest: () => void;
  isTestLoading: boolean;
}) {
  return (
    <>
      {permission !== "denied" && (
        <div className="space-y-2">
          <SubscriptionButton
            className="w-full"
            isLoading={isLoading}
            isSubscribed={isSubscribed}
            onSubscribe={onSubscribe}
            onUnsubscribe={onUnsubscribe}
          />
          {isSubscribed && (
            <Button
              className="w-full"
              disabled={isTestLoading}
              onClick={onTest}
              variant="outline"
            >
              <TestTube className="mr-2 h-4 w-4" />
              {isTestLoading ? "Sending..." : "Send Test"}
            </Button>
          )}
        </div>
      )}
      {permission === "denied" && (
        <div className="text-center text-muted-foreground text-sm">
          Notifications are blocked. Enable them in your browser settings.
        </div>
      )}
    </>
  );
}

function DesktopLayout({
  permission,
  isSubscribed,
  isLoading,
  onSubscribe,
  onUnsubscribe,
  onTest,
  isTestLoading,
}: {
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
  onTest: () => void;
  isTestLoading: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <StatusDisplay isSubscribed={isSubscribed} permission={permission} />
      {permission !== "denied" && (
        <div className="flex gap-2">
          <SubscriptionButton
            isLoading={isLoading}
            isSubscribed={isSubscribed}
            onSubscribe={onSubscribe}
            onUnsubscribe={onUnsubscribe}
          />
          {isSubscribed && (
            <Button
              disabled={isTestLoading}
              onClick={onTest}
              size="sm"
              variant="outline"
            >
              <TestTube className="mr-2 h-4 w-4" />
              {isTestLoading ? "Sending..." : "Test"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function StatusDisplay({
  permission,
  isSubscribed,
}: {
  permission: NotificationPermission;
  isSubscribed: boolean;
}) {
  const status = isSubscribed
    ? "Subscribed"
    : permission === "denied"
      ? "Blocked"
      : "Not subscribed";

  const description = isSubscribed
    ? "You'll receive push notifications for medication reminders"
    : permission === "denied"
      ? "Notifications are blocked. Enable them in your browser settings."
      : "Subscribe to receive medication reminders";

  return (
    <div>
      <div className="font-medium">Status: {status}</div>
      <div className="text-muted-foreground text-sm">{description}</div>
    </div>
  );
}

function SubscriptionButton({
  isSubscribed,
  isLoading,
  onSubscribe,
  onUnsubscribe,
  className,
}: {
  isSubscribed: boolean;
  isLoading: boolean;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
  className?: string;
}) {
  return (
    <Button
      className={className}
      disabled={isLoading}
      onClick={isSubscribed ? onUnsubscribe : onSubscribe}
      variant={
        isSubscribed
          ? className?.includes("w-full")
            ? "destructive"
            : "outline"
          : "default"
      }
    >
      {isLoading ? "Loading..." : isSubscribed ? "Unsubscribe" : "Subscribe"}
    </Button>
  );
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Helper function to get a friendly device name
function getDeviceName(): string {
  const userAgent = navigator.userAgent;

  if (userAgent.includes("iPhone")) return "iPhone";
  if (userAgent.includes("iPad")) return "iPad";
  if (userAgent.includes("Android")) return "Android Device";
  if (userAgent.includes("Windows")) return "Windows PC";
  if (userAgent.includes("Macintosh")) return "Mac";
  if (userAgent.includes("Linux")) return "Linux PC";

  return "Web Browser";
}
