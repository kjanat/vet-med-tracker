"use client";

import { Clock, Home, Monitor, Moon, Sun, Weight } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/app-provider";
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
	const [prefs, setPrefs] = useState<UserPreferences>({
		theme: "system",
		clock12h: true,
		weekStartsOn: 0,
		units: "metric",
		defaultHouseholdId: undefined,
		defaultAnimalId: undefined,
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSave = async () => {
		setIsSubmitting(true);
		try {
			console.log("Saving user preferences:", prefs);

			// Fire instrumentation event
			window.dispatchEvent(
				new CustomEvent("settings_prefs_update", {
					detail: prefs,
				}),
			);

			// TODO: tRPC mutation
			// await updateUserPrefs.mutateAsync(prefs)

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

			console.log("Preferences saved successfully");
		} catch (error) {
			console.error("Failed to save preferences:", error);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold">Preferences</h2>
				<p className="text-muted-foreground">
					Customize your experience and default settings
				</p>
			</div>

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
									<Monitor className="h-6 w-6 mx-auto mb-2" />
									<div className="font-medium truncate">System</div>
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
									<Sun className="h-6 w-6 mx-auto mb-2" />
									<div className="font-medium truncate">Light</div>
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
									<Moon className="h-6 w-6 mx-auto mb-2" />
									<div className="font-medium truncate">Dark</div>
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
									<div className="font-medium truncate">Metric</div>
									<div className="text-sm text-muted-foreground truncate">
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
									<div className="font-medium truncate">Imperial</div>
									<div className="text-sm text-muted-foreground truncate">
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
