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
 */
export function getVAPIDConfig(): VAPIDConfig {
	const publicKey = process.env.VAPID_PUBLIC_KEY;
	const privateKey = process.env.VAPID_PRIVATE_KEY;
	const subject = process.env.VAPID_SUBJECT || "mailto:admin@vetmedtracker.com";

	if (!publicKey || !privateKey) {
		throw new Error(
			"VAPID keys not configured. Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your environment variables.",
		);
	}

	return {
		publicKey,
		privateKey,
		subject,
	};
}

/**
 * Get public VAPID key for client-side subscription
 */
export function getPublicVAPIDKey(): string {
	const publicKey = process.env.VAPID_PUBLIC_KEY;

	if (!publicKey) {
		throw new Error(
			"VAPID public key not configured. Please set VAPID_PUBLIC_KEY in your environment variables.",
		);
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
