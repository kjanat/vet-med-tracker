import { type NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "./stack";

/**
 * Security-hardened middleware for VetMed Tracker
 *
 * This middleware handles:
 * 1. Security headers (CSP, HSTS, XSS protection, etc.)
 * 2. Authentication via Stack Auth
 * 3. Basic request routing protection
 * 4. Rate limiting for public endpoints (in-memory fallback)
 *
 * Note: Redis-based rate limiting is handled in the auth handler
 * This in-memory rate limiting serves as a fallback
 */

// Security headers configuration
const securityHeaders = {
  // Frame protection
  "X-Frame-Options": "DENY",
  // Content type protection
  "X-Content-Type-Options": "nosniff",
  // XSS Protection (legacy browsers)
  "X-XSS-Protection": "1; mode=block",
  // Referrer policy
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Content Security Policy
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://js.pusher.com https://va.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    // Note: CSP doesn't support wildcard subdomains like ws-*, using specific regions
    "connect-src 'self' https://api.stripe.com wss://ws.pusher.com wss://ws-us2.pusher.com wss://ws-us3.pusher.com wss://ws-eu.pusher.com wss://ws-ap1.pusher.com wss://ws-ap2.pusher.com https://*.stack-auth.com https://vitals.vercel-insights.com",
    "frame-src https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; "),
  // HSTS (only in production)
  ...(process.env.NODE_ENV === "production"
    ? {
        "Strict-Transport-Security":
          "max-age=31536000; includeSubDomains; preload",
      }
    : {}),
  // Permissions policy
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  // Remove server information
  Server: "",
  "X-Powered-By": "",
};

// Rate limiting store (simple in-memory implementation)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Rate limiting configuration for different endpoints
const rateLimits = {
  default: { maxRequests: 100, windowMs: 60000 }, // 100 requests per minute
  auth: { maxRequests: 5, windowMs: 900000 }, // 5 auth attempts per 15 minutes
  api: { maxRequests: 300, windowMs: 60000 }, // 300 API calls per minute
  public: { maxRequests: 50, windowMs: 60000 }, // 50 public requests per minute
};

function getRateLimitKey(req: NextRequest): string {
  // Use forwarded IP, fallback to connection IP, then to 'unknown'
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  return forwarded?.split(",")[0]?.trim() || realIp || req.ip || "unknown";
}

function checkRateLimit(
  ip: string,
  limit: { maxRequests: number; windowMs: number },
): boolean {
  const now = Date.now();
  const key = ip;
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    // Reset window
    rateLimitStore.set(key, { count: 1, resetTime: now + limit.windowMs });
    return true;
  }

  if (entry.count >= limit.maxRequests) {
    return false; // Rate limit exceeded
  }

  entry.count++;
  return true;
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export default async function middleware(req: NextRequest) {
  // Apply rate limiting and security headers to all requests
  const clientIp = getRateLimitKey(req);

  // Determine rate limit type based on path
  let rateLimit = rateLimits.default;
  if (req.nextUrl.pathname.startsWith("/handler/")) {
    rateLimit = rateLimits.auth;
  } else if (
    req.nextUrl.pathname.startsWith("/api") ||
    req.nextUrl.pathname.startsWith("/trpc")
  ) {
    rateLimit = rateLimits.api;
  } else if (!req.nextUrl.pathname.startsWith("/authed")) {
    rateLimit = rateLimits.public;
  }

  // Skip rate limiting for health checks, static files, and auth handlers
  // Auth handlers have their own Redis-based rate limiting
  const skipRateLimit =
    req.nextUrl.pathname === "/api/health" ||
    req.nextUrl.pathname === "/api/breaker-status" ||
    req.nextUrl.pathname.startsWith("/_next") ||
    req.nextUrl.pathname.includes(".") ||
    req.nextUrl.pathname.startsWith("/handler/"); // Skip for auth - handled by Redis

  // Apply rate limiting
  if (!skipRateLimit && !checkRateLimit(clientIp, rateLimit)) {
    const response = NextResponse.json(
      {
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
      },
      { status: 429 },
    );
    response.headers.set(
      "Retry-After",
      Math.ceil(rateLimit.windowMs / 1000).toString(),
    );
    return addSecurityHeaders(response);
  }

  // Allow health checks, monitoring endpoints, and static files without further processing
  if (skipRateLimit) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Allow Stack Auth handler routes
  if (req.nextUrl.pathname.startsWith("/handler/")) {
    return addSecurityHeaders(NextResponse.next());
  }

  // For API routes, just continue - connection safeguards are handled in tRPC
  if (
    req.nextUrl.pathname.startsWith("/api") ||
    req.nextUrl.pathname.startsWith("/trpc")
  ) {
    return addSecurityHeaders(NextResponse.next());
  }

  // Check authentication for protected routes
  if (
    req.nextUrl.pathname.startsWith("/authed") ||
    req.nextUrl.pathname.startsWith("/admin") ||
    req.nextUrl.pathname.startsWith("/manage")
  ) {
    const user = await stackServerApp.getUser();

    if (!user) {
      // Redirect to sign-in page
      const signInUrl = new URL("/handler/sign-in", req.url);
      signInUrl.searchParams.set("redirect", req.nextUrl.pathname);
      const response = NextResponse.redirect(signInUrl);
      return addSecurityHeaders(response);
    }
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
