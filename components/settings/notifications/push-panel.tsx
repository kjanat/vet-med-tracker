"use client";

import { Bell, BellOff, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { useMediaQuery } from "@/hooks/useMediaQuery";

export function PushPanel() {
	const [isSupported, setIsSupported] = useState(false);
	const [isSubscribed, setIsSubscribed] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [permission, setPermission] =
		useState<NotificationPermission>("default");
	const isMobile = useMediaQuery("(max-width: 640px)");

	const checkSubscriptionStatus = async () => {
		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();
			setIsSubscribed(!!subscription);
		} catch (error) {
			console.error("Failed to check subscription status:", error);
		}
	};

	useEffect(() => {
		// Check if push notifications are supported
		const supported = "serviceWorker" in navigator && "PushManager" in window;
		setIsSupported(supported);

		if (supported) {
			setPermission(Notification.permission);
			checkSubscriptionStatus();
		}
	}, [checkSubscriptionStatus]);

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
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<BellOff className="h-5 w-5" />
						Push Notifications
					</CardTitle>
					<CardDescription>
						Get reminded when medications are due
					</CardDescription>
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
					// Mobile layout: Full-width button
					<>
						{permission !== "denied" && (
							<Button
								onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
								disabled={isLoading}
								variant={isSubscribed ? "destructive" : "default"}
								className="w-full"
							>
								{isLoading
									? "Loading..."
									: isSubscribed
										? "Unsubscribe"
										: "Subscribe"}
							</Button>
						)}
						{permission === "denied" && (
							<div className="text-sm text-center text-muted-foreground">
								Notifications are blocked. Enable them in your browser settings.
							</div>
						)}
					</>
				) : (
					// Desktop layout: Original layout
					<div className="flex items-center justify-between">
						<div>
							<div className="font-medium">
								Status:{" "}
								{isSubscribed
									? "Subscribed"
									: permission === "denied"
										? "Blocked"
										: "Not subscribed"}
							</div>
							<div className="text-sm text-muted-foreground">
								{isSubscribed
									? "You'll receive push notifications for medication reminders"
									: permission === "denied"
										? "Notifications are blocked. Enable them in your browser settings."
										: "Subscribe to receive medication reminders"}
							</div>
						</div>

						{permission !== "denied" && (
							<Button
								onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
								disabled={isLoading}
								variant={isSubscribed ? "outline-solid" : "default"}
							>
								{isLoading
									? "Loading..."
									: isSubscribed
										? "Unsubscribe"
										: "Subscribe"}
							</Button>
						)}
					</div>
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
