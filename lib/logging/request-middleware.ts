import { NextRequest, type NextResponse } from "next/server";
import { Logger, type LoggingContext, LogLevel, logger } from "./logger";

/**
 * Request logging configuration
 */
export interface RequestLoggingConfig {
  logRequests: boolean;
  logResponses: boolean;
  logHeaders: boolean;
  logUserAgent: boolean;
  excludePaths?: string[];
  excludeStaticAssets?: boolean;
  maxBodySize?: number;
  sensitiveHeaders?: string[];
}

/**
 * Default request logging configuration
 */
const DEFAULT_REQUEST_CONFIG: RequestLoggingConfig = {
  logRequests: true,
  logResponses: true,
  logHeaders: false, // Can contain sensitive data
  logUserAgent: true,
  excludePaths: [
    "/_next/static",
    "/_next/image",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
    "/api/health",
    "/sw.js",
  ],
  excludeStaticAssets: true,
  maxBodySize: 1000,
  sensitiveHeaders: [
    "authorization",
    "cookie",
    "set-cookie",
    "x-api-key",
    "x-auth-token",
    "x-session-token",
  ],
};

/**
 * Request logging utilities
 */
class RequestLogHelper {
  private config: RequestLoggingConfig;

  constructor(config: RequestLoggingConfig) {
    this.config = config;
  }

  /**
   * Check if request should be excluded from logging
   */
  shouldExcludeRequest(request: NextRequest): boolean {
    const { pathname } = request.nextUrl;

    // Exclude static assets
    if (this.config.excludeStaticAssets) {
      const staticExtensions = [
        ".css",
        ".js",
        ".map",
        ".ico",
        ".png",
        ".jpg",
        ".jpeg",
        ".gif",
        ".svg",
        ".woff",
        ".woff2",
        ".ttf",
        ".eot",
        ".webp",
        ".avif",
      ];

      if (staticExtensions.some((ext) => pathname.endsWith(ext))) {
        return true;
      }
    }

    // Exclude specific paths
    return (
      this.config.excludePaths?.some((excludePath) =>
        pathname.startsWith(excludePath),
      ) ?? false
    );
  }

  /**
   * Sanitize headers for logging
   */
  sanitizeHeaders(headers: Headers): Record<string, string> {
    const sanitized: Record<string, string> = {};

    headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();

      if (this.config.sensitiveHeaders?.includes(lowerKey)) {
        sanitized[key] = "***";
      } else {
        sanitized[key] = value;
      }
    });

    return sanitized;
  }

  /**
   * Get client IP address
   */
  getClientIP(request: NextRequest): string {
    // Check various headers for the real IP
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
      const ips = forwardedFor.split(",");
      if (ips.length > 0 && ips[0]) {
        return ips[0].trim();
      }
    }

    const realIP = request.headers.get("x-real-ip");
    if (realIP) {
      return realIP;
    }

    const cfConnectingIP = request.headers.get("cf-connecting-ip");
    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    return "unknown";
  }

  /**
   * Extract geolocation from Vercel headers
   */
  getGeolocation(request: NextRequest): Record<string, string> | undefined {
    const country = request.headers.get("x-vercel-ip-country");
    const region = request.headers.get("x-vercel-ip-country-region");
    const city = request.headers.get("x-vercel-ip-city");

    if (country || region || city) {
      return {
        ...(country && { country }),
        ...(region && { region }),
        ...(city && { city }),
      };
    }

    return undefined;
  }

  /**
   * Parse user agent information
   */
  parseUserAgent(userAgent: string): Record<string, unknown> {
    return {
      userAgent,
      // Add basic parsing - you could use a library like 'ua-parser-js' for more detail
      isMobile:
        /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent,
        ),
      isBot:
        /bot|crawl|spider|scraper|facebookexternalhit|twitterbot|linkedinbot|embedly/i.test(
          userAgent,
        ),
    };
  }

  /**
   * Truncate request body for logging
   */
  async truncateBody(request: NextRequest): Promise<string | undefined> {
    try {
      if (!request.body || !this.config.maxBodySize) {
        return undefined;
      }

      const clone = request.clone();
      const text = await clone.text();

      if (text.length === 0) {
        return undefined;
      }

      if (text.length <= this.config.maxBodySize) {
        return text;
      }

      return `${text.substring(0, this.config.maxBodySize - 20)}...[truncated]`;
    } catch {
      return "[body read error]";
    }
  }
}

/**
 * Request logging middleware for Next.js
 */
export function createRequestLoggingMiddleware(
  config: Partial<RequestLoggingConfig> = {},
) {
  const finalConfig = { ...DEFAULT_REQUEST_CONFIG, ...config };
  const logHelper = new RequestLogHelper(finalConfig);

  // Helper function to build request metadata
  async function buildRequestMetadata(
    request: NextRequest,
  ): Promise<Record<string, unknown>> {
    const requestMetadata: Record<string, unknown> = {
      method: request.method,
      url: request.url,
      pathname: request.nextUrl.pathname,
      search: request.nextUrl.search,
      ip: logHelper.getClientIP(request),
    };

    // Add geolocation if available
    const geo = logHelper.getGeolocation(request);
    if (geo) {
      requestMetadata.geo = geo;
    }

    // Add user agent info
    if (finalConfig.logUserAgent) {
      const userAgent = request.headers.get("user-agent");
      if (userAgent) {
        requestMetadata.userAgent = logHelper.parseUserAgent(userAgent);
      }
    }

    // Add headers if configured
    if (finalConfig.logHeaders) {
      requestMetadata.headers = logHelper.sanitizeHeaders(request.headers);
    }

    // Add body for POST/PUT/PATCH requests
    if (["POST", "PUT", "PATCH"].includes(request.method)) {
      requestMetadata.body = await logHelper.truncateBody(request);
    }

    return requestMetadata;
  }

  // Helper function to build response metadata
  function buildResponseMetadata(
    request: NextRequest,
    response: NextResponse,
    performance: { duration: number; memoryUsage?: NodeJS.MemoryUsage },
  ): Record<string, unknown> {
    const responseMetadata: Record<string, unknown> = {
      status: response.status,
      statusText: response.statusText,
      duration: performance.duration,
      method: request.method,
      pathname: request.nextUrl.pathname,
    };

    // Add response headers if configured
    if (finalConfig.logHeaders) {
      responseMetadata.headers = logHelper.sanitizeHeaders(response.headers);
    }

    // Add performance metrics
    if (performance.memoryUsage) {
      responseMetadata.memory = {
        used: Math.round(performance.memoryUsage.heapUsed / 1024 / 1024), // MB
        total: Math.round(performance.memoryUsage.heapTotal / 1024 / 1024), // MB
      };
    }

    return responseMetadata;
  }

  // Helper function to log response
  async function logResponse(
    request: NextRequest,
    response: NextResponse,
    performance: { duration: number; memoryUsage?: NodeJS.MemoryUsage },
    correlationId: string,
  ): Promise<void> {
    const responseMetadata = buildResponseMetadata(
      request,
      response,
      performance,
    );

    const level = response.status >= 400 ? LogLevel.WARN : LogLevel.INFO;
    const message =
      response.status >= 400
        ? `Request completed with error: ${response.status} ${response.statusText}`
        : `Request completed successfully: ${response.status}`;

    await logger.withPerformance(
      level,
      message,
      performance,
      responseMetadata,
      correlationId,
    );
  }

  return async function requestLoggingMiddleware(
    request: NextRequest,
    next: (request?: NextRequest) => Promise<NextResponse>,
  ): Promise<NextResponse> {
    // Skip excluded requests
    if (logHelper.shouldExcludeRequest(request)) {
      return next(request);
    }

    // Generate or extract correlation ID
    const existingCorrelationId = request.headers.get("x-correlation-id");
    const correlationId =
      existingCorrelationId || Logger.generateCorrelationId();

    // Create logging context
    const _loggingContext = await logger.createContext("http.request", {
      url: request.url,
      method: request.method,
      path: request.nextUrl.pathname,
      correlationId,
    });

    // Start performance tracking
    const tracker = logger.startPerformanceTracking();

    try {
      // Log incoming request
      if (finalConfig.logRequests) {
        const requestMetadata = await buildRequestMetadata(request);
        await logger.info(
          `Incoming ${request.method} request: ${request.nextUrl.pathname}`,
          requestMetadata,
          correlationId,
        );
      }

      // Add correlation ID to request headers for downstream services
      const modifiedHeaders = new Headers(request.headers);
      if (!existingCorrelationId) {
        modifiedHeaders.set("x-correlation-id", correlationId);
      }

      // Create modified request with correlation ID
      const modifiedRequest = new NextRequest(request, {
        headers: modifiedHeaders,
      });

      // Execute the request
      const response = await next(modifiedRequest);

      // Get performance metrics
      const performance = tracker.getMetrics();

      // Log successful response
      if (finalConfig.logResponses) {
        await logResponse(request, response, performance, correlationId);
      }

      // Add correlation ID to response headers
      response.headers.set("x-correlation-id", correlationId);

      return response;
    } catch (error) {
      // Get performance metrics for failed request
      const performance = tracker.getMetrics();

      // Log error
      await logger.error(
        `Request failed: ${request.method} ${request.nextUrl.pathname}`,
        error instanceof Error ? error : new Error(String(error)),
        {
          method: request.method,
          url: request.url,
          pathname: request.nextUrl.pathname,
          duration: performance.duration,
          ip: logHelper.getClientIP(request),
        },
        correlationId,
      );

      // Re-throw the error
      throw error;
    } finally {
      // Clean up context
      logger.cleanupContext(correlationId);
    }
  };
}

/**
 * Default request logging middleware instance
 */
export const requestLoggingMiddleware = createRequestLoggingMiddleware();

/**
 * Utility to extract logging context from Next.js request
 */
export async function getRequestLoggingContext(
  request: NextRequest,
  operation?: string,
): Promise<LoggingContext> {
  const correlationId =
    request.headers.get("x-correlation-id") || Logger.generateCorrelationId();

  const context = await logger.createContext(operation || "http.request", {
    url: request.url,
    method: request.method,
    path: request.nextUrl.pathname,
    correlationId,
  });

  return context;
}

/**
 * Helper to log API route operations
 */
export async function logAPIRoute<T>(
  request: NextRequest,
  operation: string,
  fn: (context: LoggingContext) => Promise<T>,
): Promise<T> {
  const loggingContext = await getRequestLoggingContext(
    request,
    `api.${operation}`,
  );

  return logger.trackOperation(
    `api.${operation}`,
    fn,
    loggingContext.correlationId,
  );
}
