/**
 * Date generation utilities for test data
 */

import { random } from "./random";

export const dates = {
	// Common test dates
	now: () => new Date(),
	today: () => new Date(new Date().setHours(0, 0, 0, 0)),
	tomorrow: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
	yesterday: () => new Date(Date.now() - 24 * 60 * 60 * 1000),

	// Relative dates
	minutesFromNow: (minutes: number) =>
		new Date(Date.now() + minutes * 60 * 1000),
	hoursFromNow: (hours: number) =>
		new Date(Date.now() + hours * 60 * 60 * 1000),
	daysFromNow: (days: number) =>
		new Date(Date.now() + days * 24 * 60 * 60 * 1000),
	weeksFromNow: (weeks: number) =>
		new Date(Date.now() + weeks * 7 * 24 * 60 * 60 * 1000),
	monthsFromNow: (months: number) => {
		const date = new Date();
		date.setMonth(date.getMonth() + months);
		return date;
	},

	// Random date ranges
	randomBetween: (startDate: Date, endDate: Date) => {
		const start = startDate.getTime();
		const end = endDate.getTime();
		return new Date(start + random.float(0, 1) * (end - start));
	},

	// Medical-specific dates
	birthDate: (ageYears?: number, ageMonths?: number) => {
		const now = new Date();
		if (ageYears) {
			return new Date(
				now.getFullYear() - ageYears,
				now.getMonth(),
				now.getDate(),
			);
		}
		if (ageMonths) {
			const date = new Date(now);
			date.setMonth(date.getMonth() - ageMonths);
			return date;
		}
		// Random age between 1 month and 15 years
		const randomMonths = random.int(1, 180);
		const date = new Date(now);
		date.setMonth(date.getMonth() - randomMonths);
		return date;
	},

	// Medication scheduling
	nextDoseTime: (intervalHours = 12) => {
		const now = new Date();
		// Round to next hour for cleaner test data
		const nextHour = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate(),
			now.getHours() + 1,
			0,
			0,
		);
		return new Date(nextHour.getTime() + intervalHours * 60 * 60 * 1000);
	},

	recentAdministration: (daysAgo = 1) => {
		return new Date(
			Date.now() -
				daysAgo * 24 * 60 * 60 * 1000 -
				random.int(0, 4) * 60 * 60 * 1000,
		);
	},

	// Inventory dates
	expirationDate: (monthsInFuture = 12) => {
		const date = new Date();
		date.setMonth(date.getMonth() + monthsInFuture + random.int(0, 12));
		return date;
	},

	purchaseDate: (daysAgo = 30) => {
		return new Date(Date.now() - random.int(1, daysAgo) * 24 * 60 * 60 * 1000);
	},

	// Format helpers for database
	toDateString: (date: Date) => date.toISOString().split("T")[0],
	toISOString: (date: Date) => date.toISOString(),
	toTimeString: (date: Date) =>
		date.toTimeString().split(" ")[0].substring(0, 5), // HH:MM format

	// Common date ranges for test scenarios
	ranges: {
		lastWeek: {
			start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
			end: new Date(),
		},
		thisWeek: {
			start: new Date(
				new Date().setDate(new Date().getDate() - new Date().getDay()),
			),
			end: new Date(
				new Date().setDate(new Date().getDate() - new Date().getDay() + 6),
			),
		},
		nextMonth: {
			start: (() => {
				const date = new Date();
				return new Date(date.getFullYear(), date.getMonth() + 1, 1);
			})(),
			end: (() => {
				const date = new Date();
				return new Date(date.getFullYear(), date.getMonth() + 2, 0);
			})(),
		},
	},
};

// Time generation for medication schedules
export const times = {
	// Common medication times
	morning: "08:00",
	noon: "12:00",
	evening: "18:00",
	bedtime: "22:00",

	// Generate BID (twice daily) times
	bid: () => ["08:00", "20:00"],

	// Generate TID (three times daily) times
	tid: () => ["08:00", "14:00", "20:00"],

	// Generate QID (four times daily) times
	qid: () => ["06:00", "12:00", "18:00", "24:00"],

	// Generate times based on interval
	intervalTimes: (intervalHours: number, startTime = "08:00") => {
		const times: string[] = [startTime];
		const [startHour, startMinute] = startTime.split(":").map(Number);
		let currentHour = startHour;

		for (let i = 1; i < Math.floor(24 / intervalHours); i++) {
			currentHour = (currentHour + intervalHours) % 24;
			times.push(
				`${currentHour.toString().padStart(2, "0")}:${startMinute.toString().padStart(2, "0")}`,
			);
		}

		return times;
	},

	// Random time within business hours
	businessHours: () => {
		const hour = random.int(8, 17); // 8 AM to 5 PM
		const minute = random.arrayElement([0, 15, 30, 45]);
		return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
	},
};
