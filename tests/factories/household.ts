/**
 * Household factory for test data generation
 */

import type { NewHousehold, NewMembership } from "@/db/schema";
import { dates } from "./utils/dates";
import { location, random } from "./utils/random";

// Household factory function
export function createHousehold(
  overrides: Partial<NewHousehold> = {},
): NewHousehold {
  const householdTypes = [
    "Family",
    "Single Owner",
    "Couple",
    "Roommates",
    "Extended Family",
    "Pet Rescue",
    "Foster Home",
    "Veterinary Clinic",
    "Animal Shelter",
  ];

  const familyNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Brown",
    "Jones",
    "Garcia",
    "Miller",
    "Davis",
    "Rodriguez",
    "Martinez",
    "Hernandez",
    "Lopez",
    "Gonzalez",
  ];

  const householdName =
    overrides.name ||
    `${random.arrayElement(familyNames)} ${random.arrayElement(householdTypes)}`;

  return {
    id: random.uuid(),
    name: householdName,
    timezone: location.timezone(),
    createdAt: dates.datePast(365).toISOString(),
    updatedAt: dates.dateRecent(30).toISOString(),
    ...overrides,
  };
}

// Membership factory function
export function createMembership(
  overrides: Partial<NewMembership> = {},
): NewMembership {
  return {
    id: random.uuid(),
    userId: random.uuid(), // Should be overridden with actual user ID
    householdId: random.uuid(), // Should be overridden with actual household ID
    role: random.weightedArrayElement([
      { weight: 40, value: "OWNER" },
      { weight: 50, value: "CAREGIVER" },
      { weight: 10, value: "VETREADONLY" },
    ]),
    createdAt: dates.datePast(180).toISOString(),
    updatedAt: dates.dateRecent(30).toISOString(),
    ...overrides,
  };
}

// Household builder class for complex scenarios
export class HouseholdBuilder {
  private household: Partial<NewHousehold> = {};
  private members: Array<{
    userId: string;
    role: "OWNER" | "CAREGIVER" | "VETREADONLY";
  }> = [];

  static create(): HouseholdBuilder {
    return new HouseholdBuilder();
  }

  withName(name: string): HouseholdBuilder {
    this.household.name = name;
    return this;
  }

  withTimezone(timezone: string): HouseholdBuilder {
    this.household.timezone = timezone;
    return this;
  }

  createdDaysAgo(days: number): HouseholdBuilder {
    this.household.createdAt = dates.daysFromNow(-days).toISOString();
    this.household.updatedAt = dates
      .dateRecent(Math.min(days, 7))
      .toISOString();
    return this;
  }

  withOwner(userId: string): HouseholdBuilder {
    this.members.push({ userId, role: "OWNER" });
    return this;
  }

  withCaregiver(userId: string): HouseholdBuilder {
    this.members.push({ userId, role: "CAREGIVER" });
    return this;
  }

  withVetReadOnly(userId: string): HouseholdBuilder {
    this.members.push({ userId, role: "VETREADONLY" });
    return this;
  }

  build(): { household: NewHousehold; memberships: NewMembership[] } {
    const household = createHousehold(this.household);
    const memberships = this.members.map((member) =>
      createMembership({
        userId: member.userId,
        householdId: household.id!,
        role: member.role,
      }),
    );

    return { household, memberships };
  }
}

// Preset household types for common scenarios
export const householdPresets = {
  singleOwner: (
    userId: string,
  ): { household: NewHousehold; memberships: NewMembership[] } =>
    HouseholdBuilder.create()
      .withName(`${random.arrayElement(["Pet", "Animal", "Furry"])} Family`)
      .withOwner(userId)
      .createdDaysAgo(30)
      .build(),

  familyHousehold: (
    ownerUserId: string,
    caregiverUserId?: string,
  ): { household: NewHousehold; memberships: NewMembership[] } => {
    const builder = HouseholdBuilder.create()
      .withName(
        `${random.arrayElement(["Miller", "Johnson", "Smith", "Brown"])} Family`,
      )
      .withOwner(ownerUserId)
      .createdDaysAgo(90);

    if (caregiverUserId) {
      builder.withCaregiver(caregiverUserId);
    }

    return builder.build();
  },

  vetClinic: (
    vetUserId: string,
    assistantUserId?: string,
  ): { household: NewHousehold; memberships: NewMembership[] } => {
    const builder = HouseholdBuilder.create()
      .withName(
        `${random.arrayElement(["City", "Downtown", "Riverside", "Sunshine"])} Animal Hospital`,
      )
      .withOwner(vetUserId)
      .withTimezone("America/New_York")
      .createdDaysAgo(365);

    if (assistantUserId) {
      builder.withCaregiver(assistantUserId);
    }

    return builder.build();
  },

  petRescue: (
    adminUserId: string,
    ...volunteerUserIds: string[]
  ): { household: NewHousehold; memberships: NewMembership[] } => {
    const builder = HouseholdBuilder.create()
      .withName(
        `${random.arrayElement(["Happy Tails", "Second Chance", "Loving Paws", "Forever Home"])} Rescue`,
      )
      .withOwner(adminUserId)
      .createdDaysAgo(730);

    volunteerUserIds.forEach((userId) => {
      builder.withCaregiver(userId);
    });

    return builder.build();
  },

  multiUserHousehold: (
    ownerUserId: string,
    caregiverUserIds: string[] = [],
    vetUserId?: string,
  ): { household: NewHousehold; memberships: NewMembership[] } => {
    const builder = HouseholdBuilder.create()
      .withName(`Multi-Pet Household`)
      .withOwner(ownerUserId)
      .createdDaysAgo(180);

    caregiverUserIds.forEach((userId) => {
      builder.withCaregiver(userId);
    });

    if (vetUserId) {
      builder.withVetReadOnly(vetUserId);
    }

    return builder.build();
  },
};

// Utility functions for household management
export const householdUtils = {
  // Generate realistic household configurations
  generateHouseholdConfig: (type: "small" | "medium" | "large" = "medium") => {
    const configs = {
      small: { owners: 1, caregivers: 0, vets: 0, animals: 1 },
      medium: {
        owners: 1,
        caregivers: random.int(1, 2),
        vets: 0,
        animals: random.int(2, 4),
      },
      large: {
        owners: 1,
        caregivers: random.int(2, 4),
        vets: 1,
        animals: random.int(5, 8),
      },
    };

    return configs[type];
  },

  // Generate household names based on type
  generateHouseholdName: (
    type: "family" | "clinic" | "rescue" | "shelter" = "family",
  ) => {
    const templates = {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: These are intentional template placeholders replaced by .replace() method
      family: ["${surname} Family", "${surname} Household", "The ${surname}s"],
      clinic: [
        // biome-ignore lint/suspicious/noTemplateCurlyInString: Template placeholders replaced by .replace() method
        "${name} Animal Hospital",
        // biome-ignore lint/suspicious/noTemplateCurlyInString: Template placeholders replaced by .replace() method
        "${name} Veterinary Clinic",
        // biome-ignore lint/suspicious/noTemplateCurlyInString: Template placeholders replaced by .replace() method
        "${name} Pet Care Center",
      ],
      rescue: [
        // biome-ignore lint/suspicious/noTemplateCurlyInString: Template placeholders replaced by .replace() method
        "${name} Animal Rescue",
        // biome-ignore lint/suspicious/noTemplateCurlyInString: Template placeholders replaced by .replace() method
        "${name} Pet Rescue",
        // biome-ignore lint/suspicious/noTemplateCurlyInString: Template placeholders replaced by .replace() method
        "${name} Second Chances",
      ],
      shelter: [
        // biome-ignore lint/suspicious/noTemplateCurlyInString: Template placeholders replaced by .replace() method
        "${name} Animal Shelter",
        // biome-ignore lint/suspicious/noTemplateCurlyInString: Template placeholders replaced by .replace() method
        "${name} Humane Society",
        // biome-ignore lint/suspicious/noTemplateCurlyInString: Template placeholders replaced by .replace() method
        "${name} SPCA",
      ],
    };

    const names = {
      surname: ["Smith", "Johnson", "Williams", "Brown", "Jones"],
      name: [
        "Happy Tails",
        "Caring Paws",
        "Second Chance",
        "Forever Home",
        "Loving Hearts",
      ],
    };

    const template = random.arrayElement(templates[type]);
    const nameType = template.includes("surname") ? "surname" : "name";
    const selectedName = random.arrayElement(names[nameType]);

    return template.replace(`\${${nameType}}`, selectedName);
  },
};
