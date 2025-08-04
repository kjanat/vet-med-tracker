"use client";

import { useUser } from "@clerk/nextjs";
import { Bell, Clock, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { TimezoneCombobox } from "@/components/ui/timezone-combobox";
import { BROWSER_ZONE } from "@/utils/timezone-helpers";

interface VetMedPreferences {
	defaultTimezone: string;
	preferredPhoneNumber: string;
	emergencyContactName: string;
	emergencyContactPhone: string;
	notificationPreferences: {
		emailReminders: boolean;
		smsReminders: boolean;
		pushNotifications: boolean;
		reminderLeadTime: number; // minutes before due time
	};
	displayPreferences: {
		use24HourTime: boolean;
		temperatureUnit: "celsius" | "fahrenheit";
		weightUnit: "kg" | "lbs";
	};
}

const defaultPreferences: VetMedPreferences = {
	defaultTimezone: BROWSER_ZONE || "America/New_York",
	preferredPhoneNumber: "",
	emergencyContactName: "",
	emergencyContactPhone: "",
	notificationPreferences: {
		emailReminders: true,
		smsReminders: false,
		pushNotifications: true,
		reminderLeadTime: 15,
	},
	displayPreferences: {
		use24HourTime: false,
		temperatureUnit: "fahrenheit",
		weightUnit: "lbs",
	},
};

export default function VetMedPreferencesPage() {
	const { user, isLoaded } = useUser();
	const [preferences, setPreferences] =
		useState<VetMedPreferences>(defaultPreferences);
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (isLoaded && user) {
			// Load preferences from user's unsafe metadata
			const savedPreferences = user.unsafeMetadata
				.vetMedPreferences as VetMedPreferences;
			if (savedPreferences) {
				setPreferences({ ...defaultPreferences, ...savedPreferences });
			}
		}
	}, [isLoaded, user]);

	const handleSavePreferences = async () => {
		if (!user) return;

		setIsSaving(true);
		try {
			await user.update({
				unsafeMetadata: {
					...user.unsafeMetadata,
					vetMedPreferences: preferences,
				},
			});
			toast.success("Preferences saved successfully!");
		} catch (error) {
			console.error("Error saving preferences:", error);
			toast.error("Failed to save preferences. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	const updatePreferences = (updates: Partial<VetMedPreferences>) => {
		setPreferences((prev) => ({ ...prev, ...updates }));
	};

	const updateNotificationPreferences = (
		updates: Partial<VetMedPreferences["notificationPreferences"]>,
	) => {
		setPreferences((prev) => ({
			...prev,
			notificationPreferences: { ...prev.notificationPreferences, ...updates },
		}));
	};

	const updateDisplayPreferences = (
		updates: Partial<VetMedPreferences["displayPreferences"]>,
	) => {
		setPreferences((prev) => ({
			...prev,
			displayPreferences: { ...prev.displayPreferences, ...updates },
		}));
	};

	if (!isLoaded) {
		return <div className="p-6">Loading preferences...</div>;
	}

	return (
		<div className="space-y-6 p-6">
			<div>
				<h2 className="font-bold text-2xl text-gray-900">
					VetMed Tracker Preferences
				</h2>
				<p className="mt-1 text-gray-600">
					Customize your medication tracking experience
				</p>
			</div>

			{/* Location & Time Settings */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clock className="h-5 w-5" />
						Location & Time Settings
					</CardTitle>
					<CardDescription>
						Set your timezone and display preferences for accurate medication
						schedules
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="timezone">Default Timezone</Label>
						<TimezoneCombobox
							value={preferences.defaultTimezone}
							onChange={(value) =>
								updatePreferences({ defaultTimezone: value })
							}
							placeholder="Select timezone"
						/>
					</div>

					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						<div className="flex items-center justify-between space-x-2">
							<Label htmlFor="use24hour">Use 24-hour time format</Label>
							<Switch
								id="use24hour"
								checked={preferences.displayPreferences.use24HourTime}
								onCheckedChange={(checked) =>
									updateDisplayPreferences({ use24HourTime: checked })
								}
							/>
						</div>

						<div className="space-y-2">
							<Label>Temperature Unit</Label>
							<select
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								value={preferences.displayPreferences.temperatureUnit}
								onChange={(e) =>
									updateDisplayPreferences({
										temperatureUnit: e.target.value as "celsius" | "fahrenheit",
									})
								}
							>
								<option value="fahrenheit">Fahrenheit (°F)</option>
								<option value="celsius">Celsius (°C)</option>
							</select>
						</div>

						<div className="space-y-2">
							<Label>Weight Unit</Label>
							<select
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								value={preferences.displayPreferences.weightUnit}
								onChange={(e) =>
									updateDisplayPreferences({
										weightUnit: e.target.value as "kg" | "lbs",
									})
								}
							>
								<option value="lbs">Pounds (lbs)</option>
								<option value="kg">Kilograms (kg)</option>
							</select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Contact Information */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Phone className="h-5 w-5" />
						Contact Information
					</CardTitle>
					<CardDescription>
						Phone numbers for reminders and emergency contacts
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="phone">Preferred Phone Number</Label>
						<Input
							id="phone"
							type="tel"
							placeholder="+1 (555) 123-4567"
							value={preferences.preferredPhoneNumber}
							onChange={(e) =>
								updatePreferences({ preferredPhoneNumber: e.target.value })
							}
						/>
					</div>

					<Separator />

					<div className="space-y-4">
						<h4 className="font-medium">Emergency Contact</h4>
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div className="space-y-2">
								<Label htmlFor="emergency-name">Contact Name</Label>
								<Input
									id="emergency-name"
									placeholder="Dr. Smith"
									value={preferences.emergencyContactName}
									onChange={(e) =>
										updatePreferences({ emergencyContactName: e.target.value })
									}
								/>
							</div>
							<div className="space-y-2">
								<Label htmlFor="emergency-phone">Contact Phone</Label>
								<Input
									id="emergency-phone"
									type="tel"
									placeholder="+1 (555) 987-6543"
									value={preferences.emergencyContactPhone}
									onChange={(e) =>
										updatePreferences({ emergencyContactPhone: e.target.value })
									}
								/>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Notification Preferences */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Bell className="h-5 w-5" />
						Notification Preferences
					</CardTitle>
					<CardDescription>
						Control how and when you receive medication reminders
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<div>
								<Label htmlFor="email-reminders">Email Reminders</Label>
								<p className="text-gray-500 text-sm">
									Receive medication reminders via email
								</p>
							</div>
							<Switch
								id="email-reminders"
								checked={preferences.notificationPreferences.emailReminders}
								onCheckedChange={(checked) =>
									updateNotificationPreferences({ emailReminders: checked })
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<Label htmlFor="sms-reminders">SMS Reminders</Label>
								<p className="text-gray-500 text-sm">
									Receive medication reminders via text message
								</p>
							</div>
							<Switch
								id="sms-reminders"
								checked={preferences.notificationPreferences.smsReminders}
								onCheckedChange={(checked) =>
									updateNotificationPreferences({ smsReminders: checked })
								}
							/>
						</div>

						<div className="flex items-center justify-between">
							<div>
								<Label htmlFor="push-notifications">Push Notifications</Label>
								<p className="text-gray-500 text-sm">
									Receive browser push notifications
								</p>
							</div>
							<Switch
								id="push-notifications"
								checked={preferences.notificationPreferences.pushNotifications}
								onCheckedChange={(checked) =>
									updateNotificationPreferences({ pushNotifications: checked })
								}
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="lead-time">Reminder Lead Time (minutes)</Label>
							<select
								id="lead-time"
								className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:font-medium file:text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								value={preferences.notificationPreferences.reminderLeadTime.toString()}
								onChange={(e) =>
									updateNotificationPreferences({
										reminderLeadTime: parseInt(e.target.value),
									})
								}
							>
								<option value="5">5 minutes before</option>
								<option value="15">15 minutes before</option>
								<option value="30">30 minutes before</option>
								<option value="60">1 hour before</option>
								<option value="120">2 hours before</option>
							</select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Save Button */}
			<div className="flex justify-end">
				<Button onClick={handleSavePreferences} disabled={isSaving} size="lg">
					{isSaving ? "Saving..." : "Save Preferences"}
				</Button>
			</div>
		</div>
	);
}
