import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auditHelpers } from "@/lib/security/audit-logger";
import { sanitizeFileName } from "@/lib/security/input-sanitization";
import { stackServerApp } from "@/stack";

// Upload configuration
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_FILES_PER_REQUEST = 1;
const ALLOWED_FILE_TYPES = [
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
];

// Magic number signatures for file type validation
const FILE_SIGNATURES = {
	"image/jpeg": [0xff, 0xd8, 0xff],
	"image/jpg": [0xff, 0xd8, 0xff],
	"image/png": [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
	"image/webp": [0x52, 0x49, 0x46, 0x46], // "RIFF"
} as const;

// Response schemas
const _uploadErrorSchema = z.object({
	error: z.string(),
	code: z.string().optional(),
});

const _uploadSuccessSchema = z.object({
	url: z.string(),
	fileName: z.string(),
	size: z.number(),
	contentType: z.string(),
});

type UploadError = z.infer<typeof _uploadErrorSchema>;
type UploadSuccess = z.infer<typeof _uploadSuccessSchema>;

/**
 * Helper to create error response
 */
function createErrorResponse(
	error: string,
	status: number,
	code?: string,
): NextResponse<UploadError> {
	return NextResponse.json({ error, code }, { status });
}

/**
 * Helper to create success response
 */
function createSuccessResponse(
	data: UploadSuccess,
): NextResponse<UploadSuccess> {
	return NextResponse.json(data, { status: 200 });
}

/**
 * Validate file by magic numbers (file signature)
 */
async function validateFileSignature(file: File): Promise<boolean> {
	const buffer = await file.arrayBuffer();
	const bytes = new Uint8Array(buffer);

	const signature = FILE_SIGNATURES[file.type as keyof typeof FILE_SIGNATURES];
	if (!signature) return false;

	// Check if file starts with expected magic numbers
	for (let i = 0; i < signature.length; i++) {
		if (bytes[i] !== signature[i]) {
			return false;
		}
	}

	return true;
}

/**
 * Enhanced file validation with security checks
 */
async function validateFile(
	file: File,
): Promise<{ isValid: boolean; error?: string }> {
	// Check file size
	if (file.size === 0) {
		return {
			isValid: false,
			error: "File is empty",
		};
	}

	if (file.size > MAX_FILE_SIZE) {
		return {
			isValid: false,
			error: `File size (${Math.round((file.size / 1024 / 1024) * 100) / 100}MB) exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
		};
	}

	// Check file type against whitelist
	if (!ALLOWED_FILE_TYPES.includes(file.type)) {
		return {
			isValid: false,
			error: `File type ${file.type} is not supported. Allowed types: ${ALLOWED_FILE_TYPES.join(", ")}`,
		};
	}

	// Validate filename for security
	const sanitizedName = sanitizeFileName(file.name);
	if (sanitizedName !== file.name || sanitizedName.length === 0) {
		return {
			isValid: false,
			error:
				"Invalid filename. Please use only letters, numbers, dots, hyphens, and underscores.",
		};
	}

	// Validate file signature (magic numbers)
	const hasValidSignature = await validateFileSignature(file);
	if (!hasValidSignature) {
		return {
			isValid: false,
			error: "File content does not match the declared file type",
		};
	}

	// Check for suspicious file names
	const suspiciousPatterns = [
		/\.php$/i,
		/\.asp$/i,
		/\.jsp$/i,
		/\.js$/i,
		/\.exe$/i,
		/\.bat$/i,
		/\.cmd$/i,
		/\.scr$/i,
		/\.com$/i,
		/\.pif$/i,
		/\.vbs$/i,
		/\.jar$/i,
		/\.sh$/i,
	];

	if (suspiciousPatterns.some((pattern) => pattern.test(file.name))) {
		return {
			isValid: false,
			error: "File type not allowed for security reasons",
		};
	}

	return { isValid: true };
}

/**
 * Generate a secure, unique filename
 */
function generateFileName(originalName: string, userId: string): string {
	const timestamp = Date.now();
	const randomString = crypto.randomUUID().replace(/-/g, "").substring(0, 12);
	const sanitizedOriginal = sanitizeFileName(originalName);
	const fileExtension =
		sanitizedOriginal.split(".").pop()?.toLowerCase() || "jpg";

	// Ensure the extension is in our allowed list
	const allowedExtensions = ["jpeg", "jpg", "png", "webp"];
	const safeExtension = allowedExtensions.includes(fileExtension)
		? fileExtension
		: "jpg";

	return `animals/${userId.replace(/[^a-zA-Z0-9]/g, "")}/${timestamp}_${randomString}.${safeExtension}`;
}

/**
 * Mock file storage - In production, this would save to cloud storage (S3, Cloudinary, etc.)
 * For now, we'll return a mock URL structure
 */
async function storeFile(
	_file: File,
	fileName: string,
): Promise<{ url: string }> {
	// TODO: Implement actual file storage
	// This would typically upload to:
	// - AWS S3
	// - Cloudinary
	// - Vercel Blob
	// - Google Cloud Storage
	// etc.

	// For now, return a mock URL
	const mockBaseUrl =
		process.env.NEXT_PUBLIC_UPLOAD_URL || "https://storage.example.com";
	return {
		url: `${mockBaseUrl}/${fileName}`,
	};
}

/**
 * POST /api/upload
 * Secure upload endpoint for animal photos
 */
export async function POST(request: NextRequest) {
	const clientIp =
		request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

	try {
		// Check authentication
		const user = await stackServerApp.getUser();
		if (!user) {
			await auditHelpers.logThreat(
				"unauthorized_upload_attempt",
				"medium",
				clientIp,
				undefined,
				{ endpoint: "/api/upload" },
			);

			return createErrorResponse(
				"Authentication required",
				401,
				"UNAUTHORIZED",
			);
		}

		// Parse multipart form data with size limit
		let formData: FormData;
		try {
			formData = await request.formData();
		} catch (error) {
			await auditHelpers.logThreat(
				"malformed_upload_request",
				"medium",
				clientIp,
				user.id,
				{ error: error instanceof Error ? error.message : String(error) },
			);

			return createErrorResponse("Invalid form data", 400, "INVALID_REQUEST");
		}

		const file = formData.get("file") as File | null;

		if (!file) {
			return createErrorResponse("No file provided", 400, "NO_FILE");
		}

		// Check for multiple files (security measure)
		const allFiles = formData.getAll("file");
		if (allFiles.length > MAX_FILES_PER_REQUEST) {
			await auditHelpers.logThreat(
				"multiple_file_upload_attempt",
				"high",
				clientIp,
				user.id,
				{ fileCount: allFiles.length, maxAllowed: MAX_FILES_PER_REQUEST },
			);

			return createErrorResponse(
				`Maximum ${MAX_FILES_PER_REQUEST} file(s) allowed per request`,
				400,
				"TOO_MANY_FILES",
			);
		}

		// Validate file with enhanced security checks
		const validation = await validateFile(file);
		if (!validation.isValid) {
			await auditHelpers.logValidationFailure(
				file.name,
				"file_upload_validation",
				clientIp,
				user.id,
			);

			return createErrorResponse(validation.error!, 400, "INVALID_FILE");
		}

		// Generate unique filename
		const fileName = generateFileName(file.name, user.id);

		// Store the file
		const { url } = await storeFile(file, fileName);

		// Log successful upload
		await auditHelpers.logDataAccess(
			"file_uploaded",
			user.id,
			"animal_photo",
			true,
			{
				fileName: file.name,
				fileSize: file.size,
				contentType: file.type,
				storedAs: fileName,
			},
		);

		// Return success response
		return createSuccessResponse({
			url,
			fileName,
			size: file.size,
			contentType: file.type,
		});
	} catch (error) {
		console.error("Upload error:", error);

		// Log error for security monitoring
		const user = await stackServerApp.getUser();
		await auditHelpers.logThreat("upload_error", "medium", clientIp, user?.id, {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});

		if (error instanceof Error) {
			return createErrorResponse(
				"Upload failed due to server error",
				500,
				"UPLOAD_ERROR",
			);
		}

		return createErrorResponse("Internal server error", 500, "INTERNAL_ERROR");
	}
}

/**
 * OPTIONS handler for CORS support (restrictive)
 */
export async function OPTIONS() {
	// In production, restrict to specific origins
	const allowedOrigins =
		process.env.NODE_ENV === "production"
			? [process.env.NEXT_PUBLIC_APP_URL || "https://vetmed-tracker.vercel.app"]
			: ["http://localhost:3000", "http://127.0.0.1:3000"];

	return new Response(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin":
				allowedOrigins[0] || "http://localhost:3000",
			"Access-Control-Allow-Methods": "POST, OPTIONS",
			"Access-Control-Allow-Headers":
				"Content-Type, Authorization, X-Requested-With",
			"Access-Control-Allow-Credentials": "true",
			"Access-Control-Max-Age": "3600", // 1 hour instead of 24
		},
	});
}
