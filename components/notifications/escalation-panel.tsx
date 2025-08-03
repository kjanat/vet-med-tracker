"use client";

import { AlertTriangle, Clock, Plus, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

interface NotificationPrefs {
	leadMinutes: number;
	attempts: number[]; // Minutes relative to target time
	escalationRole: "Owner" | "Lead";
}

export function EscalationPanel() {
	const [prefs, setPrefs] = useState<NotificationPrefs>({
		leadMinutes: 15,
		attempts: [-15, 0, 15, 45, 90],
		escalationRole: "Owner",
	});
	const [newAttempt, setNewAttempt] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSave = async () => {
		setIsSubmitting(true);
		try {
			console.log("Saving notification preferences:", prefs);

			// Fire instrumentation event
			window.dispatchEvent(
				new CustomEvent("settings_notifications_update", {
					detail: prefs,
				}),
			);

			// TODO: tRPC mutation
			// await updateNotificationPrefs.mutateAsync({
			//   householdId,
			//   leadMinutes: prefs.leadMinutes,
			//   attempts: prefs.attempts,
			//   escalationRole: prefs.escalationRole
			// })

			console.log("Notification preferences saved");
		} catch (error) {
			console.error("Failed to save preferences:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const addAttempt = () => {
		const minutes = Number.parseInt(newAttempt);
		if (!Number.isNaN(minutes) && !prefs.attempts.includes(minutes)) {
			setPrefs((prev) => ({
				...prev,
				attempts: [...prev.attempts, minutes].sort((a, b) => a - b),
			}));
			setNewAttempt("");
		}
	};

	const removeAttempt = (minutes: number) => {
		setPrefs((prev) => ({
			...prev,
			attempts: prev.attempts.filter((a) => a !== minutes),
		}));
	};

	const formatAttempt = (minutes: number) => {
		if (minutes === 0) return "On time";
		if (minutes < 0) return `${Math.abs(minutes)}m before`;
		return `${minutes}m after`;
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clock className="h-5 w-5" />
						Reminder Schedule
					</CardTitle>
					<CardDescription>
						Configure when and how often you receive medication reminders
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label htmlFor="leadTime">Default Lead Time</Label>
						<Select
							value={prefs.leadMinutes.toString()}
							onValueChange={(value) =>
								setPrefs((prev) => ({
									...prev,
									leadMinutes: Number.parseInt(value),
								}))
							}
						>
							<SelectTrigger className="w-[200px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="5">5 minutes</SelectItem>
								<SelectItem value="10">10 minutes</SelectItem>
								<SelectItem value="15">15 minutes</SelectItem>
								<SelectItem value="30">30 minutes</SelectItem>
								<SelectItem value="60">1 hour</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-muted-foreground text-sm">
							How early to send the first reminder
						</p>
					</div>

					<div className="space-y-3">
						<Label>Reminder Attempts</Label>
						<div className="flex gap-2">
							<Input
								type="number"
								placeholder="Minutes (e.g., -15, 0, 30)"
								value={newAttempt}
								onChange={(e) => setNewAttempt(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === "Enter") {
										e.preventDefault();
										addAttempt();
									}
								}}
								className="w-[200px]"
							/>
							<Button type="button" onClick={addAttempt} size="sm">
								<Plus className="h-4 w-4" />
							</Button>
						</div>

						<div className="flex flex-wrap gap-2">
							{prefs.attempts.map((minutes) => (
								<Badge key={minutes} variant="secondary" className="gap-1">
									{formatAttempt(minutes)}
									<button type="button" onClick={() => removeAttempt(minutes)}>
										<X className="h-3 w-3" />
									</button>
								</Badge>
							))}
						</div>

						<p className="text-muted-foreground text-sm">
							Negative numbers send reminders before the scheduled time,
							positive numbers after
						</p>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<AlertTriangle className="h-5 w-5" />
						Escalation Settings
					</CardTitle>
					<CardDescription>
						Who gets notified when medications are missed
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label>Escalate to Role</Label>
						<Select
							value={prefs.escalationRole}
							onValueChange={(value) =>
								setPrefs((prev) => ({
									...prev,
									escalationRole: value as "Owner" | "Lead",
								}))
							}
						>
							<SelectTrigger className="w-[200px]">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="Owner">Owner</SelectItem>
								<SelectItem value="Lead">Lead Caregiver</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-muted-foreground text-sm">
							After 45 minutes past due, notify all members with this role
						</p>
					</div>
				</CardContent>
			</Card>

			<div className="flex justify-end">
				<Button onClick={handleSave} disabled={isSubmitting}>
					{isSubmitting ? "Saving..." : "Save Preferences"}
				</Button>
			</div>
		</div>
	);
}
