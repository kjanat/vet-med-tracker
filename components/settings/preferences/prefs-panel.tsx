"use client";

import { Clock, Home, Monitor, Moon, Sun, Weight } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/components/providers/app-provider";
import { useUserPreferencesContext } from "@/components/providers/user-preferences-provider";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";

interface UserPreferences {
	theme: "system" | "light" | "dark";
	clock12h: boolean;
	weekStartsOn: 0 | 1; // 0 = Sunday, 1 = Monday
	units: "metric" | "imperial";
	defaultHouseholdId?: string;
	defaultAnimalId?: string;
}

export function PrefsPanel() {
	const { households, animals } = useApp();
	const {
		vetMedPreferences,
		householdSettings,
		updateVetMedPreferences,
		updateHouseholdSettings,
	} = useUserPreferencesContext();

	// Initialize state from existing preferences
	const [prefs, setPrefs] = useState<UserPreferences>(() => {
		// Get saved theme from localStorage or default to system
		const savedTheme =
			typeof window !== "undefined"
				? (localStorage.getItem("theme") as "system" | "light" | "dark" | null)
				: null;

		return {
			theme: savedTheme || "system",
			clock12h: !vetMedPreferences.displayPreferences.use24HourTime,
			weekStartsOn: 0, // Default, will be added to preferences
			units:
				vetMedPreferences.displayPreferences.weightUnit === "kg"
					? "metric"
					: "imperial",
			defaultHouseholdId: householdSettings.primaryHouseholdName
				? households.find(
						(h) => h.name === householdSettings.primaryHouseholdName,
					)?.id
				: undefined,
			defaultAnimalId: undefined, // Will be added to preferences
		};
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// tRPC mutation for updating preferences
	const updatePreferences = trpc.user.updatePreferences.useMutation({
		onSuccess: () => {
			toast.success("Preferences saved successfully");
		},
		onError: (error) => {
			toast.error(`Failed to save preferences: ${error.message}`);
		},
	});

	// Apply theme on mount
	useEffect(() => {
		const savedTheme = localStorage.getItem("theme") as
			| "system"
			| "light"
			| "dark"
			| null;
		if (savedTheme) {
			if (savedTheme === "dark") {
				document.documentElement.classList.add("dark");
			} else if (savedTheme === "light") {
				document.documentElement.classList.remove("dark");
			} else {
				// System theme
				const isDark = window.matchMedia(
					"(prefers-color-scheme: dark)",
				).matches;
				document.documentElement.classList.toggle("dark", isDark);
			}
		}
	}, []);

	// Update prefs state when vetMedPreferences change
	useEffect(() => {
		const savedTheme =
			typeof window !== "undefined"
				? (localStorage.getItem("theme") as "system" | "light" | "dark" | null)
				: null;

		setPrefs({
			theme:
				savedTheme || vetMedPreferences.displayPreferences.theme || "system",
			clock12h: !vetMedPreferences.displayPreferences.use24HourTime,
			weekStartsOn: vetMedPreferences.displayPreferences.weekStartsOn || 0,
			units:
				vetMedPreferences.displayPreferences.weightUnit === "kg"
					? "metric"
					: "imperial",
			defaultHouseholdId: householdSettings.primaryHouseholdName
				? households.find(
						(h) => h.name === householdSettings.primaryHouseholdName,
					)?.id
				: undefined,
			defaultAnimalId: vetMedPreferences.defaultAnimalId,
		});
	}, [vetMedPreferences, householdSettings, households]);

	const handleSave = async () => {
		setIsSubmitting(true);
		try {
			// Save theme to localStorage for immediate application
			localStorage.setItem("theme", prefs.theme);

			// Apply theme immediately
			if (prefs.theme === "dark") {
				document.documentElement.classList.add("dark");
			} else if (prefs.theme === "light") {
				document.documentElement.classList.remove("dark");
			} else {
				// System theme
				const isDark = window.matchMedia(
					"(prefers-color-scheme: dark)",
				).matches;
				document.documentElement.classList.toggle("dark", isDark);
			}

			// Find household name from ID
			const selectedHousehold = prefs.defaultHouseholdId
				? households.find((h) => h.id === prefs.defaultHouseholdId)
				: null;

			// Update preferences via tRPC
			await updatePreferences.mutateAsync({
				vetMedPreferences: {
					displayPreferences: {
						use24HourTime: !prefs.clock12h,
						temperatureUnit:
							prefs.units === "metric" ? "celsius" : "fahrenheit",
						weightUnit: prefs.units === "metric" ? "kg" : "lbs",
						weekStartsOn: prefs.weekStartsOn,
						theme: prefs.theme,
					},
					defaultHouseholdId: prefs.defaultHouseholdId,
					defaultAnimalId: prefs.defaultAnimalId,
				},
				householdSettings: {
					primaryHouseholdName: selectedHousehold?.name || "",
				},
			});

			// Also update via the context hooks for immediate UI updates
			await updateVetMedPreferences({
				displayPreferences: {
					use24HourTime: !prefs.clock12h,
					temperatureUnit: prefs.units === "metric" ? "celsius" : "fahrenheit",
					weightUnit: prefs.units === "metric" ? "kg" : "lbs",
					weekStartsOn: prefs.weekStartsOn,
					theme: prefs.theme,
				},
				defaultHouseholdId: prefs.defaultHouseholdId,
				defaultAnimalId: prefs.defaultAnimalId,
			});

			if (selectedHousehold) {
				await updateHouseholdSettings({
					primaryHouseholdName: selectedHousehold.name,
				});
			}

			// Fire instrumentation event
			window.dispatchEvent(
				new CustomEvent("settings_prefs_update", {
					detail: prefs,
				}),
			);
		} catch (error) {
			console.error("Failed to save preferences:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="space-y-6">
			{/* Appearance */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Monitor className="h-5 w-5" />
						Appearance
					</CardTitle>
					<CardDescription>
						Customize how the app looks and feels
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-3">
						<Label>Theme</Label>
						<div className="grid grid-cols-3 gap-3">
							<Card
								className={`cursor-pointer transition-colors ${
									prefs.theme === "system"
										? "ring-2 ring-primary"
										: "hover:bg-accent"
								}`}
								onClick={() =>
									setPrefs((prev) => ({ ...prev, theme: "system" }))
								}
							>
								<CardContent className="p-4 text-center">
									<Monitor className="mx-auto mb-2 h-6 w-6" />
									<div className="truncate font-medium">System</div>
								</CardContent>
							</Card>

							<Card
								className={`cursor-pointer transition-colors ${
									prefs.theme === "light"
										? "ring-2 ring-primary"
										: "hover:bg-accent"
								}`}
								onClick={() =>
									setPrefs((prev) => ({ ...prev, theme: "light" }))
								}
							>
								<CardContent className="p-4 text-center">
									<Sun className="mx-auto mb-2 h-6 w-6" />
									<div className="truncate font-medium">Light</div>
								</CardContent>
							</Card>

							<Card
								className={`cursor-pointer transition-colors ${
									prefs.theme === "dark"
										? "ring-2 ring-primary"
										: "hover:bg-accent"
								}`}
								onClick={() => setPrefs((prev) => ({ ...prev, theme: "dark" }))}
							>
								<CardContent className="p-4 text-center">
									<Moon className="mx-auto mb-2 h-6 w-6" />
									<div className="truncate font-medium">Dark</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Time & Date */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clock className="h-5 w-5" />
						Time & Date
					</CardTitle>
					<CardDescription>
						Configure time and date display preferences
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Time Format</Label>
							<Select
								value={prefs.clock12h ? "12h" : "24h"}
								onValueChange={(value) =>
									setPrefs((prev) => ({ ...prev, clock12h: value === "12h" }))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
									<SelectItem value="24h">24-hour (14:30)</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Week Starts On</Label>
							<Select
								value={prefs.weekStartsOn.toString()}
								onValueChange={(value) =>
									setPrefs((prev) => ({
										...prev,
										weekStartsOn: Number.parseInt(value) as 0 | 1,
									}))
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="0">Sunday</SelectItem>
									<SelectItem value="1">Monday</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Units */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Weight className="h-5 w-5" />
						Units
					</CardTitle>
					<CardDescription>
						Choose your preferred measurement units
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="space-y-3">
						<Label>Weight & Measurements</Label>
						<div className="grid grid-cols-2 gap-3">
							<Card
								className={`cursor-pointer transition-colors ${
									prefs.units === "metric"
										? "ring-2 ring-primary"
										: "hover:bg-accent"
								}`}
								onClick={() =>
									setPrefs((prev) => ({ ...prev, units: "metric" }))
								}
							>
								<CardContent className="p-4 text-center">
									<div className="truncate font-medium">Metric</div>
									<div className="truncate text-muted-foreground text-sm">
										kg, ml, cm
									</div>
								</CardContent>
							</Card>

							<Card
								className={`cursor-pointer transition-colors ${
									prefs.units === "imperial"
										? "ring-2 ring-primary"
										: "hover:bg-accent"
								}`}
								onClick={() =>
									setPrefs((prev) => ({ ...prev, units: "imperial" }))
								}
							>
								<CardContent className="p-4 text-center">
									<div className="truncate font-medium">Imperial</div>
									<div className="truncate text-muted-foreground text-sm">
										lbs, fl oz, in
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Defaults */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Home className="h-5 w-5" />
						Defaults
					</CardTitle>
					<CardDescription>
						Set default selections for faster access
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label>Default Household</Label>
							<Select
								value={prefs.defaultHouseholdId || "none"}
								onValueChange={(value) =>
									setPrefs((prev) => ({
										...prev,
										defaultHouseholdId: value === "none" ? undefined : value,
									}))
								}
							>
								<SelectTrigger className="truncate">
									<SelectValue placeholder="No default" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No default</SelectItem>
									{households.map((household) => (
										<SelectItem key={household.id} value={household.id}>
											<span className="truncate">{household.name}</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label>Default Animal</Label>
							<Select
								value={prefs.defaultAnimalId || "none"}
								onValueChange={(value) =>
									setPrefs((prev) => ({
										...prev,
										defaultAnimalId: value === "none" ? undefined : value,
									}))
								}
							>
								<SelectTrigger className="truncate">
									<SelectValue placeholder="No default" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="none">No default</SelectItem>
									{animals.map((animal) => (
										<SelectItem key={animal.id} value={animal.id}>
											<span className="truncate">{animal.name}</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
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
