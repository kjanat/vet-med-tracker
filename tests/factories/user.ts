/**
 * User factory for test data generation
 */

import type { NewUser } from "@/db/schema";
import { dates } from "./utils/dates";
import { location, person, random } from "./utils/random";

// User factory function
export function createUser(overrides: Partial<NewUser> = {}): NewUser {
	const firstName = person.firstName();
	const lastName = person.lastName();
	const email = person.email(firstName, lastName);

	return {
		id: random.uuid(),
		email,
		name: `${firstName} ${lastName}`,
		firstName,
		lastName,
		image: null,
		stackUserId: `stack_${random.alphaNumeric(16)}`,
		emailVerified: random.boolean(0.8)
			? dates.datePast(0.5).toISOString()
			: null,

		// Profile fields
		bio: random.boolean(0.3)
			? `Pet lover and ${random.arrayElement(["veterinarian", "pet owner", "animal caretaker", "pet sitter"])}`
			: null,
		pronouns: random.boolean(0.2)
			? random.arrayElement(["she/her", "he/him", "they/them"])
			: null,
		location: random.boolean(0.4) ? location.city() : null,
		website: null,
		socialLinks: {},
		profileData: {},
		profileVisibility: {
			name: true,
			email: false,
			bio: true,
			location: true,
		},
		profileCompletedAt: random.boolean(0.6)
			? dates.datePast(30).toISOString()
			: null,

		// Preferences
		preferredTimezone: location.timezone(),
		preferredPhoneNumber: random.boolean(0.7) ? person.phone() : null,
		use24HourTime: random.boolean(0.3),
		temperatureUnit: random.arrayElement(["celsius", "fahrenheit"]),
		weightUnit: random.arrayElement(["kg", "lbs"]),
		emailReminders: random.boolean(0.8),
		smsReminders: random.boolean(0.4),
		pushNotifications: random.boolean(0.9),
		reminderLeadTimeMinutes: random.arrayElement(["5", "10", "15", "30", "60"]),
		emergencyContactName: random.boolean(0.5) ? person.fullName() : null,
		emergencyContactPhone: random.boolean(0.5) ? person.phone() : null,
		onboardingComplete: random.boolean(0.7),
		onboardingCompletedAt: random.boolean(0.7)
			? dates.datePast(60).toISOString()
			: null,
		weekStartsOn: random.arrayElement([0, 1]), // Sunday or Monday
		defaultHouseholdId: null, // Set by relationships
		defaultAnimalId: null, // Set by relationships
		theme: random.arrayElement(["system", "light", "dark"]),
		preferencesBackup: null,

		// Timestamps
		createdAt: dates.datePast(180).toISOString(),
		updatedAt: dates.dateRecent(30).toISOString(),

		...overrides,
	};
}

// User builder class for complex scenarios
export class UserBuilder {
	private user: Partial<NewUser> = {};

	static create(): UserBuilder {
		return new UserBuilder();
	}

	withEmail(email: string): UserBuilder {
		this.user.email = email;
		return this;
	}

	withName(firstName: string, lastName: string): UserBuilder {
		this.user.firstName = firstName;
		this.user.lastName = lastName;
		this.user.name = `${firstName} ${lastName}`;
		return this;
	}

	withStackUserId(stackUserId: string): UserBuilder {
		this.user.stackUserId = stackUserId;
		return this;
	}

	withPreferences(preferences: {
		timezone?: string;
		weightUnit?: "kg" | "lbs";
		temperatureUnit?: "celsius" | "fahrenheit";
		use24HourTime?: boolean;
	}): UserBuilder {
		if (preferences.timezone)
			this.user.preferredTimezone = preferences.timezone;
		if (preferences.weightUnit) this.user.weightUnit = preferences.weightUnit;
		if (preferences.temperatureUnit)
			this.user.temperatureUnit = preferences.temperatureUnit;
		if (preferences.use24HourTime !== undefined)
			this.user.use24HourTime = preferences.use24HourTime;
		return this;
	}

	withOnboarding(completed = true): UserBuilder {
		this.user.onboardingComplete = completed;
		this.user.onboardingCompletedAt = completed
			? dates.datePast(30).toISOString()
			: null;
		return this;
	}

	withProfile(profile: {
		bio?: string;
		pronouns?: string;
		location?: string;
		website?: string;
	}): UserBuilder {
		if (profile.bio) this.user.bio = profile.bio;
		if (profile.pronouns) this.user.pronouns = profile.pronouns;
		if (profile.location) this.user.location = profile.location;
		if (profile.website) this.user.website = profile.website;
		this.user.profileCompletedAt = dates.dateRecent(7).toISOString();
		return this;
	}

	withNotificationPreferences(preferences: {
		email?: boolean;
		sms?: boolean;
		push?: boolean;
		leadTimeMinutes?: string;
	}): UserBuilder {
		if (preferences.email !== undefined)
			this.user.emailReminders = preferences.email;
		if (preferences.sms !== undefined) this.user.smsReminders = preferences.sms;
		if (preferences.push !== undefined)
			this.user.pushNotifications = preferences.push;
		if (preferences.leadTimeMinutes)
			this.user.reminderLeadTimeMinutes = preferences.leadTimeMinutes;
		return this;
	}

	withEmergencyContact(name: string, phone: string): UserBuilder {
		this.user.emergencyContactName = name;
		this.user.emergencyContactPhone = phone;
		return this;
	}

	createdDaysAgo(days: number): UserBuilder {
		this.user.createdAt = dates.daysFromNow(-days).toISOString();
		this.user.updatedAt = dates.dateRecent(Math.min(days, 7)).toISOString();
		return this;
	}

	build(): NewUser {
		return createUser(this.user);
	}
}

// Preset user types for common scenarios
export const userPresets = {
	newUser: (): NewUser =>
		UserBuilder.create()
			.withOnboarding(false)
			.withNotificationPreferences({
				email: true,
				sms: false,
				push: true,
				leadTimeMinutes: "15",
			})
			.createdDaysAgo(1)
			.build(),

	completedUser: (): NewUser =>
		UserBuilder.create()
			.withOnboarding(true)
			.withProfile({
				bio: "Loving pet parent",
				location: location.city(),
			})
			.withNotificationPreferences({
				email: true,
				sms: true,
				push: true,
				leadTimeMinutes: "30",
			})
			.withEmergencyContact(person.fullName(), person.phone())
			.createdDaysAgo(30)
			.build(),

	veterinarian: (): NewUser =>
		UserBuilder.create()
			.withProfile({
				bio: "Licensed veterinarian specializing in small animal care",
				location: location.city(),
			})
			.withPreferences({
				weightUnit: "kg",
				temperatureUnit: "celsius",
				use24HourTime: true,
			})
			.withOnboarding(true)
			.createdDaysAgo(180)
			.build(),

	petSitter: (): NewUser =>
		UserBuilder.create()
			.withProfile({
				bio: "Professional pet sitter and dog walker",
				location: location.city(),
			})
			.withNotificationPreferences({
				email: true,
				sms: true,
				push: true,
				leadTimeMinutes: "10",
			})
			.withOnboarding(true)
			.createdDaysAgo(60)
			.build(),
};
