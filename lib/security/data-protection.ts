import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scrypt,
} from "node:crypto";
import { promisify } from "node:util";
import { auditHelpers } from "@/lib/security/audit-logger";

/**
 * Advanced data protection for VetMed Tracker medical data
 *
 * Features:
 * - AES-256-GCM encryption for medical data
 * - Key derivation from master key
 * - Field-level encryption for PII/PHI
 * - Secure data masking for logs
 * - HIPAA-compliant data handling
 */

const asyncScrypt = promisify(scrypt);

// Encryption configuration
const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

// Master key from environment (should be 256-bit base64 string)
const MASTER_KEY = process.env.VETMED_ENCRYPTION_KEY;

if (!MASTER_KEY && process.env.NODE_ENV === "production") {
  throw new Error("VETMED_ENCRYPTION_KEY is required in production");
}

/**
 * Derive encryption key from master key and salt
 */
async function deriveKey(salt: Buffer): Promise<Buffer> {
  if (!MASTER_KEY) {
    // Development fallback - DO NOT USE IN PRODUCTION
    console.warn("⚠️  Using development encryption key - NOT SECURE");
    return Buffer.from("dev-key-32-chars-for-testing!!!");
  }

  const masterKeyBuffer = Buffer.from(MASTER_KEY, "base64");
  return (await asyncScrypt(masterKeyBuffer, salt, KEY_LENGTH)) as Buffer;
}

/**
 * Encrypt sensitive data field
 */
export async function encryptField(plaintext: string): Promise<string> {
  try {
    if (!plaintext) return plaintext;

    // Generate random salt and IV
    const salt = randomBytes(SALT_LENGTH);
    const iv = randomBytes(IV_LENGTH);

    // Derive key from master key and salt
    const key = await deriveKey(salt);

    // Create cipher
    const cipher = createCipheriv(ALGORITHM, key, iv);

    // Encrypt the data
    let encrypted = cipher.update(plaintext, "utf8", "hex");
    encrypted += cipher.final("hex");

    // Get the authentication tag
    const tag = cipher.getAuthTag();

    // Combine salt + iv + tag + encrypted data
    const combined = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, "hex"),
    ]);

    return combined.toString("base64");
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypt sensitive data field
 */
export async function decryptField(encryptedData: string): Promise<string> {
  try {
    if (!encryptedData) return encryptedData;

    // Decode from base64
    const combined = Buffer.from(encryptedData, "base64");

    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const tag = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      SALT_LENGTH + IV_LENGTH + TAG_LENGTH,
    );
    const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

    // Derive key from master key and salt
    const key = await deriveKey(salt);

    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    // Decrypt the data
    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Medical data fields that require encryption
 */
export const ENCRYPTED_FIELDS = {
  CONDITION_DESCRIPTION: "conditionDescription",
  DOSAGE_INSTRUCTIONS: "dosageInstructions",
  EMERGENCY_CONTACT: "emergencyContact",

  // User PII
  EMERGENCY_CONTACT_NAME: "emergencyContactName",
  EMERGENCY_CONTACT_PHONE: "emergencyContactPhone",
  // Animal medical data
  MEDICAL_NOTES: "medicalNotes",

  // Medication data
  PRESCRIPTION_NOTES: "prescriptionNotes",
  SIDE_EFFECTS: "sideEffects",
  VETERINARIAN_INFO: "veterinarianInfo",
  VETERINARIAN_NOTES: "veterinarianNotes",
} as const;

/**
 * Encrypt medical data object
 */
export async function encryptMedicalData<T extends Record<string, unknown>>(
  data: T,
  fieldsToEncrypt: string[] = Object.values(ENCRYPTED_FIELDS),
  userId?: string,
): Promise<T> {
  const encrypted = { ...data };

  for (const field of fieldsToEncrypt) {
    const value = encrypted[field];
    if (typeof value === "string" && value.length > 0) {
      try {
        const encryptedValue = await encryptField(value);
        Reflect.set(encrypted, field, encryptedValue);
      } catch (error) {
        // Log encryption failure for audit
        await auditHelpers.logThreat(
          "encryption_failure",
          "high",
          undefined,
          userId,
          {
            error: error instanceof Error ? error.message : "Unknown error",
            field: field,
          },
        );
        throw error;
      }
    }
  }

  return encrypted;
}

/**
 * Decrypt medical data object
 */
export async function decryptMedicalData<T extends Record<string, unknown>>(
  data: T,
  fieldsToDecrypt: string[] = Object.values(ENCRYPTED_FIELDS),
  userId?: string,
): Promise<T> {
  const decrypted = { ...data };

  for (const field of fieldsToDecrypt) {
    const value = decrypted[field];
    if (typeof value === "string" && value.length > 0) {
      try {
        const decryptedValue = await decryptField(value);
        Reflect.set(decrypted, field, decryptedValue);
      } catch (error) {
        // Log decryption failure for audit
        await auditHelpers.logThreat(
          "decryption_failure",
          "high",
          undefined,
          userId,
          {
            error: error instanceof Error ? error.message : "Unknown error",
            field: field,
          },
        );
        throw error;
      }
    }
  }

  return decrypted;
}

const MASKING_CONFIG = {
  FULL: [
    "email",
    "phone",
    "emergencyContact",
    "emergencyContactName",
    "emergencyContactPhone",
    "veterinarianInfo",
    "medicalNotes",
    "veterinarianNotes",
    "prescriptionNotes",
    "password",
    "token",
    "stackUserId",
    "sessionId",
  ],
  PARTIAL: ["name", "firstName", "lastName", "id"],
};

const partialMask = (value: string): string => {
  if (value.length > 4) {
    return `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
  }
  return "***";
};

function maskObject(data: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {};
  for (const key in data) {
    if (Object.hasOwn(data, key)) {
      const lowerKey = key.toLowerCase();
      if (MASKING_CONFIG.FULL.includes(lowerKey)) {
        masked[key] = "***MASKED***";
      } else if (
        MASKING_CONFIG.PARTIAL.includes(lowerKey) &&
        typeof data[key] === "string"
      ) {
        masked[key] = partialMask(String(data[key]));
      } else {
        masked[key] = maskSensitiveData(data[key]);
      }
    }
  }
  return masked;
}

/**
 * Data masking for logs and error messages
 */
export function maskSensitiveData(data: unknown): unknown {
  if (typeof data === "string") {
    // Mask email addresses
    const maskedEmail = data.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      "***@***.***",
    );

    // Mask phone numbers
    const maskedPhone = maskedEmail.replace(
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      "***-***-****",
    );

    // Mask potential medical IDs
    return maskedPhone.replace(/\b[A-Z]{2,5}\d{4,10}\b/g, "***MASKED***");
  }

  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }

  if (data && typeof data === "object" && !Array.isArray(data)) {
    return maskObject(data as Record<string, unknown>);
  }

  return data;
}

/**
 * Secure logging wrapper that masks sensitive data
 */
export function secureLog(
  level: "info" | "warn" | "error",
  message: string,
  data?: unknown,
) {
  const maskedData = data ? maskSensitiveData(data) : undefined;

  const logEntry = {
    data: maskedData,
    level,
    message,
    timestamp: new Date().toISOString(),
  };

  console[level](JSON.stringify(logEntry));
}

/**
 * Session security enhancements
 */
export class SessionSecurity {
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly IDLE_TIMEOUT = 2 * 60 * 60 * 1000; // 2 hours

  /**
   * Generate secure session token
   */
  static generateSessionToken(): string {
    return randomBytes(32).toString("base64url");
  }

  /**
   * Validate session expiration
   */
  static isSessionExpired(createdAt: Date, lastActive: Date): boolean {
    const now = Date.now();
    const sessionAge = now - createdAt.getTime();
    const idleTime = now - lastActive.getTime();

    return (
      sessionAge > SessionSecurity.SESSION_TIMEOUT ||
      idleTime > SessionSecurity.IDLE_TIMEOUT
    );
  }

  /**
   * Force session rotation for security
   */
  static shouldRotateSession(lastRotation: Date): boolean {
    const timeSinceRotation = Date.now() - lastRotation.getTime();
    return timeSinceRotation > 60 * 60 * 1000; // 1 hour
  }

  /**
   * Check for suspicious session activity
   */
  static async validateSessionSecurity(
    userId: string,
    currentIp: string,
    userAgent: string,
    lastKnownIp?: string,
    lastKnownUserAgent?: string,
  ): Promise<{ suspicious: boolean; reason?: string }> {
    // Check for IP change
    if (lastKnownIp && lastKnownIp !== currentIp) {
      await auditHelpers.logThreat(
        "session_ip_change",
        "medium",
        currentIp,
        userId,
        {
          currentIp,
          previousIp: lastKnownIp,
        },
      );

      return {
        reason: "IP address change detected",
        suspicious: true,
      };
    }

    // Check for user agent change (more flexible)
    if (lastKnownUserAgent && lastKnownUserAgent !== userAgent) {
      const similarity = SessionSecurity.calculateUserAgentSimilarity(
        lastKnownUserAgent,
        userAgent,
      );

      if (similarity < 0.7) {
        // Less than 70% similar
        await auditHelpers.logThreat(
          "session_user_agent_change",
          "low",
          currentIp,
          userId,
          {
            currentUserAgent: userAgent.substring(0, 100),
            previousUserAgent: lastKnownUserAgent.substring(0, 100),
            similarity,
          },
        );

        return {
          reason: "Device/browser change detected",
          suspicious: true,
        };
      }
    }

    return { suspicious: false };
  }

  /**
   * Calculate user agent similarity (simple implementation)
   */
  private static calculateUserAgentSimilarity(
    ua1: string,
    ua2: string,
  ): number {
    const tokens1 = ua1.toLowerCase().split(/[\s/()]+/);
    const tokens2 = ua2.toLowerCase().split(/[\s/()]+/);

    const intersection = tokens1.filter((token) => tokens2.includes(token));
    const union = [...new Set([...tokens1, ...tokens2])];

    return intersection.length / union.length;
  }
}

/**
 * CORS security configuration
 */
export const CORS_CONFIG = {
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-household-id",
    "x-session-id",
    "x-trpc-source",
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  origin:
    process.env.NODE_ENV === "production"
      ? [
          "https://vetmed-tracker.vercel.app",
          "https://vetmed.example.com", // Replace with actual production domain
        ]
      : [
          "http://localhost:3000",
          "http://127.0.0.1:3000",
          "http://192.168.1.2:3000",
          "http://propc-manjaro:3000",
          "http://propc:3000",
          "http://100.79.27.53:3000",
        ],
};

/**
 * Content Security Policy configuration
 */
export function generateCSP(nonce?: string): string {
  const policies = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval'${nonce ? ` 'nonce-${nonce}'` : ""} https://js.stripe.com https://js.pusher.com https://va.vercel-scripts.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.stripe.com wss://ws.pusher.com wss://ws-*.pusher.com https://*.stack-auth.com https://vitals.vercel-insights.com",
    "frame-src https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ];

  return policies.join("; ");
}

/**
 * Generate security nonce for inline scripts
 */
export function generateSecurityNonce(): string {
  return randomBytes(16).toString("base64");
}
