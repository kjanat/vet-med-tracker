"use client";

import { Bell, CheckCircle, Clock, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatTimeLocal } from "@/utils/tz";

interface MobileSuccessLayoutProps {
	isOnline: boolean;
	onReturnHome: () => void;
	onRecordAnother: () => void;
	recordedAt?: Date;
	animalName?: string;
	medicationName?: string;
}

export function MobileSuccessLayout({
	isOnline,
	onReturnHome,
	onRecordAnother,
	recordedAt = new Date(),
	animalName,
	medicationName,
}: MobileSuccessLayoutProps) {
	return (
		<div className="flex flex-col items-center justify-center min-h-full p-6 text-center">
			{/* Success Icon */}
			<div className="mb-6">
				<div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<CheckCircle className="w-10 h-10 text-green-600" />
				</div>

				<h1 className="text-2xl font-bold text-green-700 mb-2">
					Recorded Successfully!
				</h1>

				<div className="space-y-1 text-muted-foreground">
					<p className="text-base">
						{animalName && medicationName
							? `${animalName} - ${medicationName}`
							: "Medication administration"}
					</p>
					<div className="flex items-center justify-center gap-2 text-sm">
						<Clock className="h-4 w-4" />
						<span>
							Recorded at {formatTimeLocal(recordedAt, "America/New_York")} by
							You
						</span>
					</div>
					{!isOnline && (
						<p className="text-amber-600 text-sm font-medium">
							Will sync when online
						</p>
					)}
				</div>
			</div>

			{/* Quick Actions */}
			<div className="w-full max-w-sm space-y-3">
				<Button
					onClick={onRecordAnother}
					className="w-full h-12 text-base"
					variant="default"
				>
					Record Another
				</Button>

				<Button
					onClick={onReturnHome}
					className="w-full h-12 text-base"
					variant="outline"
				>
					<Home className="mr-2 h-5 w-5" />
					Back to Home
				</Button>

				<Button
					onClick={() => {
						// TODO: Open reminder adjustment sheet
						console.log("Adjust reminder");
					}}
					className="w-full h-12 text-base"
					variant="ghost"
				>
					<Bell className="mr-2 h-5 w-5" />
					Adjust Reminder
				</Button>
			</div>

			{/* Additional Info Card */}
			<Card className="w-full max-w-sm mt-6 bg-muted/30">
				<CardContent className="p-4">
					<div className="text-sm text-muted-foreground text-center">
						<p className="font-medium mb-1">Next Steps</p>
						<p>
							Check the History tab to view this administration or set up
							reminders for future doses.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
