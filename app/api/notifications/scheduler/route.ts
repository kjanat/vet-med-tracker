/**
 * Notification Scheduler API Endpoint
 * Manages the background notification scheduler service
 */

import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db/drizzle";
import { getNotificationScheduler } from "@/lib/push-notifications/notification-scheduler";
import { stackServerApp } from "@/stack";

// Lazy initialization to prevent build-time errors
let scheduler: ReturnType<typeof getNotificationScheduler> | null = null;

function getScheduler() {
	if (!scheduler) {
		scheduler = getNotificationScheduler(db);
	}
	return scheduler;
}

// Force dynamic rendering and disable caching for status endpoint
export const dynamic = "force-dynamic";
export const revalidate = 0;

const BodySchema = z.object({
	action: z.enum(["start", "stop", "restart"]),
});

export async function GET() {
	try {
		const status = getScheduler().getStatus();
		return NextResponse.json(status, {
			headers: { "cache-control": "no-store" },
		});
	} catch (error) {
		console.error("Error getting scheduler status:", error);
		return NextResponse.json(
			{ error: "Failed to get scheduler status" },
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	try {
		// Authentication: Verify user is logged in
		const user = await stackServerApp.getUser();
		if (!user) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		// Authorization: Check if user has admin role
		// Note: In a real implementation, you'd check user roles from your database
		// For now, we'll restrict to specific user IDs or implement role-based checks
		const isAdmin =
			user.serverMetadata?.role === "admin" ||
			process.env.ADMIN_USER_IDS?.split(",").includes(user.id);

		if (!isAdmin) {
			console.warn(
				`Unauthorized scheduler access attempt by user ${user.id} (${user.primaryEmail})`,
			);
			return NextResponse.json(
				{ error: "Insufficient privileges. Admin access required." },
				{ status: 403 },
			);
		}

		// Input validation with Zod
		const json = await request.json();
		const parseResult = BodySchema.safeParse(json);

		if (!parseResult.success) {
			return NextResponse.json(
				{ error: "Invalid request body", details: parseResult.error.flatten() },
				{ status: 400 },
			);
		}

		const { action } = parseResult.data;

		// Audit logging
		console.info(
			`Scheduler ${action} action performed by user ${user.id} (${user.primaryEmail}) at ${new Date().toISOString()}`,
		);

		switch (action) {
			case "start":
				getScheduler().start();
				return NextResponse.json({
					success: true,
					message: "Scheduler started",
				});

			case "stop":
				getScheduler().stop();
				return NextResponse.json({
					success: true,
					message: "Scheduler stopped",
				});

			case "restart":
				getScheduler().stop();
				await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
				getScheduler().start();
				return NextResponse.json({
					success: true,
					message: "Scheduler restarted",
				});

			default:
				// This should never happen due to Zod validation, but keeping for safety
				return NextResponse.json(
					{ error: "Invalid action. Use 'start', 'stop', or 'restart'" },
					{ status: 400 },
				);
		}
	} catch (error) {
		console.error("Error managing scheduler:", error);
		return NextResponse.json(
			{ error: "Failed to manage scheduler" },
			{ status: 500 },
		);
	}
}
