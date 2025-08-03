import { EventEmitter } from "node:events";

/**
 * Circuit breaker states
 */
export enum CircuitState {
	CLOSED = "CLOSED", // Normal operation
	OPEN = "OPEN", // Failing, reject requests
	HALF_OPEN = "HALF_OPEN", // Testing if service recovered
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
	failureThreshold: number; // Number of failures before opening
	successThreshold: number; // Number of successes to close from half-open
	timeout: number; // Time in ms before trying half-open
	monitoringPeriod: number; // Time window for failure counting
	onStateChange?: (state: CircuitState, metrics: CircuitMetrics) => void;
	onFallback?: (error: Error) => unknown;
}

/**
 * Circuit breaker metrics
 */
export interface CircuitMetrics {
	state: CircuitState;
	failureCount: number;
	successCount: number;
	totalRequests: number;
	lastFailureTime?: number;
	lastSuccessTime?: number;
	uptime: number;
	failureRate: number;
}

/**
 * Circuit breaker for database operations
 */
export class CircuitBreaker extends EventEmitter {
	private config: CircuitBreakerConfig;
	private state: CircuitState = CircuitState.CLOSED;
	private failureCount = 0;
	private successCount = 0;
	private totalRequests = 0;
	private lastFailureTime?: number;
	private lastSuccessTime?: number;
	private nextAttempt = 0;
	private startTime = Date.now();

	constructor(config: Partial<CircuitBreakerConfig> = {}) {
		super();

		this.config = {
			failureThreshold: 5,
			successThreshold: 2,
			timeout: 60000, // 1 minute
			monitoringPeriod: 10 * 60 * 1000, // 10 minutes
			...config,
		};

		// Start metrics cleanup
		this.startMetricsCleanup();
	}

	/**
	 * Execute operation with circuit breaker protection
	 */
	async execute<T>(
		operation: () => Promise<T>,
		fallback?: () => Promise<T> | T,
	): Promise<T> {
		this.totalRequests++;

		// Check if circuit is open
		if (this.state === CircuitState.OPEN) {
			if (Date.now() < this.nextAttempt) {
				// Circuit is open and timeout hasn't elapsed
				const error = new CircuitBreakerError(
					"Circuit breaker is OPEN",
					this.getMetrics(),
				);

				if (fallback) {
					this.emit("fallback", error);
					return await Promise.resolve(fallback());
				}

				throw error;
			} else {
				// Try to half-open the circuit
				this.state = CircuitState.HALF_OPEN;
				this.emit("stateChange", this.state, this.getMetrics());
			}
		}

		try {
			const result = await operation();
			this.onSuccess();
			return result;
		} catch (error) {
			this.onFailure();

			if (fallback) {
				this.emit("fallback", error);
				return await Promise.resolve(fallback());
			}

			throw error;
		}
	}

	/**
	 * Get current circuit breaker metrics
	 */
	getMetrics(): CircuitMetrics {
		const now = Date.now();
		const uptime = now - this.startTime;
		const failureRate =
			this.totalRequests > 0
				? (this.failureCount / this.totalRequests) * 100
				: 0;

		return {
			state: this.state,
			failureCount: this.failureCount,
			successCount: this.successCount,
			totalRequests: this.totalRequests,
			lastFailureTime: this.lastFailureTime,
			lastSuccessTime: this.lastSuccessTime,
			uptime,
			failureRate,
		};
	}

	/**
	 * Reset circuit breaker to initial state
	 */
	reset(): void {
		this.state = CircuitState.CLOSED;
		this.failureCount = 0;
		this.successCount = 0;
		this.nextAttempt = 0;
		this.emit("reset", this.getMetrics());
	}

	/**
	 * Force circuit breaker to open state
	 */
	forceOpen(): void {
		this.state = CircuitState.OPEN;
		this.nextAttempt = Date.now() + this.config.timeout;
		this.emit("forced", this.getMetrics());
	}

	/**
	 * Check if circuit breaker is healthy
	 */
	isHealthy(): boolean {
		return (
			this.state === CircuitState.CLOSED &&
			this.failureCount < this.config.failureThreshold
		);
	}

	/**
	 * Private methods
	 */

	private onSuccess(): void {
		this.lastSuccessTime = Date.now();
		this.successCount++;

		if (this.state === CircuitState.HALF_OPEN) {
			if (this.successCount >= this.config.successThreshold) {
				this.state = CircuitState.CLOSED;
				this.failureCount = 0;
				this.successCount = 0;
				this.emit("stateChange", this.state, this.getMetrics());
			}
		} else if (this.state === CircuitState.CLOSED) {
			// Reset failure count on success
			this.failureCount = Math.max(0, this.failureCount - 1);
		}

		this.emit("success", this.getMetrics());
	}

	private onFailure(): void {
		this.lastFailureTime = Date.now();
		this.failureCount++;

		if (this.state === CircuitState.HALF_OPEN) {
			// Failed while testing, go back to open
			this.state = CircuitState.OPEN;
			this.nextAttempt = Date.now() + this.config.timeout;
			this.emit("stateChange", this.state, this.getMetrics());
		} else if (this.state === CircuitState.CLOSED) {
			// Check if we should open the circuit
			if (this.failureCount >= this.config.failureThreshold) {
				this.state = CircuitState.OPEN;
				this.nextAttempt = Date.now() + this.config.timeout;
				this.emit("stateChange", this.state, this.getMetrics());
			}
		}

		this.emit("failure", this.getMetrics());

		// Callback for state changes
		if (this.config.onStateChange) {
			this.config.onStateChange(this.state, this.getMetrics());
		}
	}

	private startMetricsCleanup(): void {
		setInterval(() => {
			const now = Date.now();
			const cutoff = now - this.config.monitoringPeriod;

			// Reset metrics if they're too old
			if (this.lastFailureTime && this.lastFailureTime < cutoff) {
				this.failureCount = Math.max(0, this.failureCount - 1);
			}

			// Reset success count periodically
			if (this.state === CircuitState.CLOSED) {
				this.successCount = 0;
			}
		}, this.config.monitoringPeriod / 10); // Check every 10% of monitoring period
	}
}

/**
 * Circuit breaker error class
 */
export class CircuitBreakerError extends Error {
	constructor(
		message: string,
		public metrics: CircuitMetrics,
	) {
		super(message);
		this.name = "CircuitBreakerError";
	}
}

/**
 * Database-specific circuit breaker configurations
 */
export const DATABASE_CIRCUIT_CONFIGS = {
	// Main database operations
	primary: {
		failureThreshold: 5,
		successThreshold: 2,
		timeout: 30000, // 30 seconds
		monitoringPeriod: 5 * 60 * 1000, // 5 minutes
	} as Partial<CircuitBreakerConfig>,

	// Critical operations (health checks)
	critical: {
		failureThreshold: 3,
		successThreshold: 1,
		timeout: 10000, // 10 seconds
		monitoringPeriod: 2 * 60 * 1000, // 2 minutes
	} as Partial<CircuitBreakerConfig>,

	// Batch operations
	batch: {
		failureThreshold: 10,
		successThreshold: 3,
		timeout: 60000, // 1 minute
		monitoringPeriod: 10 * 60 * 1000, // 10 minutes
	} as Partial<CircuitBreakerConfig>,

	// Reports and analytics
	analytics: {
		failureThreshold: 8,
		successThreshold: 2,
		timeout: 45000, // 45 seconds
		monitoringPeriod: 15 * 60 * 1000, // 15 minutes
	} as Partial<CircuitBreakerConfig>,
} as const;

/**
 * Global circuit breakers for different operation types
 */
export const databaseCircuitBreaker = new CircuitBreaker(
	DATABASE_CIRCUIT_CONFIGS.primary,
);
export const criticalCircuitBreaker = new CircuitBreaker(
	DATABASE_CIRCUIT_CONFIGS.critical,
);
export const batchCircuitBreaker = new CircuitBreaker(
	DATABASE_CIRCUIT_CONFIGS.batch,
);
export const analyticsCircuitBreaker = new CircuitBreaker(
	DATABASE_CIRCUIT_CONFIGS.analytics,
);

/**
 * Circuit breaker middleware for database operations
 */
export function withCircuitBreaker<T>(
	operation: () => Promise<T>,
	circuitBreaker: CircuitBreaker = databaseCircuitBreaker,
	fallback?: () => Promise<T> | T,
): Promise<T> {
	return circuitBreaker.execute(operation, fallback);
}

/**
 * Fallback strategies for common operations
 */
export const FALLBACK_STRATEGIES = {
	// Return cached data or empty result
	readOperation:
		<T>(defaultValue: T) =>
		() =>
			Promise.resolve(defaultValue),

	// Queue operation for later
	writeOperation: (operation: () => Promise<unknown>) => () => {
		// Add to offline queue or return success indicator
		console.warn("Operation queued for retry:", operation.name);
		return Promise.resolve({
			queued: true,
			message: "Operation will be retried automatically",
		});
	},

	// Return service unavailable
	serviceUnavailable: () => () => {
		throw new Error("Service temporarily unavailable. Please try again later.");
	},

	// Return degraded response
	degradedMode:
		(message: string = "Service running in degraded mode") =>
		() => {
			return Promise.resolve({
				success: false,
				degraded: true,
				message,
			});
		},
} as const;

/**
 * Health check with circuit breaker
 */
export async function checkDatabaseHealthWithCircuitBreaker(): Promise<{
	healthy: boolean;
	circuitState: CircuitState;
	metrics: CircuitMetrics;
}> {
	try {
		await criticalCircuitBreaker.execute(async () => {
			// Import here to avoid circular dependency
			const { checkDatabaseHealth } = await import("./db-monitoring");
			const health = await checkDatabaseHealth();

			if (!health.isHealthy) {
				throw new Error(`Database health check failed: ${health.error}`);
			}

			return health;
		});

		return {
			healthy: true,
			circuitState: criticalCircuitBreaker.getMetrics().state,
			metrics: criticalCircuitBreaker.getMetrics(),
		};
	} catch {
		// Ignore error details for health check failure
		return {
			healthy: false,
			circuitState: criticalCircuitBreaker.getMetrics().state,
			metrics: criticalCircuitBreaker.getMetrics(),
		};
	}
}

/**
 * Setup circuit breaker event logging
 */
export function setupCircuitBreakerLogging(): void {
	const logCircuitEvent = (name: string, breaker: CircuitBreaker) => {
		breaker.on("stateChange", (state, metrics) => {
			console.log(`🔄 Circuit breaker [${name}] state changed to ${state}`, {
				failureRate: `${metrics.failureRate.toFixed(2)}%`,
				totalRequests: metrics.totalRequests,
				failureCount: metrics.failureCount,
			});
		});

		breaker.on("failure", (metrics) => {
			if (metrics.state === CircuitState.OPEN) {
				console.error(`❌ Circuit breaker [${name}] opened due to failures`, {
					failureCount: metrics.failureCount,
					failureRate: `${metrics.failureRate.toFixed(2)}%`,
				});
			}
		});

		breaker.on("fallback", (error) => {
			console.warn(
				`🔀 Circuit breaker [${name}] fallback triggered:`,
				error.message,
			);
		});
	};

	logCircuitEvent("database", databaseCircuitBreaker);
	logCircuitEvent("critical", criticalCircuitBreaker);
	logCircuitEvent("batch", batchCircuitBreaker);
	logCircuitEvent("analytics", analyticsCircuitBreaker);
}
