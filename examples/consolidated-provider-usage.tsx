/**
 * Example Usage of Consolidated AppProvider
 *
 * This file demonstrates various ways to use the new consolidated provider
 * and its backwards-compatible hooks.
 */

import React, { useMemo } from "react";
import {
	useApp,
	useAuth,
	useDateTimeFormatting,
	useHouseholdInfo,
	useNotificationPreferences,
	useScreenReaderAnnouncements,
	useUserPreferencesContext,
	useUserTimezone,
} from "@/components/providers/app-provider-consolidated";

// =============================================================================
// BASIC USAGE EXAMPLES
// =============================================================================

/**
 * Basic component using consolidated provider
 * Shows how to access common app state
 */
function BasicExample() {
	const {
		user,
		selectedHousehold,
		selectedAnimal,
		// biome-ignore lint/correctness/noUnusedVariables: Example showing available properties
		households, // Used in household selector
		animals,
		isAuthenticated,
		loading,
		errors,
	} = useApp();

	if (loading.user) {
		return <div>Loading user...</div>;
	}

	if (errors.user) {
		return <div>Error: {errors.user}</div>;
	}

	if (!isAuthenticated) {
		return <div>Please sign in</div>;
	}

	return (
		<div>
			<h1>Welcome, {user?.name}!</h1>

			{selectedHousehold ? (
				<div>
					<h2>Current Household: {selectedHousehold.name}</h2>
					<p>Animals: {animals.length}</p>

					{selectedAnimal && (
						<div>
							<h3>Selected Animal: {selectedAnimal.name}</h3>
							<p>Species: {selectedAnimal.species}</p>
							<p>Pending Medications: {selectedAnimal.pendingMeds}</p>
						</div>
					)}
				</div>
			) : (
				<p>No household selected</p>
			)}
		</div>
	);
}

/**
 * Component demonstrating household and animal selection
 */
function HouseholdAnimalSelector() {
	const {
		households,
		animals,
		selectedHousehold,
		selectedAnimal,
		setSelectedHousehold,
		setSelectedAnimal,
	} = useApp();

	return (
		<div className="space-y-4">
			<div>
				<label
					htmlFor="household-select"
					className="mb-2 block font-medium text-sm"
				>
					Select Household:
				</label>
				<select
					id="household-select"
					value={selectedHousehold?.id || ""}
					onChange={(e) => {
						const household = households.find((h) => h.id === e.target.value);
						setSelectedHousehold(household || null);
					}}
					className="w-full rounded border p-2"
				>
					<option value="">Select a household...</option>
					{households.map((household) => (
						<option key={household.id} value={household.id}>
							{household.name}
						</option>
					))}
				</select>
			</div>

			{selectedHousehold && animals.length > 0 && (
				<div>
					<label
						htmlFor="animal-select"
						className="mb-2 block font-medium text-sm"
					>
						Select Animal:
					</label>
					<select
						id="animal-select"
						value={selectedAnimal?.id || ""}
						onChange={(e) => {
							const animal = animals.find((a) => a.id === e.target.value);
							setSelectedAnimal(animal || null);
						}}
						className="w-full rounded border p-2"
					>
						<option value="">Select an animal...</option>
						{animals.map((animal) => (
							<option key={animal.id} value={animal.id}>
								{animal.name} ({animal.species})
								{animal.pendingMeds > 0 &&
									` - ${animal.pendingMeds} pending meds`}
							</option>
						))}
					</select>
				</div>
			)}
		</div>
	);
}

// =============================================================================
// BACKWARDS COMPATIBILITY EXAMPLES
// =============================================================================

/**
 * Component using legacy auth hook (backwards compatible)
 */
function AuthExample() {
	const { user, isAuthenticated, isLoading, login, logout } = useAuth();

	if (isLoading) {
		return <div>Loading auth...</div>;
	}

	return (
		<div>
			{isAuthenticated ? (
				<div>
					<p>Signed in as: {user?.name}</p>
					<button
						type="button"
						onClick={logout}
						className="rounded bg-red-500 px-4 py-2 text-white"
					>
						Sign Out
					</button>
				</div>
			) : (
				<div>
					<p>Not signed in</p>
					<button
						type="button"
						onClick={login}
						className="rounded bg-blue-500 px-4 py-2 text-white"
					>
						Sign In
					</button>
				</div>
			)}
		</div>
	);
}

/**
 * Component using legacy preferences hook (backwards compatible)
 */
function PreferencesExample() {
	const {
		vetMedPreferences,
		// biome-ignore lint/correctness/noUnusedVariables: Example showing available properties
		householdSettings, // Available for household configuration
		updateVetMedPreferences,
		// biome-ignore lint/correctness/noUnusedVariables: Example showing available properties
		updateHouseholdSettings, // Available for household updates
		formatTime,
		formatWeight,
		formatTemperature,
		isFirstTimeUser,
		markOnboardingComplete,
	} = useUserPreferencesContext();

	const handleToggle24Hour = async () => {
		await updateVetMedPreferences({
			displayPreferences: {
				...vetMedPreferences.displayPreferences,
				use24HourTime: !vetMedPreferences.displayPreferences.use24HourTime,
			},
		});
	};

	const handleWeightUnitToggle = async () => {
		const newUnit =
			vetMedPreferences.displayPreferences.weightUnit === "kg" ? "lbs" : "kg";
		await updateVetMedPreferences({
			displayPreferences: {
				...vetMedPreferences.displayPreferences,
				weightUnit: newUnit,
			},
		});
	};

	const now = new Date();
	const sampleWeight = 25; // kg
	const sampleTemp = 38.5; // celsius

	return (
		<div className="space-y-4">
			<h2>User Preferences</h2>

			{isFirstTimeUser && (
				<div className="rounded bg-blue-50 p-4">
					<p>Welcome! Complete your setup:</p>
					<button
						type="button"
						onClick={markOnboardingComplete}
						className="mt-2 rounded bg-blue-500 px-4 py-2 text-white"
					>
						Complete Onboarding
					</button>
				</div>
			)}

			<div>
				<h3>Display Preferences</h3>
				<div className="space-y-2">
					<label className="flex items-center">
						<input
							type="checkbox"
							checked={vetMedPreferences.displayPreferences.use24HourTime}
							onChange={handleToggle24Hour}
							className="mr-2"
						/>
						Use 24-hour time format
					</label>
					<p>Current time: {formatTime(now)}</p>
				</div>

				<div className="space-y-2">
					<label className="flex items-center">
						<input
							type="checkbox"
							checked={vetMedPreferences.displayPreferences.weightUnit === "kg"}
							onChange={handleWeightUnitToggle}
							className="mr-2"
						/>
						Use metric weight (kg)
					</label>
					<p>Sample weight: {formatWeight(sampleWeight)}</p>
				</div>

				<div>
					<p>Sample temperature: {formatTemperature(sampleTemp)}</p>
				</div>
			</div>

			<div>
				<h3>Notification Preferences</h3>
				<p>
					Email reminders:{" "}
					{vetMedPreferences.notificationPreferences.emailReminders
						? "On"
						: "Off"}
				</p>
				<p>
					SMS reminders:{" "}
					{vetMedPreferences.notificationPreferences.smsReminders
						? "On"
						: "Off"}
				</p>
				<p>
					Lead time:{" "}
					{vetMedPreferences.notificationPreferences.reminderLeadTime} minutes
				</p>
			</div>
		</div>
	);
}

/**
 * Component using accessibility features
 */
function AccessibilityExample() {
	const { announce } = useScreenReaderAnnouncements();
	const { accessibility } = useApp();

	const handleSave = () => {
		// Simulate save operation
		setTimeout(() => {
			announce("Settings saved successfully", "polite");
		}, 1000);
	};

	const handleError = () => {
		announce("Error: Unable to save settings. Please try again.", "assertive");
	};

	return (
		<div className="space-y-4">
			<h2>Accessibility Features</h2>

			<div className="space-y-2">
				<button
					type="button"
					onClick={handleSave}
					className="rounded bg-green-500 px-4 py-2 text-white"
				>
					Save Settings (Success Announcement)
				</button>

				<button
					type="button"
					onClick={handleError}
					className="rounded bg-red-500 px-4 py-2 text-white"
				>
					Trigger Error (Error Announcement)
				</button>
			</div>

			<div className="mt-4 rounded bg-gray-100 p-4">
				<h3>Current Announcements</h3>
				<p>
					<strong>Polite:</strong>{" "}
					{accessibility.announcements.polite || "None"}
				</p>
				<p>
					<strong>Assertive:</strong>{" "}
					{accessibility.announcements.assertive || "None"}
				</p>
			</div>
		</div>
	);
}

// =============================================================================
// SPECIALIZED HOOK EXAMPLES
// =============================================================================

/**
 * Component using specialized formatting hooks
 */
function FormattingExample() {
	const { formatTime, formatDate, formatDateTime, formatTimeInTimezone } =
		useDateTimeFormatting();
	const userTimezone = useUserTimezone();

	const now = new Date();
	const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

	return (
		<div className="space-y-2">
			<h2>Date/Time Formatting</h2>
			<p>
				<strong>User Timezone:</strong> {userTimezone}
			</p>
			<p>
				<strong>Current Time:</strong> {formatTime(now)}
			</p>
			<p>
				<strong>Current Date:</strong> {formatDate(now)}
			</p>
			<p>
				<strong>Current DateTime:</strong> {formatDateTime(now)}
			</p>
			<p>
				<strong>Future Date:</strong> {formatDate(futureDate)}
			</p>
			<p>
				<strong>Time in EST:</strong>{" "}
				{formatTimeInTimezone(now, "America/New_York")}
			</p>
			<p>
				<strong>Time in PST:</strong>{" "}
				{formatTimeInTimezone(now, "America/Los_Angeles")}
			</p>
		</div>
	);
}

/**
 * Component using notification preferences
 */
function NotificationExample() {
	const notificationPrefs = useNotificationPreferences();

	return (
		<div>
			<h2>Notification Settings</h2>
			<ul className="space-y-1">
				<li>
					📧 Email:{" "}
					{notificationPrefs.emailReminders ? "✅ Enabled" : "❌ Disabled"}
				</li>
				<li>
					📱 SMS:{" "}
					{notificationPrefs.smsReminders ? "✅ Enabled" : "❌ Disabled"}
				</li>
				<li>
					🔔 Push:{" "}
					{notificationPrefs.pushNotifications ? "✅ Enabled" : "❌ Disabled"}
				</li>
				<li>⏰ Lead Time: {notificationPrefs.reminderLeadTime} minutes</li>
			</ul>
		</div>
	);
}

/**
 * Component using household information
 */
function HouseholdInfoExample() {
	const { householdName, location, veterinarian, roles, inventoryPreferences } =
		useHouseholdInfo();

	return (
		<div className="space-y-4">
			<h2>Household Information</h2>

			<div>
				<h3>Basic Info</h3>
				<p>
					<strong>Name:</strong> {householdName || "Not set"}
				</p>
				<p>
					<strong>Location:</strong> {location.city}, {location.state}
				</p>
				<p>
					<strong>Timezone:</strong> {location.timezone}
				</p>
			</div>

			<div>
				<h3>Veterinarian</h3>
				<p>
					<strong>Name:</strong> {veterinarian.name || "Not set"}
				</p>
				<p>
					<strong>Phone:</strong> {veterinarian.phone || "Not set"}
				</p>
				<p>
					<strong>Address:</strong> {veterinarian.address || "Not set"}
				</p>
			</div>

			<div>
				<h3>Roles</h3>
				<ul>
					{roles.map((role) => (
						<li key={role}>{role}</li>
					))}
				</ul>
			</div>

			<div>
				<h3>Inventory Preferences</h3>
				<p>
					<strong>Low Stock Threshold:</strong>{" "}
					{inventoryPreferences.lowStockThreshold} days
				</p>
				<p>
					<strong>Auto Reorder:</strong>{" "}
					{inventoryPreferences.autoReorderEnabled ? "Enabled" : "Disabled"}
				</p>
				<p>
					<strong>Expiration Warning:</strong>{" "}
					{inventoryPreferences.expirationWarningDays} days
				</p>
			</div>
		</div>
	);
}

// =============================================================================
// PERFORMANCE-OPTIMIZED COMPONENTS
// =============================================================================

/**
 * Memoized component to prevent unnecessary re-renders
 */
const OptimizedAnimalCard = React.memo(({ animalId }: { animalId: string }) => {
	const { animals } = useApp();

	const animal = useMemo(
		() => animals.find((a) => a.id === animalId),
		[animals, animalId],
	);

	if (!animal) return null;

	return (
		<div className="rounded border p-4">
			<h3>{animal.name}</h3>
			<p>Species: {animal.species}</p>
			{animal.pendingMeds > 0 && (
				<p className="text-red-500">
					⚠️ {animal.pendingMeds} pending medication
					{animal.pendingMeds > 1 ? "s" : ""}
				</p>
			)}
		</div>
	);
});

/**
 * Component demonstrating efficient list rendering
 */
function OptimizedAnimalList() {
	const { animals, loading } = useApp();

	const sortedAnimals = useMemo(
		() => [...animals].sort((a, b) => a.name.localeCompare(b.name)),
		[animals],
	);

	if (loading.animals) {
		return <div>Loading animals...</div>;
	}

	return (
		<div className="space-y-4">
			<h2>Animals ({animals.length})</h2>
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{sortedAnimals.map((animal) => (
					<OptimizedAnimalCard key={animal.id} animalId={animal.id} />
				))}
			</div>
		</div>
	);
}

// =============================================================================
// COMPLETE DASHBOARD EXAMPLE
// =============================================================================

/**
 * Complete dashboard showing various features
 */
export default function ConsolidatedProviderDashboard() {
	const { isAuthenticated, loading, isOffline, pendingSyncCount } = useApp();

	if (loading.user) {
		return (
			<div className="flex h-screen items-center justify-center">
				<div className="text-lg">Loading VetMed Tracker...</div>
			</div>
		);
	}

	if (!isAuthenticated) {
		return (
			<div className="flex h-screen items-center justify-center">
				<AuthExample />
			</div>
		);
	}

	return (
		<div className="mx-auto max-w-6xl space-y-8 p-6">
			{/* Status Bar */}
			<div className="flex items-center justify-between rounded bg-gray-100 p-4">
				<div className="flex items-center space-x-4">
					<div
						className={`h-3 w-3 rounded-full ${isOffline ? "bg-red-500" : "bg-green-500"}`}
					/>
					<span>{isOffline ? "Offline" : "Online"}</span>
					{pendingSyncCount > 0 && (
						<span className="rounded bg-yellow-100 px-2 py-1 text-sm">
							{pendingSyncCount} items pending sync
						</span>
					)}
				</div>
			</div>

			{/* Main Dashboard */}
			<div className="grid gap-8 lg:grid-cols-2">
				<div className="space-y-6">
					<BasicExample />
					<HouseholdAnimalSelector />
					<AuthExample />
				</div>

				<div className="space-y-6">
					<PreferencesExample />
					<AccessibilityExample />
					<FormattingExample />
				</div>
			</div>

			{/* Secondary Content */}
			<div className="grid gap-8 lg:grid-cols-3">
				<NotificationExample />
				<HouseholdInfoExample />
				<OptimizedAnimalList />
			</div>
		</div>
	);
}
