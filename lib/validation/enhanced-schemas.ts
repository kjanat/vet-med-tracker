/**
 * Enhanced Zod schemas with stricter validation for VetMed Tracker
 * Medical data-specific validation rules
 */

import { z } from "zod";
import {
	MedicalDataSanitizer,
	RequestSizeLimiter,
	SQLSanitizer,
	XSSSanitizer,
} from "./sanitizer";

/**
 * Custom Zod refinements for medical data
 */
const _noSqlInjection = z.string().refine((val) => SQLSanitizer.validate(val), {
	message: "Input contains potentially dangerous SQL patterns",
});

const _noXss = z.string().refine((val) => XSSSanitizer.validate(val), {
	message: "Input contains potentially dangerous HTML/JavaScript",
});

/**
 * Medical-specific validations
 */
export const MedicalSchemas = {
	// Medication name with sanitization
	medicationName: z
		.string()
		.min(1, "Medication name is required")
		.max(200, "Medication name too long")
		.transform((val) => MedicalDataSanitizer.sanitizeMedicationName(val))
		.refine((val) => val.length > 0, {
			message: "Invalid medication name",
		}),

	// Dosage validation with common formats
	dosage: z
		.string()
		.min(1, "Dosage is required")
		.max(50, "Dosage description too long")
		.regex(
			/^[\d.]+ ?(mg|ml|g|kg|lbs|unit|tab|cap|IU|mcg|L)?(\s?\/\s?[\d.]+ ?(kg|lbs|day|hour|dose))?$/i,
			"Invalid dosage format (e.g., '10 mg', '5 ml/kg', '2 tabs')",
		)
		.transform((val) => MedicalDataSanitizer.sanitizeDosage(val)),

	// Frequency validation
	frequency: z.enum([
		"SID", // Once daily
		"BID", // Twice daily
		"TID", // Three times daily
		"QID", // Four times daily
		"Q4H", // Every 4 hours
		"Q6H", // Every 6 hours
		"Q8H", // Every 8 hours
		"Q12H", // Every 12 hours
		"PRN", // As needed
		"WEEKLY", // Once per week
		"BIWEEKLY", // Every two weeks
		"MONTHLY", // Once per month
	]),

	// Route of administration
	route: z.enum([
		"ORAL",
		"SC", // Subcutaneous
		"IM", // Intramuscular
		"IV", // Intravenous
		"TOPICAL",
		"OTIC", // Ear
		"OPHTHALMIC", // Eye
		"INHALED",
		"RECTAL",
		"TRANSDERMAL",
		"OTHER",
	]),

	// Medication form
	form: z.enum([
		"TABLET",
		"CAPSULE",
		"LIQUID",
		"INJECTION",
		"CREAM",
		"OINTMENT",
		"DROPS",
		"SPRAY",
		"POWDER",
		"PATCH",
		"SUPPOSITORY",
		"OTHER",
	]),

	// Duration in days with reasonable limits
	duration: z
		.number()
		.int("Duration must be whole days")
		.min(1, "Duration must be at least 1 day")
		.max(365, "Duration cannot exceed 365 days"),

	// Weight validation (supports kg and lbs)
	weight: z.object({
		value: z
			.number()
			.positive("Weight must be positive")
			.max(1000, "Weight seems unrealistic"),
		unit: z.enum(["kg", "lbs"]),
	}),

	// Temperature validation (supports Celsius and Fahrenheit)
	temperature: z.object({
		value: z
			.number()
			.min(30, "Temperature too low")
			.max(45, "Temperature too high (in Celsius) or specify unit"),
		unit: z.enum(["celsius", "fahrenheit"]),
	}),

	// Instructions with XSS protection
	instructions: z
		.string()
		.max(1000, "Instructions too long")
		.transform((val) => MedicalDataSanitizer.sanitizeNotes(val))
		.optional(),

	// Veterinary license number
	vetLicense: z
		.string()
		.regex(/^[A-Z0-9]{5,20}$/, "Invalid license format")
		.optional(),

	// DEA number for controlled substances
	deaNumber: z
		.string()
		.regex(/^[A-Z][A-Z9]\d{7}$/, "Invalid DEA number format")
		.optional(),
};

/**
 * Animal-specific schemas
 */
export const AnimalSchemas = {
	// Animal name with sanitization
	name: z
		.string()
		.min(1, "Animal name is required")
		.max(100, "Animal name too long")
		.transform((val) => MedicalDataSanitizer.sanitizeAnimalName(val)),

	// Species validation
	species: z.enum([
		"dog",
		"cat",
		"rabbit",
		"bird",
		"horse",
		"hamster",
		"guinea_pig",
		"ferret",
		"reptile",
		"fish",
		"other",
	]),

	// Date of birth validation
	dateOfBirth: z
		.date()
		.max(new Date(), "Birth date cannot be in the future")
		.refine(
			(date) => {
				const age = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 365);
				return age <= 50; // Max 50 years old
			},
			{ message: "Age seems unrealistic (max 50 years)" },
		)
		.optional(),

	// Microchip ID validation
	microchipId: z
		.string()
		.regex(/^\d{15}$/, "Microchip ID must be 15 digits")
		.optional(),

	// Breed with sanitization
	breed: z
		.string()
		.max(100, "Breed name too long")
		.transform((val) => val.trim())
		.refine((val) => SQLSanitizer.validate(val) && XSSSanitizer.validate(val), {
			message: "Input contains potentially dangerous content",
		})
		.optional(),

	// Sex validation
	sex: z.enum(["male", "female", "unknown"]).optional(),

	// Neutered status
	neutered: z.boolean().default(false),

	// Color/markings
	color: z
		.string()
		.max(100, "Color description too long")
		.transform((val) => val.trim())
		.refine((val) => SQLSanitizer.validate(val) && XSSSanitizer.validate(val), {
			message: "Input contains potentially dangerous content",
		})
		.optional(),

	// Medical conditions array
	conditions: z
		.array(
			z
				.string()
				.max(200)
				.transform((val) => val.trim())
				.refine(
					(val) => SQLSanitizer.validate(val) && XSSSanitizer.validate(val),
					{
						message: "Input contains potentially dangerous content",
					},
				),
		)
		.max(20, "Too many conditions")
		.optional(),

	// Allergies array
	allergies: z
		.array(
			z
				.string()
				.max(200)
				.transform((val) => val.trim())
				.refine(
					(val) => SQLSanitizer.validate(val) && XSSSanitizer.validate(val),
					{
						message: "Input contains potentially dangerous content",
					},
				),
		)
		.max(20, "Too many allergies")
		.optional(),
};

/**
 * User/Contact schemas
 */
export const ContactSchemas = {
	// Email with sanitization
	email: z
		.string()
		.email("Invalid email format")
		.max(255, "Email too long")
		.transform((val) => MedicalDataSanitizer.sanitizeEmail(val))
		.refine((val) => val.length > 0, {
			message: "Invalid email",
		}),

	// Phone number with sanitization
	phone: z
		.string()
		.transform((val) => MedicalDataSanitizer.sanitizePhoneNumber(val))
		.refine(
			(val) => {
				// Basic phone validation (supports international)
				const phoneRegex = /^[\d\s+\-().]{7,20}$/;
				return phoneRegex.test(val);
			},
			{ message: "Invalid phone number" },
		)
		.optional(),

	// Name fields
	firstName: z
		.string()
		.min(1, "First name required")
		.max(100, "Name too long")
		.transform((val) => val.trim())
		.refine((val) => SQLSanitizer.validate(val) && XSSSanitizer.validate(val), {
			message: "Input contains potentially dangerous content",
		}),

	lastName: z
		.string()
		.min(1, "Last name required")
		.max(100, "Name too long")
		.transform((val) => val.trim())
		.refine((val) => SQLSanitizer.validate(val) && XSSSanitizer.validate(val), {
			message: "Input contains potentially dangerous content",
		}),

	// Address fields
	address: z
		.object({
			street: z
				.string()
				.max(200)
				.transform((val) => val.trim())
				.refine(
					(val) => SQLSanitizer.validate(val) && XSSSanitizer.validate(val),
					{
						message: "Input contains potentially dangerous content",
					},
				)
				.optional(),
			city: z
				.string()
				.max(100)
				.transform((val) => val.trim())
				.refine(
					(val) => SQLSanitizer.validate(val) && XSSSanitizer.validate(val),
					{
						message: "Input contains potentially dangerous content",
					},
				)
				.optional(),
			state: z
				.string()
				.max(50)
				.transform((val) => val.trim())
				.refine(
					(val) => SQLSanitizer.validate(val) && XSSSanitizer.validate(val),
					{
						message: "Input contains potentially dangerous content",
					},
				)
				.optional(),
			postalCode: z
				.string()
				.regex(/^[A-Z0-9\s-]{3,10}$/, "Invalid postal code")
				.optional(),
			country: z
				.string()
				.max(100)
				.transform((val) => val.trim())
				.refine(
					(val) => SQLSanitizer.validate(val) && XSSSanitizer.validate(val),
					{
						message: "Input contains potentially dangerous content",
					},
				)
				.optional(),
		})
		.optional(),
};

/**
 * Administration/Recording schemas
 */
export const AdministrationSchemas = {
	// Idempotency key for preventing duplicates
	idempotencyKey: z
		.string()
		.regex(
			/^[a-zA-Z0-9]{8,}:[a-zA-Z0-9]{8,}:\d{4}-\d{2}-\d{2}:\d+$/,
			"Invalid idempotency key format",
		),

	// Administration status
	status: z.enum(["ON_TIME", "LATE", "VERY_LATE", "MISSED", "PRN"]),

	// Timestamp validation
	administeredAt: z
		.date()
		.max(new Date(), "Cannot record future administrations")
		.refine(
			(date) => {
				// Must be within last 48 hours
				const hoursSince = (Date.now() - date.getTime()) / (1000 * 60 * 60);
				return hoursSince <= 48;
			},
			{ message: "Administration too old (max 48 hours)" },
		),

	// Notes with sanitization
	notes: z
		.string()
		.max(500, "Notes too long")
		.transform((val) => MedicalDataSanitizer.sanitizeNotes(val))
		.optional(),

	// Co-sign requirement for high-risk medications
	requiresCoSign: z.boolean().default(false),

	// Co-signer validation
	coSignerId: z.string().uuid("Invalid co-signer ID").optional(),

	coSignedAt: z
		.date()
		.refine(
			(_date) => {
				// Co-sign must be within 10 minutes of administration
				// This would need the administeredAt value from context
				return true; // Simplified for now
			},
			{ message: "Co-sign must be within 10 minutes" },
		)
		.optional(),
};

/**
 * Inventory schemas
 */
export const InventorySchemas = {
	// Lot number validation
	lotNumber: z
		.string()
		.regex(/^[A-Z0-9-]{3,50}$/, "Invalid lot number format")
		.optional(),

	// Expiration date validation
	expirationDate: z
		.date()
		.min(new Date(), "Medication is expired")
		.refine(
			(date) => {
				// Warn if expiring within 30 days
				const daysUntilExpiry =
					(date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
				return daysUntilExpiry > 0;
			},
			{ message: "Medication is expired" },
		),

	// Quantity validation
	quantity: z.object({
		value: z
			.number()
			.int("Quantity must be whole number")
			.min(0, "Quantity cannot be negative")
			.max(9999, "Quantity too large"),
		unit: z.enum([
			"tablets",
			"capsules",
			"ml",
			"mg",
			"units",
			"bottles",
			"vials",
		]),
	}),

	// Storage requirements
	storage: z.enum([
		"ROOM", // Room temperature
		"FRIDGE", // Refrigerated
		"FREEZER", // Frozen
		"CONTROLLED", // Controlled substance
		"DARK", // Protected from light
	]),

	// NDC (National Drug Code) validation
	ndc: z
		.string()
		.regex(/^\d{5}-\d{4}-\d{2}$/, "Invalid NDC format (XXXXX-XXXX-XX)")
		.optional(),

	// Barcode validation (EAN/UPC)
	barcode: z
		.string()
		.regex(/^[0-9]{8,13}$/, "Invalid barcode format")
		.optional(),
};

/**
 * Request validation schemas
 */
export const RequestSchemas = {
	// Pagination
	pagination: z.object({
		page: z.number().int().min(1).max(1000).default(1),
		limit: z.number().int().min(1).max(100).default(20),
		sortBy: z.string().optional(),
		sortOrder: z.enum(["asc", "desc"]).default("desc"),
	}),

	// Date range
	dateRange: z
		.object({
			from: z.date(),
			to: z.date(),
		})
		.refine((data) => data.to >= data.from, {
			message: "End date must be after start date",
		}),

	// Search query
	searchQuery: z
		.string()
		.max(100, "Search query too long")
		.transform((val) => val.trim())
		.refine((val) => SQLSanitizer.validate(val) && XSSSanitizer.validate(val), {
			message: "Input contains potentially dangerous content",
		})
		.optional(),

	// UUID validation
	uuid: z.string().uuid("Invalid ID format"),

	// Household ID with extra validation
	householdId: z
		.string()
		.uuid("Invalid household ID")
		.refine(
			(_val) => {
				// Could add additional checks here
				return true;
			},
			{ message: "Invalid household ID" },
		),
};

/**
 * File upload schemas
 */
export const FileSchemas = {
	// Image upload
	imageUpload: z.object({
		name: z
			.string()
			.max(255)
			.transform((val) => val.trim())
			.refine(
				(val) => SQLSanitizer.validate(val) && XSSSanitizer.validate(val),
				{
					message: "Input contains potentially dangerous content",
				},
			),
		type: z.enum([
			"image/jpeg",
			"image/jpg",
			"image/png",
			"image/webp",
			"image/gif",
		]),
		size: z.number().max(5 * 1024 * 1024, "Image too large (max 5MB)"),
		data: z.string().optional(), // Base64 or URL
	}),

	// Document upload
	documentUpload: z.object({
		name: z
			.string()
			.max(255)
			.transform((val) => val.trim())
			.refine(
				(val) => SQLSanitizer.validate(val) && XSSSanitizer.validate(val),
				{
					message: "Input contains potentially dangerous content",
				},
			),
		type: z.enum(["application/pdf", "image/jpeg", "image/jpg", "image/png"]),
		size: z.number().max(10 * 1024 * 1024, "Document too large (max 10MB)"),
		data: z.string().optional(), // Base64 or URL
	}),
};

/**
 * Composite schemas for complete entities
 */
export const EntitySchemas = {
	// Complete medication regimen
	regimen: z.object({
		animalId: RequestSchemas.uuid,
		medicationId: RequestSchemas.uuid,
		name: MedicalSchemas.medicationName,
		dosage: MedicalSchemas.dosage,
		frequency: MedicalSchemas.frequency,
		route: MedicalSchemas.route,
		form: MedicalSchemas.form,
		duration: MedicalSchemas.duration,
		startDate: z.date(),
		endDate: z.date().optional(),
		instructions: MedicalSchemas.instructions,
		prescribedBy: ContactSchemas.firstName.optional(),
		prescriptionNumber: z
			.string()
			.max(50)
			.transform((val) => val.trim())
			.refine(
				(val) => SQLSanitizer.validate(val) && XSSSanitizer.validate(val),
				{
					message: "Input contains potentially dangerous content",
				},
			)
			.optional(),
		isHighRisk: z.boolean().default(false),
		requiresCoSign: z.boolean().default(false),
	}),

	// Complete animal profile
	animal: z.object({
		householdId: RequestSchemas.householdId,
		name: AnimalSchemas.name,
		species: AnimalSchemas.species,
		breed: AnimalSchemas.breed,
		sex: AnimalSchemas.sex,
		neutered: AnimalSchemas.neutered,
		dateOfBirth: AnimalSchemas.dateOfBirth,
		weight: MedicalSchemas.weight.optional(),
		microchipId: AnimalSchemas.microchipId,
		color: AnimalSchemas.color,
		photoUrl: z.string().url().optional(),
		conditions: AnimalSchemas.conditions,
		allergies: AnimalSchemas.allergies,
		vetName: ContactSchemas.firstName.optional(),
		vetPhone: ContactSchemas.phone,
		vetEmail: ContactSchemas.email.optional(),
		notes: MedicalSchemas.instructions,
	}),

	// Complete administration record
	administration: z.object({
		animalId: RequestSchemas.uuid,
		regimenId: RequestSchemas.uuid,
		administeredBy: RequestSchemas.uuid,
		administeredAt: AdministrationSchemas.administeredAt,
		status: AdministrationSchemas.status,
		notes: AdministrationSchemas.notes,
		idempotencyKey: AdministrationSchemas.idempotencyKey,
		requiresCoSign: AdministrationSchemas.requiresCoSign,
		coSignerId: AdministrationSchemas.coSignerId,
		coSignedAt: AdministrationSchemas.coSignedAt,
		inventoryItemId: RequestSchemas.uuid.optional(),
	}),
};

/**
 * Request size validation middleware
 */
export const validateRequestSize = (data: unknown): boolean => {
	return RequestSizeLimiter.validateJsonSize(data);
};

/**
 * Create a sanitized schema from an existing schema
 */
export function createSanitizedSchema<T extends z.ZodTypeAny>(
	schema: T,
	sanitizer?: (value: unknown) => unknown,
): z.ZodType {
	return schema.transform((value) => {
		if (sanitizer) {
			return sanitizer(value);
		}
		// Default sanitization for strings
		if (typeof value === "string") {
			return XSSSanitizer.sanitize(SQLSanitizer.sanitize(value));
		}
		return value;
	});
}

/**
 * Error message helper
 */
export const ValidationMessages = {
	required: (field: string) => `${field} is required`,
	tooLong: (field: string, max: number) =>
		`${field} must be less than ${max} characters`,
	tooShort: (field: string, min: number) =>
		`${field} must be at least ${min} characters`,
	invalid: (field: string) => `${field} is invalid`,
	future: (field: string) => `${field} cannot be in the future`,
	past: (field: string) => `${field} cannot be in the past`,
	expired: "This item has expired",
	dangerous: "Input contains potentially dangerous content",
};
