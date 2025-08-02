"use client";

import { useUser } from "@clerk/nextjs";
import { Home, MapPin, Plus, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Switch } from "@/components/ui/switch";

interface HouseholdSettings {
	primaryHouseholdName: string;
	defaultLocation: {
		address: string;
		city: string;
		state: string;
		zipCode: string;
		timezone: string;
	};
	householdRoles: string[];
	preferredVeterinarian: {
		name: string;
		phone: string;
		address: string;
	};
	inventoryPreferences: {
		lowStockThreshold: number;
		autoReorderEnabled: boolean;
		expirationWarningDays: number;
	};
}

const defaultSettings: HouseholdSettings = {
	primaryHouseholdName: "",
	defaultLocation: {
		address: "",
		city: "",
		state: "",
		zipCode: "",
		timezone: "America/New_York",
	},
	householdRoles: ["Owner", "Primary Caregiver"],
	preferredVeterinarian: {
		name: "",
		phone: "",
		address: "",
	},
	inventoryPreferences: {
		lowStockThreshold: 7, // days
		autoReorderEnabled: false,
		expirationWarningDays: 30,
	},
};

const US_STATES = [
	"AL",
	"AK",
	"AZ",
	"AR",
	"CA",
	"CO",
	"CT",
	"DE",
	"FL",
	"GA",
	"HI",
	"ID",
	"IL",
	"IN",
	"IA",
	"KS",
	"KY",
	"LA",
	"ME",
	"MD",
	"MA",
	"MI",
	"MN",
	"MS",
	"MO",
	"MT",
	"NE",
	"NV",
	"NH",
	"NJ",
	"NM",
	"NY",
	"NC",
	"ND",
	"OH",
	"OK",
	"OR",
	"PA",
	"RI",
	"SC",
	"SD",
	"TN",
	"TX",
	"UT",
	"VT",
	"VA",
	"WA",
	"WV",
	"WI",
	"WY",
];

export default function HouseholdSettingsPage() {
	const { user, isLoaded } = useUser();
	const [settings, setSettings] = useState<HouseholdSettings>(defaultSettings);
	const [newRole, setNewRole] = useState("");
	const [isSaving, setIsSaving] = useState(false);

	useEffect(() => {
		if (isLoaded && user) {
			// Load settings from user's unsafe metadata
			const savedSettings = user.unsafeMetadata
				.householdSettings as HouseholdSettings;
			if (savedSettings) {
				setSettings({ ...defaultSettings, ...savedSettings });
			}
		}
	}, [isLoaded, user]);

	const handleSaveSettings = async () => {
		if (!user) return;

		setIsSaving(true);
		try {
			await user.update({
				unsafeMetadata: {
					...user.unsafeMetadata,
					householdSettings: settings,
				},
			});
			toast.success("Household settings saved successfully!");
		} catch (error) {
			console.error("Error saving settings:", error);
			toast.error("Failed to save settings. Please try again.");
		} finally {
			setIsSaving(false);
		}
	};

	const updateSettings = (updates: Partial<HouseholdSettings>) => {
		setSettings((prev) => ({ ...prev, ...updates }));
	};

	const updateLocation = (
		updates: Partial<HouseholdSettings["defaultLocation"]>,
	) => {
		setSettings((prev) => ({
			...prev,
			defaultLocation: { ...prev.defaultLocation, ...updates },
		}));
	};

	const updateVeterinarian = (
		updates: Partial<HouseholdSettings["preferredVeterinarian"]>,
	) => {
		setSettings((prev) => ({
			...prev,
			preferredVeterinarian: { ...prev.preferredVeterinarian, ...updates },
		}));
	};

	const updateInventoryPreferences = (
		updates: Partial<HouseholdSettings["inventoryPreferences"]>,
	) => {
		setSettings((prev) => ({
			...prev,
			inventoryPreferences: { ...prev.inventoryPreferences, ...updates },
		}));
	};

	const addRole = () => {
		if (newRole.trim() && !settings.householdRoles.includes(newRole.trim())) {
			setSettings((prev) => ({
				...prev,
				householdRoles: [...prev.householdRoles, newRole.trim()],
			}));
			setNewRole("");
		}
	};

	const removeRole = (roleToRemove: string) => {
		setSettings((prev) => ({
			...prev,
			householdRoles: prev.householdRoles.filter(
				(role) => role !== roleToRemove,
			),
		}));
	};

	if (!isLoaded) {
		return <div className="p-6">Loading household settings...</div>;
	}

	return (
		<div className="space-y-6 p-6">
			<div>
				<h2 className="text-2xl font-bold text-gray-900">Household Settings</h2>
				<p className="text-gray-600 mt-1">
					Manage your household information and preferences
				</p>
			</div>

			{/* Basic Household Info */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Home className="w-5 h-5" />
						Household Information
					</CardTitle>
					<CardDescription>
						Basic information about your household
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="household-name">Household Name</Label>
						<Input
							id="household-name"
							placeholder="The Smith Family"
							value={settings.primaryHouseholdName}
							onChange={(e) =>
								updateSettings({ primaryHouseholdName: e.target.value })
							}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Location Settings */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<MapPin className="w-5 h-5" />
						Default Location
					</CardTitle>
					<CardDescription>
						Primary location for medication schedules and veterinary visits
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="address">Street Address</Label>
						<Input
							id="address"
							placeholder="123 Main Street"
							value={settings.defaultLocation.address}
							onChange={(e) => updateLocation({ address: e.target.value })}
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<div className="space-y-2">
							<Label htmlFor="city">City</Label>
							<Input
								id="city"
								placeholder="Anytown"
								value={settings.defaultLocation.city}
								onChange={(e) => updateLocation({ city: e.target.value })}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="state">State</Label>
							<Select
								value={settings.defaultLocation.state}
								onValueChange={(value) => updateLocation({ state: value })}
							>
								<SelectTrigger>
									<SelectValue placeholder="State" />
								</SelectTrigger>
								<SelectContent>
									{US_STATES.map((state) => (
										<SelectItem key={state} value={state}>
											{state}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="zip">ZIP Code</Label>
							<Input
								id="zip"
								placeholder="12345"
								value={settings.defaultLocation.zipCode}
								onChange={(e) => updateLocation({ zipCode: e.target.value })}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Household Roles */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Users className="w-5 h-5" />
						Household Roles
					</CardTitle>
					<CardDescription>
						Define roles for household members who care for your animals
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex flex-wrap gap-2">
						{settings.householdRoles.map((role) => (
							<Badge
								key={role}
								variant="secondary"
								className="flex items-center gap-1"
							>
								{role}
								<button
									type="button"
									onClick={() => removeRole(role)}
									className="ml-1 hover:text-red-600"
								>
									<X className="w-3 h-3" />
								</button>
							</Badge>
						))}
					</div>

					<div className="flex gap-2">
						<Input
							placeholder="Add new role (e.g., Foster Parent, Sitter)"
							value={newRole}
							onChange={(e) => setNewRole(e.target.value)}
							onKeyPress={(e) => e.key === "Enter" && addRole()}
						/>
						<Button onClick={addRole} variant="outline" size="sm">
							<Plus className="w-4 h-4" />
							Add
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Preferred Veterinarian */}
			<Card>
				<CardHeader>
					<CardTitle>Preferred Veterinarian</CardTitle>
					<CardDescription>
						Default veterinary clinic information
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="vet-name">Veterinarian/Clinic Name</Label>
						<Input
							id="vet-name"
							placeholder="Dr. Johnson's Animal Hospital"
							value={settings.preferredVeterinarian.name}
							onChange={(e) => updateVeterinarian({ name: e.target.value })}
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="vet-phone">Phone Number</Label>
							<Input
								id="vet-phone"
								type="tel"
								placeholder="+1 (555) 123-4567"
								value={settings.preferredVeterinarian.phone}
								onChange={(e) => updateVeterinarian({ phone: e.target.value })}
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="vet-address">Address</Label>
							<Input
								id="vet-address"
								placeholder="456 Pet Street, Petville, ST 12345"
								value={settings.preferredVeterinarian.address}
								onChange={(e) =>
									updateVeterinarian({ address: e.target.value })
								}
							/>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Inventory Preferences */}
			<Card>
				<CardHeader>
					<CardTitle>Inventory Management</CardTitle>
					<CardDescription>
						Set preferences for medication inventory tracking
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="low-stock">Low Stock Threshold (days)</Label>
							<Select
								value={settings.inventoryPreferences.lowStockThreshold.toString()}
								onValueChange={(value) =>
									updateInventoryPreferences({
										lowStockThreshold: parseInt(value),
									})
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="3">3 days</SelectItem>
									<SelectItem value="7">1 week</SelectItem>
									<SelectItem value="14">2 weeks</SelectItem>
									<SelectItem value="30">1 month</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="expiration-warning">
								Expiration Warning (days)
							</Label>
							<Select
								value={settings.inventoryPreferences.expirationWarningDays.toString()}
								onValueChange={(value) =>
									updateInventoryPreferences({
										expirationWarningDays: parseInt(value),
									})
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="7">1 week</SelectItem>
									<SelectItem value="14">2 weeks</SelectItem>
									<SelectItem value="30">1 month</SelectItem>
									<SelectItem value="60">2 months</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="flex items-center justify-between">
						<div>
							<Label htmlFor="auto-reorder">Auto-reorder Notifications</Label>
							<p className="text-sm text-gray-500">
								Get notified when medications run low
							</p>
						</div>
						<Switch
							id="auto-reorder"
							checked={settings.inventoryPreferences.autoReorderEnabled}
							onCheckedChange={(checked) =>
								updateInventoryPreferences({ autoReorderEnabled: checked })
							}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Save Button */}
			<div className="flex justify-end">
				<Button onClick={handleSaveSettings} disabled={isSaving} size="lg">
					{isSaving ? "Saving..." : "Save Settings"}
				</Button>
			</div>
		</div>
	);
}
