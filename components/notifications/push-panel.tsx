"use client";

import { Bell, BellOff, Smartphone } from "lucide-react";
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
import { useIsMobile } from "@/hooks/shared/useResponsive";

// Custom hook to manage push notification state
function usePushNotifications() {
	const [isSupported, setIsSupported] = useState(false);
	const [isSubscribed, setIsSubscribed] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [permission, setPermission] =
		useState<NotificationPermission>("default");

	const checkSubscriptionStatus = useCallback(async () => {
		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();
			setIsSubscribed(!!subscription);
		} catch (error) {
			console.error("Failed to check subscription status:", error);
		}
	}, []);

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
		isSupported,
		isSubscribed,
		isLoading,
		permission,
		setIsSubscribed,
		setIsLoading,
		setPermission,
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
	} = usePushNotifications();
	const isMobile = useIsMobile();

	const subscribeToPush = async () => {
		if (!isSupported) return;

		setIsLoading(true);
		try {
			// Request notification permission
			const permission = await Notification.requestPermission();
			setPermission(permission);

			if (permission !== "granted") {
				console.log("Notification permission denied");
				return;
			}

			// Get service worker registration
			const registration = await navigator.serviceWorker.ready;

			// Subscribe to push notifications
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(
					"BEl62iUYgUivxIkv69yViEuiBIa40HI80NM9LUhbJQQVLpCBWjWrJ0NG54L1jKJtnv9Uy4i5wEckXs6EwqNUK8s", // Mock VAPID key
				),
			});

			// Send subscription to server
			console.log("Push subscription:", subscription.toJSON());

			// Fire instrumentation event
			window.dispatchEvent(
				new CustomEvent("settings_notifications_subscribe", {
					detail: { endpoint: subscription.endpoint },
				}),
			);

			// TODO: tRPC mutation
			// await subscribeWebPush.mutateAsync({
			//   endpoint: subscription.endpoint,
			//   keys: subscription.toJSON().keys
			// })

			setIsSubscribed(true);
			console.log("Successfully subscribed to push notifications");
		} catch (error) {
			console.error("Failed to subscribe to push notifications:", error);
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
				await subscription.unsubscribe();

				// TODO: tRPC mutation
				// await unsubscribeWebPush.mutateAsync({
				//   endpoint: subscription.endpoint
				// })

				console.log("Unsubscribed from push notifications");
			}

			setIsSubscribed(false);
		} catch (error) {
			console.error("Failed to unsubscribe from push notifications:", error);
		} finally {
			setIsLoading(false);
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
						permission={permission}
						isSubscribed={isSubscribed}
						isLoading={isLoading}
						onSubscribe={subscribeToPush}
						onUnsubscribe={unsubscribeFromPush}
					/>
				) : (
					<DesktopLayout
						permission={permission}
						isSubscribed={isSubscribed}
						isLoading={isLoading}
						onSubscribe={subscribeToPush}
						onUnsubscribe={unsubscribeFromPush}
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
}: {
	permission: NotificationPermission;
	isSubscribed: boolean;
	isLoading: boolean;
	onSubscribe: () => void;
	onUnsubscribe: () => void;
}) {
	return (
		<>
			{permission !== "denied" && (
				<SubscriptionButton
					isSubscribed={isSubscribed}
					isLoading={isLoading}
					onSubscribe={onSubscribe}
					onUnsubscribe={onUnsubscribe}
					className="w-full"
				/>
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
}: {
	permission: NotificationPermission;
	isSubscribed: boolean;
	isLoading: boolean;
	onSubscribe: () => void;
	onUnsubscribe: () => void;
}) {
	return (
		<div className="flex items-center justify-between">
			<StatusDisplay permission={permission} isSubscribed={isSubscribed} />
			{permission !== "denied" && (
				<SubscriptionButton
					isSubscribed={isSubscribed}
					isLoading={isLoading}
					onSubscribe={onSubscribe}
					onUnsubscribe={onUnsubscribe}
				/>
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
			onClick={isSubscribed ? onUnsubscribe : onSubscribe}
			disabled={isLoading}
			variant={
				isSubscribed
					? className?.includes("w-full")
						? "destructive"
						: "outline"
					: "default"
			}
			className={className}
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
