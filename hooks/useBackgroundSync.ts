"use client";

import { useEffect, useCallback } from "react";

export type SyncDomain = "admin" | "inventory" | "settings";

export function useBackgroundSync() {
	const requestSync = useCallback(async (domain: SyncDomain) => {
		if (
			!("serviceWorker" in navigator) ||
			!("sync" in window.ServiceWorkerRegistration.prototype)
		) {
			console.warn("Background sync not supported");
			return false;
		}

		try {
			const registration = await navigator.serviceWorker.ready;
			await registration.sync.register(`sync:${domain}`);
			console.log(`Background sync registered for: ${domain}`);
			return true;
		} catch (error) {
			console.error(`Failed to register background sync for ${domain}:`, error);
			return false;
		}
	}, []);

	const handleSyncMessage = useCallback((event: MessageEvent) => {
		if (event.data?.type === "SYNC") {
			const { domain, timestamp } = event.data;
			console.log(`Received sync message for ${domain} at ${timestamp}`);

			// Dispatch custom event for components to listen to
			window.dispatchEvent(
				new CustomEvent("background-sync", {
					detail: { domain, timestamp },
				}),
			);
		}
	}, []);

	useEffect(() => {
		if ("serviceWorker" in navigator) {
			navigator.serviceWorker.addEventListener("message", handleSyncMessage);

			return () => {
				navigator.serviceWorker.removeEventListener(
					"message",
					handleSyncMessage,
				);
			};
		}
	}, [handleSyncMessage]);

	return { requestSync };
}
