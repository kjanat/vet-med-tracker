import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auditHelpers } from "@/lib/security/audit-logger";
import { stackServerApp } from "@/stack/server";

// Request validation schema
const emergencyDialRequestSchema = z.object({
  type: z.enum(["emergency_contact", "veterinarian"]),
  contactName: z.string().min(1),
  phoneNumber: z.string().min(1),
  timestamp: z.string().datetime(),
});

type EmergencyDialRequest = z.infer<typeof emergencyDialRequestSchema>;

/**
 * Helper to create error response
 */
function createErrorResponse(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/**
 * Helper to create success response
 */
function createSuccessResponse() {
  return NextResponse.json({ success: true }, { status: 200 });
}

/**
 * Helper for authentication check
 */
async function authenticateUser(clientIp: string) {
  const user = await stackServerApp.getUser();
  if (!user) {
    await auditHelpers.logThreat(
      "unauthorized_audit_attempt",
      "medium",
      clientIp,
      undefined,
      { endpoint: "/api/audit/emergency-dial" },
    );
    return null;
  }
  return user;
}

/**
 * Helper to validate and parse request body
 */
async function validateRequest(
  request: NextRequest,
  clientIp: string,
  userId: string,
): Promise<EmergencyDialRequest> {
  try {
    const body = await request.json();
    return emergencyDialRequestSchema.parse(body);
  } catch (error) {
    await auditHelpers.logThreat(
      "malformed_audit_request",
      "medium",
      clientIp,
      userId,
      {
        error: error instanceof Error ? error.message : String(error),
        endpoint: "/api/audit/emergency-dial",
      },
    );
    throw new Error("Invalid request format");
  }
}

/**
 * Helper to log emergency dial event
 */
async function logEmergencyDialEvent(
  data: EmergencyDialRequest,
  userId: string,
  clientIp: string,
) {
  const eventType =
    data.type === "veterinarian"
      ? "emergency_veterinarian_dial"
      : "emergency_contact_dial";

  await auditHelpers.logDataAccess(
    eventType,
    userId,
    "emergency_communication",
    data.contactName,
    {
      contactName: data.contactName,
      phoneNumber: data.phoneNumber.replace(
        /(\d{3})(\d{3})(\d{4})/,
        "($1) ***-$3",
      ), // Partially mask phone number
      contactType: data.type,
      timestamp: data.timestamp,
      clientIp,
      userAgent: undefined, // Let audit helper get this from request context
      purpose: "emergency_communication",
      severity: "high", // Mark as high importance for emergency events
    },
  );
}

/**
 * POST /api/audit/emergency-dial
 * Secure audit logging endpoint for emergency dial events
 */
export async function POST(request: NextRequest) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    // Check authentication
    const user = await authenticateUser(clientIp);
    if (!user) {
      return createErrorResponse("Authentication required", 401);
    }

    // Validate and parse request
    const data = await validateRequest(request, clientIp, user.id);

    // Log the emergency dial event
    await logEmergencyDialEvent(data, user.id, clientIp);

    // Return success response
    return createSuccessResponse();
  } catch (error) {
    console.error("Emergency dial audit logging error:", error);

    if (error instanceof Error && error.message === "Invalid request format") {
      return createErrorResponse("Invalid request format", 400);
    }

    // Log unexpected errors
    const user = await stackServerApp.getUser();
    await auditHelpers.logThreat(
      "audit_logging_error",
      "medium",
      clientIp,
      user?.id,
      {
        error: error instanceof Error ? error.message : String(error),
        endpoint: "/api/audit/emergency-dial",
      },
    );

    return createErrorResponse("Internal server error", 500);
  }
}

/**
 * OPTIONS handler for CORS support
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "3600",
    },
  });
}
