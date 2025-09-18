import { type NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "./stack/server";

/**
 * Security-hardened middleware for VetMed Tracker
 *
 * This middleware handles:
 * 1. Security headers (CSP, HSTS, XSS protection, etc.)
 * 2. Authentication via Stack Auth
 * 3. Basic request routing protection
 */

// Security headers configuration
const securityHeaders = {
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
  // Referrer policy
  "Referrer-Policy": "strict-origin-when-cross-origin",
  // Content type protection
  "X-Content-Type-Options": "nosniff",
  // Frame protection
  "X-Frame-Options": "DENY",
  // XSS Protection (legacy browsers)
  "X-XSS-Protection": "1; mode=block",
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

function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

export default async function middleware(req: NextRequest) {
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
