import { createSubjects } from "@openauthjs/openauth";
import { z } from "zod";

// Define the subjects that will be included in the access token
export const subjects = createSubjects({
	user: z.object({
		userId: z.string(),
		email: z.string().email(),
		name: z.string().optional(),
		// Include household memberships for authorization
		householdMemberships: z.array(
			z.object({
				householdId: z.string(),
				role: z.enum(["OWNER", "CAREGIVER", "VETREADONLY"]),
			}),
		),
	}),
});

/**
 * Type representing a user subject with authentication and authorization data
 */
export type UserSubject = typeof subjects.user._type;
