/**
 * VAPID Configuration for Web Push Notifications
 */

import { loadEnvConfig } from "@next/env";

// Load environment variables
loadEnvConfig(process.cwd());

interface VAPIDConfig {
	publicKey: string;
	privateKey: string;
	subject: string;
}

/**
 * Get VAPID configuration from environment variables
 * Returns null if VAPID keys are not configured (for optional push notifications)
 */
export function getVAPIDConfig(): VAPIDConfig | null {
	const publicKey = process.env.VAPID_PUBLIC_KEY;
	const privateKey = process.env.VAPID_PRIVATE_KEY;
	const subject = process.env.VAPID_SUBJECT || "mailto:admin@vetmedtracker.com";

	if (!publicKey || !privateKey) {
		console.warn(
			"VAPID keys not configured. Push notifications will be disabled. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to enable.",
		);
		return null;
	}

	return {
		publicKey,
		privateKey,
		subject,
	};
}

/**
 * Get public VAPID key for client-side subscription
 * Returns null if not configured
 */
export function getPublicVAPIDKey(): string | null {
	const publicKey = process.env.VAPID_PUBLIC_KEY;

	if (!publicKey) {
		console.warn(
			"VAPID public key not configured. Push notifications will be disabled.",
		);
		return null;
	}

	return publicKey;
}

/**
 * Validate VAPID configuration
 */
export function validateVAPIDConfig(): boolean {
	try {
		getVAPIDConfig();
		return true;
	} catch {
		return false;
	}
}
