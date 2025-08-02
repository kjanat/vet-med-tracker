"use client";

import { CheckCircle, Clock, Heart, Home } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useUserPreferencesContext } from "@/components/providers/user-preferences-provider";
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
import { Progress } from "@/components/ui/progress";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const TIMEZONES = [
	{ value: "America/New_York", label: "Eastern Time (EST/EDT)" },
	{ value: "America/Chicago", label: "Central Time (CST/CDT)" },
	{ value: "America/Denver", label: "Mountain Time (MST/MDT)" },
	{ value: "America/Los_Angeles", label: "Pacific Time (PST/PDT)" },
	{ value: "America/Anchorage", label: "Alaska Time (AKST/AKDT)" },
	{ value: "Pacific/Honolulu", label: "Hawaii Time (HST)" },
	{ value: "Europe/London", label: "Greenwich Mean Time (GMT)" },
	{ value: "Europe/Paris", label: "Central European Time (CET)" },
	{ value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
	{ value: "Australia/Sydney", label: "Australian Eastern Time (AEST)" },
];

interface OnboardingData {
	householdName: string;
	timezone: string;
	preferredPhoneNumber: string;
	veterinarianName: string;
	veterinarianPhone: string;
	emailReminders: boolean;
	pushNotifications: boolean;
}

const initialData: OnboardingData = {
	householdName: "",
	timezone: "America/New_York",
	preferredPhoneNumber: "",
	veterinarianName: "",
	veterinarianPhone: "",
	emailReminders: true,
	pushNotifications: true,
};

export function WelcomeFlow() {
	const [currentStep, setCurrentStep] = useState(1);
	const [data, setData] = useState<OnboardingData>(initialData);
	const [isLoading, setIsLoading] = useState(false);

	const {
		updateVetMedPreferences,
		updateHouseholdSettings,
		markOnboardingComplete,
	} = useUserPreferencesContext();

	const totalSteps = 4;
	const progress = (currentStep / totalSteps) * 100;

	const updateData = (updates: Partial<OnboardingData>) => {
		setData((prev) => ({ ...prev, ...updates }));
	};

	const nextStep = () => {
		if (currentStep < totalSteps) {
			setCurrentStep((prev) => prev + 1);
		}
	};

	const prevStep = () => {
		if (currentStep > 1) {
			setCurrentStep((prev) => prev - 1);
		}
	};

	const completeOnboarding = async () => {
		setIsLoading(true);
		try {
			// Update VetMed preferences
			await updateVetMedPreferences({
				defaultTimezone: data.timezone,
				preferredPhoneNumber: data.preferredPhoneNumber,
				notificationPreferences: {
					emailReminders: data.emailReminders,
					smsReminders: false,
					pushNotifications: data.pushNotifications,
					reminderLeadTime: 15,
				},
				displayPreferences: {
					use24HourTime: false,
					temperatureUnit: "fahrenheit",
					weightUnit: "lbs",
				},
			});

			// Update household settings
			await updateHouseholdSettings({
				primaryHouseholdName: data.householdName,
				defaultLocation: {
					address: "",
					city: "",
					state: "",
					zipCode: "",
					timezone: data.timezone,
				},
				householdRoles: ["Owner", "Primary Caregiver"],
				preferredVeterinarian: {
					name: data.veterinarianName,
					phone: data.veterinarianPhone,
					address: "",
				},
				inventoryPreferences: {
					lowStockThreshold: 7,
					autoReorderEnabled: false,
					expirationWarningDays: 30,
				},
			});

			// Mark onboarding as complete
			await markOnboardingComplete();

			toast.success("Welcome to VetMed Tracker! Your profile has been set up.");
		} catch (error) {
			console.error("Error completing onboarding:", error);
			toast.error(
				"There was an error setting up your profile. Please try again.",
			);
		} finally {
			setIsLoading(false);
		}
	};

	const renderStep = () => {
		switch (currentStep) {
			case 1:
				return (
					<Card>
						<CardHeader className="text-center">
							<div className="flex justify-center mb-4">
								<Heart className="w-12 h-12 text-green-600" />
							</div>
							<CardTitle>Welcome to VetMed Tracker!</CardTitle>
							<CardDescription>
								Let's set up your profile to provide the best medication
								tracking experience for your pets.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="household-name">
									What should we call your household?
								</Label>
								<Input
									id="household-name"
									placeholder="The Smith Family"
									value={data.householdName}
									onChange={(e) =>
										updateData({ householdName: e.target.value })
									}
								/>
								<p className="text-sm text-gray-500">
									This helps us personalize your experience and organize your
									pets' information.
								</p>
							</div>
						</CardContent>
					</Card>
				);

			case 2:
				return (
					<Card>
						<CardHeader className="text-center">
							<div className="flex justify-center mb-4">
								<Clock className="w-12 h-12 text-blue-600" />
							</div>
							<CardTitle>Time & Location</CardTitle>
							<CardDescription>
								Set your timezone to ensure accurate medication schedules.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="timezone">Your Timezone</Label>
								<Select
									value={data.timezone}
									onValueChange={(value) => updateData({ timezone: value })}
								>
									<SelectTrigger>
										<SelectValue placeholder="Select your timezone" />
									</SelectTrigger>
									<SelectContent>
										{TIMEZONES.map((tz) => (
											<SelectItem key={tz.value} value={tz.value}>
												{tz.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="phone">Phone Number (Optional)</Label>
								<Input
									id="phone"
									type="tel"
									placeholder="+1 (555) 123-4567"
									value={data.preferredPhoneNumber}
									onChange={(e) =>
										updateData({ preferredPhoneNumber: e.target.value })
									}
								/>
								<p className="text-sm text-gray-500">
									We'll use this for SMS reminders if you enable them later.
								</p>
							</div>
						</CardContent>
					</Card>
				);

			case 3:
				return (
					<Card>
						<CardHeader className="text-center">
							<div className="flex justify-center mb-4">
								<Home className="w-12 h-12 text-purple-600" />
							</div>
							<CardTitle>Veterinary Information</CardTitle>
							<CardDescription>
								Add your preferred veterinarian for quick access.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="vet-name">
									Veterinarian/Clinic Name (Optional)
								</Label>
								<Input
									id="vet-name"
									placeholder="Dr. Johnson's Animal Hospital"
									value={data.veterinarianName}
									onChange={(e) =>
										updateData({ veterinarianName: e.target.value })
									}
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="vet-phone">Veterinarian Phone (Optional)</Label>
								<Input
									id="vet-phone"
									type="tel"
									placeholder="+1 (555) 987-6543"
									value={data.veterinarianPhone}
									onChange={(e) =>
										updateData({ veterinarianPhone: e.target.value })
									}
								/>
							</div>

							<p className="text-sm text-gray-500">
								You can always add or update this information later in your
								profile settings.
							</p>
						</CardContent>
					</Card>
				);

			case 4:
				return (
					<Card>
						<CardHeader className="text-center">
							<div className="flex justify-center mb-4">
								<CheckCircle className="w-12 h-12 text-green-600" />
							</div>
							<CardTitle>You're All Set!</CardTitle>
							<CardDescription>
								Your VetMed Tracker profile is ready. You can always update
								these settings later.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-4 text-sm">
								<div className="flex justify-between">
									<span className="font-medium">Household:</span>
									<span>{data.householdName || "Not specified"}</span>
								</div>
								<div className="flex justify-between">
									<span className="font-medium">Timezone:</span>
									<span>
										{TIMEZONES.find((tz) => tz.value === data.timezone)?.label}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="font-medium">Phone:</span>
									<span>{data.preferredPhoneNumber || "Not provided"}</span>
								</div>
								<div className="flex justify-between">
									<span className="font-medium">Veterinarian:</span>
									<span>{data.veterinarianName || "Not specified"}</span>
								</div>
							</div>
						</CardContent>
					</Card>
				);

			default:
				return null;
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
			<div className="w-full max-w-md space-y-6">
				<div className="space-y-2">
					<Progress value={progress} className="w-full" />
					<p className="text-sm text-gray-600 text-center">
						Step {currentStep} of {totalSteps}
					</p>
				</div>

				{renderStep()}

				<div className="flex justify-between">
					<Button
						variant="outline"
						onClick={prevStep}
						disabled={currentStep === 1}
					>
						Previous
					</Button>

					{currentStep < totalSteps ? (
						<Button
							onClick={nextStep}
							disabled={currentStep === 1 && !data.householdName.trim()}
						>
							Next
						</Button>
					) : (
						<Button onClick={completeOnboarding} disabled={isLoading}>
							{isLoading ? "Setting up..." : "Complete Setup"}
						</Button>
					)}
				</div>
			</div>
		</div>
	);
}
