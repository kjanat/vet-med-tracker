"use client";

import {
	Bell,
	Calendar,
	CheckCircle,
	Clock,
	Home,
	RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTimeLocal } from "@/utils/tz";

interface TabletSuccessLayoutProps {
	isOnline: boolean;
	onReturnHome: () => void;
	onRecordAnother: () => void;
	recordedAt?: Date;
	animalName?: string;
	medicationName?: string;
}

export function TabletSuccessLayout({
	isOnline,
	onReturnHome,
	onRecordAnother,
	recordedAt = new Date(),
	animalName,
	medicationName,
}: TabletSuccessLayoutProps) {
	return (
		<div className="flex h-full">
			{/* Left column - Success message and details */}
			<div className="flex-1 flex items-center justify-center p-8">
				<div className="max-w-md text-center space-y-6">
					{/* Success Icon */}
					<div>
						<div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
							<CheckCircle className="w-12 h-12 text-green-600" />
						</div>

						<h1 className="text-3xl font-bold text-green-700 mb-3">
							Successfully Recorded!
						</h1>

						<div className="space-y-2 text-muted-foreground">
							{animalName && medicationName && (
								<p className="text-lg font-medium text-foreground">
									{animalName} - {medicationName}
								</p>
							)}
							<div className="flex items-center justify-center gap-2 text-base">
								<Clock className="h-4 w-4" />
								<span>
									Recorded at {formatTimeLocal(recordedAt, "America/New_York")}{" "}
									by You
								</span>
							</div>
							{!isOnline && (
								<p className="text-amber-600 font-medium">
									Will sync when connection is restored
								</p>
							)}
						</div>
					</div>

					{/* Status card */}
					<Card className="bg-green-50 border-green-200">
						<CardContent className="p-4">
							<div className="flex items-center justify-center gap-2">
								<div className="h-3 w-3 bg-green-600 rounded-full" />
								<span className="text-sm font-medium text-green-800">
									Administration recorded successfully
								</span>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Right column - Actions and next steps */}
			<div className="w-80 shrink-0 border-l bg-muted/30">
				<div className="p-6 h-full flex flex-col">
					<div className="mb-6">
						<h3 className="font-semibold text-lg mb-2">What's Next?</h3>
						<p className="text-sm text-muted-foreground">
							Choose your next action or return to the home screen to see
							updated medication schedules.
						</p>
					</div>

					{/* Quick Actions */}
					<div className="space-y-3 mb-8">
						<Button
							onClick={onRecordAnother}
							className="w-full h-12 text-base justify-start"
							variant="default"
						>
							<RotateCcw className="mr-3 h-5 w-5" />
							Record Another Medication
						</Button>

						<Button
							onClick={onReturnHome}
							className="w-full h-12 text-base justify-start"
							variant="outline"
						>
							<Home className="mr-3 h-5 w-5" />
							Back to Dashboard
						</Button>

						<Button
							onClick={() => {
								// TODO: Open reminder adjustment sheet
								console.log("Adjust reminder");
							}}
							className="w-full h-12 text-base justify-start"
							variant="ghost"
						>
							<Bell className="mr-3 h-5 w-5" />
							Adjust Reminders
						</Button>
					</div>

					<div className="flex-1" />

					{/* Additional options */}
					<div className="space-y-4">
						<Card className="bg-background">
							<CardHeader className="pb-3">
								<CardTitle className="text-sm">Quick Navigation</CardTitle>
							</CardHeader>
							<CardContent className="p-4 pt-0 space-y-2">
								<Button
									variant="ghost"
									size="sm"
									className="w-full justify-start text-sm h-8"
									onClick={() => {
										// TODO: Navigate to history
										console.log("View history");
									}}
								>
									<Calendar className="mr-2 h-4 w-4" />
									View History
								</Button>
								<Button
									variant="ghost"
									size="sm"
									className="w-full justify-start text-sm h-8"
									onClick={() => {
										// TODO: Navigate to insights
										console.log("View insights");
									}}
								>
									📊 View Insights
								</Button>
							</CardContent>
						</Card>

						<div className="text-xs text-muted-foreground text-center">
							This administration has been logged and will appear in your
							medication history.
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
