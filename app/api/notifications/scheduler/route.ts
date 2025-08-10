/**
 * Notification Scheduler API Endpoint
 * Manages the background notification scheduler service
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { getNotificationScheduler } from "@/lib/push-notifications/notification-scheduler";

const scheduler = getNotificationScheduler(db);

export async function GET() {
	try {
		const status = scheduler.getStatus();
		return NextResponse.json(status);
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
		const { action } = await request.json();

		switch (action) {
			case "start":
				scheduler.start();
				return NextResponse.json({
					success: true,
					message: "Scheduler started",
				});

			case "stop":
				scheduler.stop();
				return NextResponse.json({
					success: true,
					message: "Scheduler stopped",
				});

			case "restart":
				scheduler.stop();
				await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second
				scheduler.start();
				return NextResponse.json({
					success: true,
					message: "Scheduler restarted",
				});

			default:
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
