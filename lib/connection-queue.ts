import { EventEmitter } from "node:events";

/**
 * Connection queue configuration
 */
export interface ConnectionQueueConfig {
	maxConcurrentConnections: number;
	maxQueueSize: number;
	timeoutMs: number;
	priorityLevels: number;
}

/**
 * Queue item interface
 */
interface QueueItem<T> {
	id: string;
	priority: number;
	operation: () => Promise<T>;
	resolve: (value: T) => void;
	reject: (error: Error) => void;
	timestamp: number;
	timeoutId?: NodeJS.Timeout;
}

/**
 * Connection queue stats
 */
export interface QueueStats {
	activeConnections: number;
	queuedItems: number;
	totalProcessed: number;
	totalFailed: number;
	averageWaitTime: number;
	averageExecutionTime: number;
}

/**
 * Connection Queue Manager
 * Manages database connections to prevent overwhelming Neon's connection limits
 */
export class ConnectionQueue extends EventEmitter {
	private config: ConnectionQueueConfig;
	private activeConnections = 0;
	private queue: Array<QueueItem<unknown>> = [];
	private stats = {
		totalProcessed: 0,
		totalFailed: 0,
		totalWaitTime: 0,
		totalExecutionTime: 0,
	};

	constructor(config: Partial<ConnectionQueueConfig> = {}) {
		super();

		this.config = {
			maxConcurrentConnections: 8, // Conservative for Neon free tier
			maxQueueSize: 100,
			timeoutMs: 30000, // 30 seconds
			priorityLevels: 3,
			...config,
		};

		// Start queue processor
		this.startProcessing();

		// Cleanup timeout checker
		setInterval(() => this.cleanupTimeouts(), 5000);
	}

	/**
	 * Add operation to queue
	 */
	async enqueue<T>(
		operation: () => Promise<T>,
		priority: number = 1,
		operationId?: string,
	): Promise<T> {
		return new Promise((resolve, reject) => {
			// Check queue size
			if (this.queue.length >= this.config.maxQueueSize) {
				reject(new Error("Connection queue is full. Please try again later."));
				return;
			}

			// Normalize priority (higher number = higher priority)
			const normalizedPriority = Math.max(
				0,
				Math.min(this.config.priorityLevels - 1, priority),
			);

			const queueItem: QueueItem<T> = {
				id: operationId || this.generateId(),
				priority: normalizedPriority,
				operation,
				resolve,
				reject,
				timestamp: Date.now(),
			};

			// Set timeout
			queueItem.timeoutId = setTimeout(() => {
				this.removeFromQueue(queueItem.id);
				reject(new Error("Operation timed out in queue"));
			}, this.config.timeoutMs);

			// Insert into queue based on priority
			this.insertByPriority(queueItem);

			this.emit("enqueued", {
				id: queueItem.id,
				priority: normalizedPriority,
				queueSize: this.queue.length,
			});

			// Try to process immediately if connections available
			this.processNext();
		});
	}

	/**
	 * Process high priority operation immediately if possible
	 */
	async enqueueUrgent<T>(
		operation: () => Promise<T>,
		operationId?: string,
	): Promise<T> {
		return this.enqueue(operation, this.config.priorityLevels - 1, operationId);
	}

	/**
	 * Get current queue statistics
	 */
	getStats(): QueueStats {
		const averageWaitTime =
			this.stats.totalProcessed > 0
				? this.stats.totalWaitTime / this.stats.totalProcessed
				: 0;

		const averageExecutionTime =
			this.stats.totalProcessed > 0
				? this.stats.totalExecutionTime / this.stats.totalProcessed
				: 0;

		return {
			activeConnections: this.activeConnections,
			queuedItems: this.queue.length,
			totalProcessed: this.stats.totalProcessed,
			totalFailed: this.stats.totalFailed,
			averageWaitTime,
			averageExecutionTime,
		};
	}

	/**
	 * Clear all queued items
	 */
	clear(): void {
		const clearedItems = this.queue.splice(0);
		clearedItems.forEach((item) => {
			if (item.timeoutId) {
				clearTimeout(item.timeoutId);
			}
			item.reject(new Error("Queue cleared"));
		});

		this.emit("cleared", { clearedCount: clearedItems.length });
	}

	/**
	 * Pause queue processing
	 */
	pause(): void {
		this.emit("paused");
	}

	/**
	 * Resume queue processing
	 */
	resume(): void {
		this.emit("resumed");
		this.processNext();
	}

	/**
	 * Check if queue is healthy
	 */
	isHealthy(): boolean {
		const stats = this.getStats();
		return (
			stats.queuedItems < this.config.maxQueueSize * 0.8 && // Queue not too full
			stats.activeConnections <= this.config.maxConcurrentConnections &&
			stats.averageWaitTime < this.config.timeoutMs * 0.5 // Wait time reasonable
		);
	}

	/**
	 * Private methods
	 */

	private generateId(): string {
		return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private insertByPriority<T>(item: QueueItem<T>): void {
		// Find insertion point (higher priority first, then FIFO)
		let insertIndex = this.queue.length;

		for (let i = 0; i < this.queue.length; i++) {
			const queueItem = this.queue[i];
			if (
				queueItem &&
				(queueItem.priority < item.priority ||
					(queueItem.priority === item.priority &&
						queueItem.timestamp > item.timestamp))
			) {
				insertIndex = i;
				break;
			}
		}

		this.queue.splice(insertIndex, 0, item as QueueItem<unknown>);
	}

	private removeFromQueue(id: string): QueueItem<unknown> | null {
		const index = this.queue.findIndex((item) => item.id === id);
		if (index >= 0) {
			const [item] = this.queue.splice(index, 1);
			if (item?.timeoutId) {
				clearTimeout(item.timeoutId);
			}
			return item ?? null;
		}
		return null;
	}

	private async processNext(): Promise<void> {
		// Check if we can process more connections
		if (
			this.activeConnections >= this.config.maxConcurrentConnections ||
			this.queue.length === 0
		) {
			return;
		}

		const item = this.queue.shift();
		if (!item) return;

		// Clear timeout since we're processing
		if (item.timeoutId) {
			clearTimeout(item.timeoutId);
		}

		this.activeConnections++;
		const waitTime = Date.now() - item.timestamp;

		this.emit("processing", {
			id: item.id,
			waitTime,
			activeConnections: this.activeConnections,
		});

		const startTime = Date.now();

		try {
			const result = await item.operation();
			const executionTime = Date.now() - startTime;

			// Update stats
			this.stats.totalProcessed++;
			this.stats.totalWaitTime += waitTime;
			this.stats.totalExecutionTime += executionTime;

			item.resolve(result);

			this.emit("completed", {
				id: item.id,
				waitTime,
				executionTime,
				activeConnections: this.activeConnections,
			});
		} catch (error) {
			const executionTime = Date.now() - startTime;

			// Update stats
			this.stats.totalFailed++;
			this.stats.totalWaitTime += waitTime;
			this.stats.totalExecutionTime += executionTime;

			item.reject(error instanceof Error ? error : new Error(String(error)));

			this.emit("failed", {
				id: item.id,
				error: error instanceof Error ? error.message : String(error),
				waitTime,
				executionTime,
				activeConnections: this.activeConnections,
			});
		} finally {
			this.activeConnections--;

			// Process next item if available
			setTimeout(() => this.processNext(), 0);
		}
	}

	private startProcessing(): void {
		// Continuously try to process queue
		const processInterval = setInterval(() => {
			if (
				this.queue.length > 0 &&
				this.activeConnections < this.config.maxConcurrentConnections
			) {
				this.processNext();
			}
		}, 100); // Check every 100ms

		// Cleanup on exit - only in Node.js runtime, not Edge Runtime
		if (typeof process !== "undefined" && process.on) {
			process.on("exit", () => {
				clearInterval(processInterval);
			});
		}
	}

	private cleanupTimeouts(): void {
		const now = Date.now();
		const expiredItems: QueueItem<unknown>[] = [];

		this.queue = this.queue.filter((item) => {
			if (now - item.timestamp > this.config.timeoutMs) {
				expiredItems.push(item);
				return false;
			}
			return true;
		});

		expiredItems.forEach((item) => {
			if (item.timeoutId) {
				clearTimeout(item.timeoutId);
			}
			item.reject(new Error("Operation timed out in queue"));
		});

		if (expiredItems.length > 0) {
			this.emit("timeouts", { expiredCount: expiredItems.length });
		}
	}
}

/**
 * Operation type for queue selection
 */
export type OperationType = "read" | "write" | "batch" | "critical";

/**
 * Specialized connection queue instances
 */
export const connectionQueues = {
	/**
	 * Read queue - Higher concurrency for SELECT operations
	 */
	read: new ConnectionQueue({
		maxConcurrentConnections: 8, // Higher for reads
		maxQueueSize: 300,
		timeoutMs: 20000, // Shorter timeout for reads
		priorityLevels: 5,
	}),

	/**
	 * Write queue - Lower concurrency for INSERT/UPDATE/DELETE operations
	 */
	write: new ConnectionQueue({
		maxConcurrentConnections: 3, // Conservative for writes
		maxQueueSize: 150,
		timeoutMs: 45000, // Longer timeout for writes
		priorityLevels: 5,
	}),

	/**
	 * Batch queue - Very restrictive for bulk operations
	 */
	batch: new ConnectionQueue({
		maxConcurrentConnections: 1, // Single connection for batches
		maxQueueSize: 50,
		timeoutMs: 120000, // 2 minutes for batch operations
		priorityLevels: 3,
	}),

	/**
	 * Critical queue - Dedicated for health checks and critical operations
	 */
	critical: new ConnectionQueue({
		maxConcurrentConnections: 2, // Dedicated slots for critical ops
		maxQueueSize: 20,
		timeoutMs: 10000, // Fast fail for critical ops
		priorityLevels: 3,
	}),
} as const;

/**
 * Legacy global connection queue instance (maintained for backward compatibility)
 * @deprecated Use specific queues via withConnectionQueue with operationType
 */
export const globalConnectionQueue = connectionQueues.read;

/**
 * Get the appropriate queue for an operation type
 */
function getQueueForOperation(operationType: OperationType): ConnectionQueue {
	return connectionQueues[operationType];
}

/**
 * Wrap database operations with connection queueing (enhanced with operation type)
 */
export function withConnectionQueue<T>(
	operation: () => Promise<T>,
	priority: number = 1,
	operationId?: string,
	operationType: OperationType = "read",
): Promise<T> {
	const queue = getQueueForOperation(operationType);
	return queue.enqueue(operation, priority, operationId);
}

/**
 * Wrap urgent database operations (e.g., health checks)
 */
export function withUrgentQueue<T>(
	operation: () => Promise<T>,
	operationId?: string,
	operationType: OperationType = "critical",
): Promise<T> {
	const queue = getQueueForOperation(operationType);
	return queue.enqueueUrgent(operation, operationId);
}

/**
 * Priority levels for common operations
 */
export const QUEUE_PRIORITIES = {
	CRITICAL: 4, // Health checks, system status
	HIGH: 3, // User-facing operations (record medication)
	NORMAL: 2, // Regular API calls
	LOW: 1, // Background tasks, reports
	BATCH: 0, // Bulk operations, imports
} as const;

/**
 * Get statistics for all queues
 */
export function getAllQueueStats(): Record<OperationType, QueueStats> {
	return {
		read: connectionQueues.read.getStats(),
		write: connectionQueues.write.getStats(),
		batch: connectionQueues.batch.getStats(),
		critical: connectionQueues.critical.getStats(),
	};
}

/**
 * Get overall system health across all queues
 */
export function areAllQueuesHealthy(): boolean {
	return Object.values(connectionQueues).every((queue) => queue.isHealthy());
}

/**
 * Clear all queues (emergency function)
 */
export function clearAllQueues(): void {
	Object.values(connectionQueues).forEach((queue) => queue.clear());
}

/**
 * Pause all queues
 */
export function pauseAllQueues(): void {
	Object.values(connectionQueues).forEach((queue) => queue.pause());
}

/**
 * Resume all queues
 */
export function resumeAllQueues(): void {
	Object.values(connectionQueues).forEach((queue) => queue.resume());
}

/**
 * Convenience functions for specific operation types
 */
export function withReadQueue<T>(
	operation: () => Promise<T>,
	priority: number = QUEUE_PRIORITIES.NORMAL,
	operationId?: string,
): Promise<T> {
	return withConnectionQueue(operation, priority, operationId, "read");
}

export function withWriteQueue<T>(
	operation: () => Promise<T>,
	priority: number = QUEUE_PRIORITIES.HIGH,
	operationId?: string,
): Promise<T> {
	return withConnectionQueue(operation, priority, operationId, "write");
}

export function withBatchQueue<T>(
	operation: () => Promise<T>,
	priority: number = QUEUE_PRIORITIES.BATCH,
	operationId?: string,
): Promise<T> {
	return withConnectionQueue(operation, priority, operationId, "batch");
}

export function withCriticalQueue<T>(
	operation: () => Promise<T>,
	priority: number = QUEUE_PRIORITIES.CRITICAL,
	operationId?: string,
): Promise<T> {
	return withConnectionQueue(operation, priority, operationId, "critical");
}

/**
 * Connection queue middleware for tRPC (enhanced with operation type)
 */
export function createConnectionQueueMiddleware(
	priority: number = QUEUE_PRIORITIES.NORMAL,
	operationType: OperationType = "read",
) {
	return async function queueMiddleware<T>(
		operation: () => Promise<T>,
		operationId?: string,
	): Promise<T> {
		return withConnectionQueue(operation, priority, operationId, operationType);
	};
}
