/**
 * Audit log factory for test data generation
 */

import type { NewAuditLog } from "@/db/schema";
import { dates } from "./utils/dates";
import { person, random } from "./utils/random";

type JsonPrimitive = string | number | boolean | null;
interface JsonObject {
  [key: string]: JsonValue;
}
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];

// Define audit log types
type AuditAction =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "VIEW"
  | "LOGIN"
  | "LOGOUT"
  | "APPROVE"
  | "REJECT";
type ResourceType =
  | "user"
  | "animal"
  | "regimen"
  | "administration"
  | "inventory"
  | "household"
  | "medication"
  | "notification";

type AuditResourceValues = JsonObject;

interface AuditDetails extends JsonObject {
  action: AuditAction;
  resourceType: ResourceType;
  description?: string;
  fieldsChanged?: string[];
}

interface AuditData {
  resourceId: string | null;
  oldValues: AuditResourceValues | null;
  newValues: AuditResourceValues | null;
  details: AuditDetails;
}

// Audit log factory function
export function createAuditLog(
  overrides: Partial<NewAuditLog> = {},
): NewAuditLog {
  const action = random.arrayElement<AuditAction>([
    "CREATE",
    "UPDATE",
    "DELETE",
    "VIEW",
    "LOGIN",
    "LOGOUT",
    "APPROVE",
    "REJECT",
  ]);
  const resourceType = random.arrayElement<ResourceType>([
    "user",
    "animal",
    "regimen",
    "administration",
    "inventory",
    "household",
    "medication",
    "notification",
  ]);
  const auditData = generateAuditData(action, resourceType);

  return {
    id: random.uuid(),
    userId: random.uuid(), // Should be overridden with actual user ID
    householdId: random.uuid(), // Should be overridden with actual household ID
    action,
    resourceType,
    resourceId: auditData.resourceId,
    oldValues: auditData.oldValues,
    newValues: auditData.newValues,
    details: auditData.details,
    ipAddress: generateIpAddress(),
    userAgent: generateUserAgent(),
    sessionId: `session_${random.alphaNumeric(32)}`,
    timestamp: dates.dateRecent(random.int(1, 30)).toISOString(),
    ...overrides,
  };
}

// Helper functions for audit-specific data
function generateAuditData(
  action: AuditAction,
  resourceType: ResourceType,
): AuditData {
  const resourceId = ["VIEW", "LOGIN", "LOGOUT"].includes(action)
    ? null
    : random.uuid();

  let oldValues = null;
  let newValues = null;
  const details: AuditDetails = { action, resourceType };

  switch (action) {
    case "CREATE":
      newValues = generateResourceValues(resourceType, "create");
      details.description = `Created new ${resourceType}`;
      break;

    case "UPDATE":
      oldValues = generateResourceValues(resourceType, "old");
      newValues = generateResourceValues(resourceType, "new");
      details.description = `Updated ${resourceType} properties`;
      details.fieldsChanged = getChangedFields(oldValues, newValues);
      break;

    case "DELETE":
      oldValues = generateResourceValues(resourceType, "delete");
      details.description = `Deleted ${resourceType}`;
      details.permanent = random.boolean(0.2); // 20% are permanent deletes
      break;

    case "VIEW":
      details.description = `Viewed ${resourceType} details`;
      details.viewType = random.arrayElement([
        "list",
        "detail",
        "report",
        "export",
      ]);
      break;

    case "LOGIN":
      details.description = "User logged in";
      details.loginMethod = random.arrayElement(["email", "social", "sso"]);
      details.success = random.boolean(0.95);
      break;

    case "LOGOUT":
      details.description = "User logged out";
      details.sessionDuration = random.int(300, 7200); // 5 minutes to 2 hours
      break;

    case "APPROVE":
      details.description = `Approved ${resourceType}`;
      details.approvalType = random.arrayElement([
        "co-sign",
        "administration",
        "schedule",
      ]);
      break;

    case "REJECT":
      details.description = `Rejected ${resourceType}`;
      details.rejectionReason = generateRejectionReason();
      break;
  }

  return { resourceId, oldValues, newValues, details };
}

function generateResourceValues(
  resourceType: ResourceType,
  context: "create" | "old" | "new" | "delete",
): AuditResourceValues {
  const base = getBaseResourceValues(resourceType);

  if (context === "new" || context === "old") {
    return applyContextModifications(base, resourceType, context);
  }

  return base;
}

/**
 * Get base values for different resource types
 */
function getBaseResourceValues(
  resourceType: ResourceType,
): AuditResourceValues {
  const baseValues: Record<ResourceType, AuditResourceValues> = {
    animal: createAnimalValues(),
    regimen: createRegimenValues(),
    administration: createAdministrationValues(),
    inventory: createInventoryValues(),
    user: createUserValues(),
    household: createHouseholdValues(),
    medication: createMedicationValues(),
    notification: createNotificationValues(),
  };

  return baseValues[resourceType];
}

/**
 * Create animal resource values
 */
function createAnimalValues(): AuditResourceValues {
  return {
    name: random.arrayElement(["Buddy", "Max", "Bella", "Charlie", "Luna"]),
    species: "dog",
    breed: "Golden Retriever",
    weight: 30.5,
  };
}

/**
 * Create regimen resource values
 */
function createRegimenValues(): AuditResourceValues {
  return {
    name: "Antibiotic course",
    dose: "250 mg",
    frequency: "BID",
    active: true,
  };
}

/**
 * Create administration resource values
 */
function createAdministrationValues(): AuditResourceValues {
  return {
    dose: "250 mg",
    status: "ON_TIME",
    notes: "Given with food",
  };
}

/**
 * Create inventory resource values
 */
function createInventoryValues(): AuditResourceValues {
  return {
    quantityRemaining: 25,
    inUse: true,
    expiresOn: "2024-12-31",
  };
}

/**
 * Create user resource values
 */
function createUserValues(): AuditResourceValues {
  return {
    name: person.fullName(),
    email: person.email(),
    role: "CAREGIVER",
  };
}

/**
 * Create household resource values
 */
function createHouseholdValues(): AuditResourceValues {
  return {
    name: "Test Household",
    timezone: "America/New_York",
  };
}

/**
 * Create medication resource values
 */
function createMedicationValues(): AuditResourceValues {
  return {
    genericName: "Amoxicillin",
    dosage: "10-20 mg/kg",
    route: "ORAL",
  };
}

/**
 * Create notification resource values
 */
function createNotificationValues(): AuditResourceValues {
  return {
    title: "Medication Due",
    priority: "medium",
    read: false,
  };
}

/**
 * Apply context-specific modifications to base values
 */
function applyContextModifications(
  base: AuditResourceValues,
  resourceType: ResourceType,
  context: "old" | "new",
): AuditResourceValues {
  const modified: AuditResourceValues = { ...base };

  if (context === "new") {
    applyNewValueModifications(modified, resourceType);
  }

  return modified;
}

/**
 * Apply modifications for 'new' context values
 */
function applyNewValueModifications(
  modified: AuditResourceValues,
  resourceType: ResourceType,
): void {
  if (resourceType === "animal" && typeof modified.weight === "number") {
    modified.weight = modified.weight + random.float(-2, 2, 1);
  }
  if (resourceType === "regimen" && typeof modified.dose === "string") {
    modified.dose = random.arrayElement(["250 mg", "500 mg", "125 mg"]);
  }
  if (
    resourceType === "inventory" &&
    typeof modified.quantityRemaining === "number"
  ) {
    modified.quantityRemaining = Math.max(
      0,
      modified.quantityRemaining - random.int(1, 5),
    );
  }
}

function getChangedFields(
  oldValues: AuditResourceValues | null,
  newValues: AuditResourceValues | null,
): string[] {
  if (!oldValues || !newValues) return [];

  const changed: string[] = [];

  for (const key in newValues) {
    if (oldValues[key] !== newValues[key]) {
      changed.push(key);
    }
  }

  return changed;
}

function generateRejectionReason(): string {
  const reasons = [
    "Incorrect dosage amount",
    "Wrong medication selected",
    "Administration time conflicts",
    "Missing required co-signature",
    "Pet safety concerns",
    "Incorrect animal selected",
    "Inventory item expired",
    "Insufficient permissions",
  ];

  return random.arrayElement(reasons);
}

function generateIpAddress(): string {
  return `${random.int(1, 255)}.${random.int(0, 255)}.${random.int(0, 255)}.${random.int(1, 254)}`;
}

function generateUserAgent(): string {
  const browsers = [
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Android 14; Mobile; rv:109.0) Gecko/109.0 Firefox/118.0",
  ];

  return random.arrayElement(browsers);
}

// Audit log builder class for complex scenarios
export class AuditLogBuilder {
  private auditLog: Partial<NewAuditLog> = {};

  static create(): AuditLogBuilder {
    return new AuditLogBuilder();
  }

  byUser(userId: string): AuditLogBuilder {
    this.auditLog.userId = userId;
    return this;
  }

  inHousehold(householdId: string): AuditLogBuilder {
    this.auditLog.householdId = householdId;
    return this;
  }

  withAction(action: AuditAction): AuditLogBuilder {
    this.auditLog.action = action;
    return this;
  }

  onResource(resourceType: ResourceType, resourceId?: string): AuditLogBuilder {
    this.auditLog.resourceType = resourceType;
    this.auditLog.resourceId = resourceId || random.uuid();
    return this;
  }

  withOldValues(values: AuditResourceValues): AuditLogBuilder {
    this.auditLog.oldValues = values;
    return this;
  }

  withNewValues(values: AuditResourceValues): AuditLogBuilder {
    this.auditLog.newValues = values;
    return this;
  }

  withDetails(details: AuditDetails): AuditLogBuilder {
    this.auditLog.details = details;
    return this;
  }

  fromIp(ipAddress: string): AuditLogBuilder {
    this.auditLog.ipAddress = ipAddress;
    return this;
  }

  withUserAgent(userAgent: string): AuditLogBuilder {
    this.auditLog.userAgent = userAgent;
    return this;
  }

  inSession(sessionId: string): AuditLogBuilder {
    this.auditLog.sessionId = sessionId;
    return this;
  }

  occurredAt(timestamp: Date): AuditLogBuilder {
    this.auditLog.timestamp = timestamp.toISOString();
    return this;
  }

  occurredHoursAgo(hours: number): AuditLogBuilder {
    this.auditLog.timestamp = dates.hoursFromNow(-hours).toISOString();
    return this;
  }

  build(): NewAuditLog {
    return createAuditLog(this.auditLog);
  }
}

// Preset audit log types for common scenarios
export const auditPresets = {
  userLogin: (
    userId: string,
    householdId: string,
    success = true,
  ): NewAuditLog =>
    AuditLogBuilder.create()
      .byUser(userId)
      .inHousehold(householdId)
      .withAction("LOGIN")
      .onResource("user", userId)
      .withDetails({
        description: "User logged in",
        loginMethod: "email",
        success,
        ...(success ? {} : { error: "Invalid credentials" }),
      })
      .fromIp("192.168.1.100")
      .occurredHoursAgo(1)
      .build(),

  animalCreated: (
    userId: string,
    householdId: string,
    animalId: string,
    animalName: string,
  ): NewAuditLog =>
    AuditLogBuilder.create()
      .byUser(userId)
      .inHousehold(householdId)
      .withAction("CREATE")
      .onResource("animal", animalId)
      .withNewValues({
        name: animalName,
        species: "dog",
        breed: "Golden Retriever",
        householdId,
      })
      .withDetails({
        description: "Created new animal profile",
        animalName,
      })
      .occurredHoursAgo(24)
      .build(),

  medicationAdministered: (
    userId: string,
    householdId: string,
    administrationId: string,
    medicationName: string,
  ): NewAuditLog =>
    AuditLogBuilder.create()
      .byUser(userId)
      .inHousehold(householdId)
      .withAction("CREATE")
      .onResource("administration", administrationId)
      .withNewValues({
        dose: "250 mg",
        status: "ON_TIME",
        notes: "Given with breakfast",
      })
      .withDetails({
        description: "Recorded medication administration",
        medicationName,
        administeredBy: userId,
      })
      .occurredHoursAgo(2)
      .build(),

  regimenUpdated: (
    userId: string,
    householdId: string,
    regimenId: string,
  ): NewAuditLog =>
    AuditLogBuilder.create()
      .byUser(userId)
      .inHousehold(householdId)
      .withAction("UPDATE")
      .onResource("regimen", regimenId)
      .withOldValues({
        dose: "250 mg",
        frequency: "BID",
        active: true,
      })
      .withNewValues({
        dose: "500 mg",
        frequency: "BID",
        active: true,
      })
      .withDetails({
        description: "Updated regimen dose",
        fieldsChanged: ["dose"],
        reason: "Veterinarian adjustment",
      })
      .occurredHoursAgo(6)
      .build(),

  inventoryDeleted: (
    userId: string,
    householdId: string,
    inventoryId: string,
  ): NewAuditLog =>
    AuditLogBuilder.create()
      .byUser(userId)
      .inHousehold(householdId)
      .withAction("DELETE")
      .onResource("inventory", inventoryId)
      .withOldValues({
        medicationName: "Expired Amoxicillin",
        quantityRemaining: 10,
        expiresOn: "2023-01-01",
      })
      .withDetails({
        description: "Deleted expired inventory item",
        reason: "Past expiration date",
        permanent: true,
      })
      .occurredHoursAgo(12)
      .build(),

  coSignatureApproval: (
    userId: string,
    householdId: string,
    administrationId: string,
  ): NewAuditLog =>
    AuditLogBuilder.create()
      .byUser(userId)
      .inHousehold(householdId)
      .withAction("APPROVE")
      .onResource("administration", administrationId)
      .withDetails({
        description: "Approved high-risk medication administration",
        approvalType: "co-sign",
        administrationId,
        notes: "Verified dose and timing",
      })
      .occurredHoursAgo(1)
      .build(),

  dataExport: (userId: string, householdId: string): NewAuditLog =>
    AuditLogBuilder.create()
      .byUser(userId)
      .inHousehold(householdId)
      .withAction("VIEW")
      .onResource("administration")
      .withDetails({
        description: "Exported administration data",
        viewType: "export",
        dateRange: "2023-01-01 to 2023-12-31",
        format: "CSV",
      })
      .occurredHoursAgo(3)
      .build(),

  failedLogin: (userId: string, householdId: string): NewAuditLog =>
    AuditLogBuilder.create()
      .byUser(userId)
      .inHousehold(householdId)
      .withAction("LOGIN")
      .onResource("user", userId)
      .withDetails({
        description: "Failed login attempt",
        loginMethod: "email",
        success: false,
        error: "Invalid credentials",
        attemptCount: random.int(1, 3),
      })
      .fromIp("203.0.113.42") // Suspicious IP
      .occurredHoursAgo(4)
      .build(),

  bulkUpdate: (
    userId: string,
    householdId: string,
    resourceCount: number,
  ): NewAuditLog =>
    AuditLogBuilder.create()
      .byUser(userId)
      .inHousehold(householdId)
      .withAction("UPDATE")
      .onResource("regimen")
      .withDetails({
        description: "Bulk updated multiple regimens",
        affectedCount: resourceCount,
        operation: "pause_all",
        reason: "Vacation hold",
      })
      .occurredHoursAgo(8)
      .build(),
};
