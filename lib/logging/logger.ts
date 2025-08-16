import { headers } from "next/headers";
import { v4 as uuidv4 } from "uuid";

/**
 * Log levels with numeric values for filtering
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

/**
 * Base log entry structure
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  correlationId: string;
  requestId?: string;
  userId?: string;
  householdId?: string;
  sessionId?: string;
  service: string;
  operation?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  error?: ErrorContext;
  performance?: PerformanceMetrics;
  tags?: string[];
  stack?: string;

  [key: string]: unknown;
}

/**
 * Error context information
 */
export interface ErrorContext {
  name: string;
  message: string;
  stack?: string;
  code?: string;
  cause?: unknown;
  statusCode?: number;
  endpoint?: string;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  duration: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  dbQueries?: number;
  dbTime?: number;
}

/**
 * Logging context for request/operation tracking
 */
export interface LoggingContext {
  correlationId: string;
  requestId?: string;
  userId?: string;
  householdId?: string;
  sessionId?: string;
  operation?: string;
  startTime?: number;
  metadata?: Record<string, unknown>;
  tags?: string[];
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  service: string;
  minLevel: LogLevel;
  enableConsole: boolean;
  enableStructured: boolean;
  maskSensitiveData: boolean;
  sensitiveFields: string[];
  enablePerformanceTracking: boolean;
  maxMessageLength?: number;
  maxMetadataSize?: number;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: LoggerConfig = {
  service: "vet-med-tracker",
  minLevel:
    process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG,
  enableConsole: true,
  enableStructured: true,
  maskSensitiveData: true,
  sensitiveFields: [
    "password",
    "token",
    "auth",
    "authorization",
    "cookie",
    "secret",
    "key",
    "apiKey",
    "api_key",
    "accessToken",
    "access_token",
    "refreshToken",
    "refresh_token",
    "sessionToken",
    "session_token",
    "email",
    "phone",
    "phoneNumber",
    "ssn",
    "creditCard",
    "credit_card",
  ],
  enablePerformanceTracking: true,
  maxMessageLength: 1000,
  maxMetadataSize: 10000,
};

/**
 * Request context storage for serverless environments
 */
class RequestContextStore {
  private contexts = new Map<string, LoggingContext>();

  set(correlationId: string, context: LoggingContext): void {
    this.contexts.set(correlationId, context);
  }

  get(correlationId: string): LoggingContext | undefined {
    return this.contexts.get(correlationId);
  }

  delete(correlationId: string): void {
    this.contexts.delete(correlationId);
  }

  clear(): void {
    this.contexts.clear();
  }
}

const contextStore = new RequestContextStore();

/**
 * Utility functions for data masking
 */
class DataMasker {
  private sensitiveFields: Set<string>;

  constructor(sensitiveFields: string[]) {
    this.sensitiveFields = new Set(
      sensitiveFields.map((field) => field.toLowerCase()),
    );
  }

  /**
   * Mask sensitive data in objects recursively
   */
  maskObject(obj: unknown): unknown {
    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === "string") {
      return this.maskString(obj);
    }

    if (typeof obj === "object") {
      if (Array.isArray(obj)) {
        return obj.map((item) => this.maskObject(item));
      }

      const masked: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        if (this.isSensitiveField(key)) {
          masked[key] = this.maskValue(value);
        } else {
          masked[key] = this.maskObject(value);
        }
      }
      return masked;
    }

    return obj;
  }

  private isSensitiveField(fieldName: string): boolean {
    const lowercaseField = fieldName.toLowerCase();
    return (
      this.sensitiveFields.has(lowercaseField) ||
      [...this.sensitiveFields].some(
        (sensitive) =>
          lowercaseField.includes(sensitive) ||
          sensitive.includes(lowercaseField),
      )
    );
  }

  private maskString(str: string): string {
    // Mask potential JWT tokens
    if (str.match(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*$/)) {
      return `${str.substring(0, 8)}...${str.substring(str.length - 8)}`;
    }

    // Mask emails
    if (str.includes("@")) {
      const parts = str.split("@");
      if (parts.length === 2 && parts[0] && parts[1]) {
        const [local, domain] = parts;
        return `${local.substring(0, 2)}***@${domain}`;
      }
    }

    // Mask long strings (potential secrets)
    if (str.length > 20) {
      return `${str.substring(0, 4)}...${str.substring(str.length - 4)}`;
    }

    return "***";
  }

  private maskValue(value: unknown): string {
    if (typeof value === "string") {
      return this.maskString(value);
    }
    return "***";
  }
}

/**
 * Performance tracker for operations
 */
class PerformanceTracker {
  private startTime: number;
  private startMemory?: NodeJS.MemoryUsage;
  private startCpu?: NodeJS.CpuUsage;

  constructor() {
    this.startTime = Date.now();
    if (typeof process !== "undefined") {
      this.startMemory = process.memoryUsage();
      this.startCpu = process.cpuUsage();
    }
  }

  getMetrics(): PerformanceMetrics {
    const duration = Date.now() - this.startTime;
    const metrics: PerformanceMetrics = { duration };

    if (typeof process !== "undefined") {
      if (this.startMemory) {
        metrics.memoryUsage = process.memoryUsage();
      }
      if (this.startCpu) {
        metrics.cpuUsage = process.cpuUsage(this.startCpu);
      }
    }

    return metrics;
  }
}

/**
 * Main Logger class
 */
export class Logger {
  private config: LoggerConfig;
  private dataMasker: DataMasker;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.dataMasker = new DataMasker(this.config.sensitiveFields);
  }

  /**
   * Generate a new correlation ID
   */
  static generateCorrelationId(): string {
    return `req_${uuidv4()}`;
  }

  /**
   * Extract correlation ID from Next.js headers
   */
  static async extractCorrelationId(): Promise<string> {
    try {
      const headersList = await headers();
      return (
        headersList.get("x-correlation-id") ||
        headersList.get("x-request-id") ||
        headersList.get("x-trace-id") ||
        Logger.generateCorrelationId()
      );
    } catch {
      // Fallback when headers() fails (e.g., in non-request contexts)
      return Logger.generateCorrelationId();
    }
  }

  /**
   * Create a new logging context
   */
  async createContext(
    operation?: string,
    metadata?: Record<string, unknown>,
  ): Promise<LoggingContext> {
    const correlationId = await Logger.extractCorrelationId();

    let requestId: string | undefined;
    let userId: string | undefined;
    let sessionId: string | undefined;

    try {
      const headersList = await headers();
      requestId = headersList.get("x-request-id") || undefined;
      userId = headersList.get("x-user-id") || undefined;
      sessionId = headersList.get("x-session-id") || undefined;
    } catch {
      // Headers not available in this context
    }

    const context: LoggingContext = {
      correlationId,
      requestId,
      userId,
      sessionId,
      operation,
      startTime: Date.now(),
      metadata,
      tags: [],
    };

    contextStore.set(correlationId, context);
    return context;
  }

  /**
   * Get existing context or create a new one
   */
  async getOrCreateContext(correlationId?: string): Promise<LoggingContext> {
    if (correlationId) {
      const existing = contextStore.get(correlationId);
      if (existing) return existing;
    }

    return this.createContext();
  }

  /**
   * Update context with additional information
   */
  updateContext(correlationId: string, updates: Partial<LoggingContext>): void {
    const existing = contextStore.get(correlationId);
    if (existing) {
      const updated = { ...existing, ...updates };
      contextStore.set(correlationId, updated);
    }
  }

  /**
   * Clean up context (important for serverless)
   */
  cleanupContext(correlationId: string): void {
    contextStore.delete(correlationId);
  }

  /**
   * Debug level logging
   */
  async debug(
    message: string,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ): Promise<void> {
    const context = await this.getOrCreateContext(correlationId);
    const entry = this.createLogEntry(
      LogLevel.DEBUG,
      message,
      context,
      metadata,
    );
    this.writeLog(entry);
  }

  /**
   * Info level logging
   */
  async info(
    message: string,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ): Promise<void> {
    const context = await this.getOrCreateContext(correlationId);
    const entry = this.createLogEntry(
      LogLevel.INFO,
      message,
      context,
      metadata,
    );
    this.writeLog(entry);
  }

  /**
   * Warning level logging
   */
  async warn(
    message: string,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ): Promise<void> {
    const context = await this.getOrCreateContext(correlationId);
    const entry = this.createLogEntry(
      LogLevel.WARN,
      message,
      context,
      metadata,
    );
    this.writeLog(entry);
  }

  /**
   * Error level logging
   */
  async error(
    message: string,
    error?: Error | ErrorContext,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ): Promise<void> {
    const context = await this.getOrCreateContext(correlationId);
    const entry = this.createLogEntry(
      LogLevel.ERROR,
      message,
      context,
      metadata,
      error,
    );
    this.writeLog(entry);
  }

  /**
   * Fatal level logging
   */
  async fatal(
    message: string,
    error?: Error | ErrorContext,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ): Promise<void> {
    const context = await this.getOrCreateContext(correlationId);
    const entry = this.createLogEntry(
      LogLevel.FATAL,
      message,
      context,
      metadata,
      error,
    );
    this.writeLog(entry);
  }

  /**
   * Log with performance metrics
   */
  async withPerformance(
    level: LogLevel,
    message: string,
    performance: PerformanceMetrics,
    metadata?: Record<string, unknown>,
    correlationId?: string,
  ): Promise<void> {
    const context = await this.getOrCreateContext(correlationId);
    const entry = this.createLogEntry(
      level,
      message,
      context,
      metadata,
      undefined,
      performance,
    );
    this.writeLog(entry);
  }

  /**
   * Create a performance tracker for an operation
   */
  startPerformanceTracking(): PerformanceTracker {
    if (!this.config.enablePerformanceTracking) {
      return {
        getMetrics: () => ({ duration: 0 }),
      } as PerformanceTracker;
    }

    return new PerformanceTracker();
  }

  /**
   * Log operation with automatic performance tracking
   */
  async trackOperation<T>(
    operation: string,
    fn: (context: LoggingContext) => Promise<T>,
    correlationId?: string,
  ): Promise<T> {
    const context = await this.getOrCreateContext(correlationId);
    context.operation = operation;

    const tracker = this.startPerformanceTracking();
    const _startTime = Date.now();

    try {
      await this.info(
        `Starting operation: ${operation}`,
        undefined,
        context.correlationId,
      );

      const result = await fn(context);

      const metrics = tracker.getMetrics();
      await this.withPerformance(
        LogLevel.INFO,
        `Completed operation: ${operation}`,
        metrics,
        { success: true },
        context.correlationId,
      );

      return result;
    } catch (error) {
      const metrics = tracker.getMetrics();
      await this.error(
        `Failed operation: ${operation}`,
        error instanceof Error ? error : new Error(String(error)),
        { duration: metrics.duration },
        context.correlationId,
      );
      throw error;
    } finally {
      this.cleanupContext(context.correlationId);
    }
  }

  /**
   * Create a base log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    context: LoggingContext,
    metadata?: Record<string, unknown>,
    error?: Error | ErrorContext,
    performance?: PerformanceMetrics,
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message: this.truncateMessage(message),
      correlationId: context.correlationId,
      requestId: context.requestId,
      userId: context.userId,
      householdId: context.householdId,
      sessionId: context.sessionId,
      service: this.config.service,
      operation: context.operation,
      tags: context.tags,
    };

    // Add duration if available
    if (context.startTime) {
      entry.duration = Date.now() - context.startTime;
    }

    // Add custom duration if provided
    if (performance?.duration !== undefined) {
      entry.duration = performance.duration;
    }

    // Merge metadata
    if (metadata || context.metadata) {
      entry.metadata = this.config.maskSensitiveData
        ? (this.dataMasker.maskObject({
            ...context.metadata,
            ...metadata,
          }) as Record<string, unknown>)
        : { ...context.metadata, ...metadata };

      entry.metadata = this.truncateMetadata(entry.metadata);
    }

    // Add error context
    if (error) {
      entry.error = this.formatError(error);
    }

    // Add performance metrics
    if (performance) {
      entry.performance = performance;
    }

    return entry;
  }

  /**
   * Format error for logging
   */
  private formatError(error: Error | ErrorContext): ErrorContext {
    if ("name" in error && "message" in error) {
      // It's an Error object
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...((error as Error & { code?: string }).code && {
          code: (error as Error & { code?: string }).code,
        }),
        ...((error as Error & { statusCode?: number }).statusCode && {
          statusCode: (error as Error & { statusCode?: number }).statusCode,
        }),
      };
    }

    // It's already an ErrorContext
    return error;
  }

  /**
   * Truncate message to max length
   */
  private truncateMessage(message: string): string {
    if (!this.config.maxMessageLength) return message;

    if (message.length <= this.config.maxMessageLength) {
      return message;
    }

    return `${message.substring(0, this.config.maxMessageLength - 3)}...`;
  }

  /**
   * Truncate metadata to max size
   */
  private truncateMetadata(
    metadata: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!this.config.maxMetadataSize) return metadata;

    const serialized = JSON.stringify(metadata);
    if (serialized.length <= this.config.maxMetadataSize) {
      return metadata;
    }

    return {
      ...metadata,
      _truncated: true,
      _originalSize: serialized.length,
    };
  }

  /**
   * Write log entry to outputs
   */
  private writeLog(entry: LogEntry): void {
    if (entry.level < this.config.minLevel) {
      return;
    }

    if (this.config.enableStructured) {
      // Structured JSON logging for production
      console.log(JSON.stringify(entry));
    } else if (this.config.enableConsole) {
      // Human-readable console logging for development
      const levelName = LogLevel[entry.level];
      const timestamp = new Date(entry.timestamp).toISOString();
      const prefix = `[${timestamp}] ${levelName} [${entry.correlationId}]`;

      if (entry.error) {
        console.error(`${prefix} ${entry.message}`, entry.error);
      } else {
        console.log(`${prefix} ${entry.message}`, entry.metadata || "");
      }
    }
  }
}

// Export singleton instance
export const logger = new Logger();
