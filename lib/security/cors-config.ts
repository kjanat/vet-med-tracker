import { type NextRequest, NextResponse } from "next/server";

/**
 * CORS Configuration for VetMed Tracker
 *
 * Implements secure CORS policies for production medical application
 * - Environment-specific origin allowlists
 * - Credential handling for authentication
 * - Preflight request handling
 * - Security header enforcement
 */

// Environment-specific allowed origins
const ALLOWED_ORIGINS = {
  development: [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.1.2:3000",
    "http://propc-manjaro:3000",
    "http://propc:3000",
    "http://100.79.27.53:3000",
    "http://propc-manjaro.taildd9ae2.ts.net:3000",
  ],
  production: [
    "https://vetmed-tracker.vercel.app",
    "https://vetmed.example.com", // Replace with actual production domain
    // Add any additional production domains
  ],
  test: ["http://localhost:3000", "http://127.0.0.1:3000"],
};

// Allowed HTTP methods
const ALLOWED_METHODS = [
  "GET",
  "POST",
  "PUT",
  "DELETE",
  "PATCH",
  "OPTIONS",
  "HEAD",
];

// Allowed headers
const ALLOWED_HEADERS = [
  "Content-Type",
  "Authorization",
  "x-household-id",
  "x-session-id",
  "x-trpc-source",
  "x-requested-with",
  "accept",
  "accept-language",
  "content-language",
];

// Headers to expose to the client
const EXPOSED_HEADERS = [
  "x-rate-limit-remaining",
  "x-rate-limit-reset",
  "x-rate-limit-limit",
];

/**
 * Get allowed origins for current environment
 */
function getAllowedOrigins(): string[] {
  const env = process.env.NODE_ENV || "development";

  if (env === "production") {
    return ALLOWED_ORIGINS.production;
  } else if (env === "test") {
    return ALLOWED_ORIGINS.test;
  } else {
    return ALLOWED_ORIGINS.development;
  }
}

/**
 * Check if origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
}

/**
 * CORS middleware for API routes
 */
export function corsMiddleware(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  const origin = request.headers.get("origin");

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return handlePreflight(request, origin);
  }

  // Set CORS headers for actual requests
  if (origin && isOriginAllowed(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }

  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Expose-Headers",
    EXPOSED_HEADERS.join(", "),
  );

  // Add security headers
  response.headers.set("Vary", "Origin");

  return response;
}

/**
 * Handle CORS preflight requests
 */
function handlePreflight(
  _request: NextRequest,
  origin: string | null,
): NextResponse {
  const response = new NextResponse(null, { status: 200 });

  // Check origin
  if (origin && isOriginAllowed(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  } else {
    return new NextResponse(null, { status: 403 });
  }

  // Set preflight headers
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set(
    "Access-Control-Allow-Methods",
    ALLOWED_METHODS.join(", "),
  );
  response.headers.set(
    "Access-Control-Allow-Headers",
    ALLOWED_HEADERS.join(", "),
  );
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours

  // Security headers
  response.headers.set(
    "Vary",
    "Origin, Access-Control-Request-Method, Access-Control-Request-Headers",
  );

  return response;
}

/**
 * CORS configuration object for external libraries
 */
export const CORS_CONFIG = {
  allowedHeaders: ALLOWED_HEADERS,
  credentials: true,
  exposedHeaders: EXPOSED_HEADERS,
  maxAge: 86400, // 24 hours
  methods: ALLOWED_METHODS,
  optionsSuccessStatus: 200,
  origin: (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean) => void,
  ) => {
    if (!origin || isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  preflightContinue: false,
};

/**
 * Enhanced CORS headers for tRPC responses
 */
export function setTRPCCorsHeaders(
  response: NextResponse,
  origin: string | null,
): void {
  if (origin && isOriginAllowed(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Expose-Headers",
      EXPOSED_HEADERS.join(", "),
    );
    response.headers.set("Vary", "Origin");
  }
}

/**
 * Validate request origin for sensitive operations
 */
export function validateOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // For sensitive operations, require both origin and referer
  if (!origin && !referer) {
    return false;
  }

  // Check origin
  if (origin && !isOriginAllowed(origin)) {
    return false;
  }

  // Check referer (if present)
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
      if (!isOriginAllowed(refererOrigin)) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

/**
 * Create CORS-compliant response
 */
export function createCorsResponse(
  data: unknown,
  status: number = 200,
  origin: string | null = null,
): NextResponse {
  const response = NextResponse.json(data, { status });

  if (origin && isOriginAllowed(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Expose-Headers",
      EXPOSED_HEADERS.join(", "),
    );
    response.headers.set("Vary", "Origin");
  }

  return response;
}
