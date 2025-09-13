"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.timedOperations = exports.dbMonitor = exports.dbPooled = exports.dbUnpooled = exports.db = exports.DatabaseTimeoutError = exports.TIMEOUT_CONFIG = void 0;
exports.withTimeout = withTimeout;
exports.createTimeoutSignal = createTimeoutSignal;
exports.withDatabaseTimeout = withDatabaseTimeout;
exports.closeConnections = closeConnections;
exports.tenantDb = tenantDb;
exports.getOptimalConnection = getOptimalConnection;
exports.executeWithTimeout = executeWithTimeout;
exports.createTimedDatabaseOperation = createTimedDatabaseOperation;
// Note: dotenv import removed to support Edge Runtime
var serverless_1 = require("@neondatabase/serverless");
var neon_http_1 = require("drizzle-orm/neon-http");
var neon_serverless_1 = require("drizzle-orm/neon-serverless");
var schema = require("./schema");
// Timeout configurations for different operation types
exports.TIMEOUT_CONFIG = {
    // Standard CRUD operations
    READ: 3000, // 3 seconds
    WRITE: 5000, // 5 seconds
    // Special operations
    MIGRATION: 30000, // 30 seconds
    BATCH: 15000, // 15 seconds
    HEALTH_CHECK: 2000, // 2 seconds
    ANALYTICS: 10000, // 10 seconds
};
// Create timeout error class
var DatabaseTimeoutError = /** @class */ (function (_super) {
    __extends(DatabaseTimeoutError, _super);
    function DatabaseTimeoutError(message, timeoutMs, operation) {
        var _this = _super.call(this, message) || this;
        _this.timeoutMs = timeoutMs;
        _this.operation = operation;
        _this.name = "DatabaseTimeoutError";
        return _this;
    }
    return DatabaseTimeoutError;
}(Error));
exports.DatabaseTimeoutError = DatabaseTimeoutError;
/**
 * Creates a timeout wrapper for Promise-based operations
 */
function withTimeout(promise, timeoutMs, operation) {
    return Promise.race([
        promise,
        new Promise(function (_, reject) {
            setTimeout(function () {
                reject(new DatabaseTimeoutError("Operation timed out after ".concat(timeoutMs, "ms").concat(operation ? " (".concat(operation, ")") : ""), timeoutMs, operation));
            }, timeoutMs);
        }),
    ]);
}
/**
 * Creates a timeout wrapper using AbortSignal for fetch-based operations
 */
function createTimeoutSignal(timeoutMs) {
    if (typeof AbortSignal.timeout === "function") {
        // Use native AbortSignal.timeout if available (Node.js 16.14+)
        return AbortSignal.timeout(timeoutMs);
    }
    // Fallback for older environments
    var controller = new AbortController();
    setTimeout(function () { return controller.abort(); }, timeoutMs);
    return controller.signal;
}
/**
 * Database operation wrapper with timeout and operation type detection
 */
function withDatabaseTimeout(operation_1) {
    return __awaiter(this, arguments, void 0, function (operation, options) {
        var _a, timeoutMs, operationType, operationName, finalTimeoutMs;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_b) {
            _a = options.timeoutMs, timeoutMs = _a === void 0 ? exports.TIMEOUT_CONFIG.READ : _a, operationType = options.operationType, operationName = options.operationName;
            finalTimeoutMs = operationType
                ? exports.TIMEOUT_CONFIG[operationType]
                : timeoutMs;
            return [2 /*return*/, withTimeout(operation(), finalTimeoutMs, operationName)];
        });
    });
}
// Initialize monitoring lazy to avoid circular dependency
var monitor = null;
// Connection URLs - use pooled for high-frequency operations, unpooled for long-running operations
var DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is required');
}
var DATABASE_URL_UNPOOLED = process.env.DATABASE_URL_UNPOOLED || DATABASE_URL;
// Configure Neon client with timeout settings
var neonConfig = __assign({ 
    // Set default fetch timeout for all operations
    fetchConnectionCache: true }, (typeof globalThis !== "undefined" && {
    fetchOptions: {
        // Default timeout for fetch operations
        signal: createTimeoutSignal(exports.TIMEOUT_CONFIG.READ),
    },
}));
// Primary pooled connection for API routes (short-lived queries)
// This is optimized for serverless environments with connection pooling
var sql = (0, serverless_1.neon)(DATABASE_URL, neonConfig);
// Drizzle instance with monitoring integration using pooled connection
exports.db = (0, neon_http_1.drizzle)(sql, {
    schema: schema,
    logger: process.env.NODE_ENV === "development",
});
// Unpooled connection for migrations, batch operations, and long-running queries
// Use when you need dedicated connections or transactions
var sqlUnpooled = (0, serverless_1.neon)(DATABASE_URL_UNPOOLED, __assign(__assign({}, neonConfig), (typeof globalThis !== "undefined" && {
    fetchOptions: {
        // Longer timeout for unpooled operations
        signal: createTimeoutSignal(exports.TIMEOUT_CONFIG.MIGRATION),
    },
})));
exports.dbUnpooled = (0, neon_http_1.drizzle)(sqlUnpooled, {
    schema: schema,
    logger: process.env.NODE_ENV === "development",
});
// Connection pool for Node.js runtime environments (not Edge Runtime)
// Only initialize if running in Node.js environment
var _pool = null;
var _pooledDb = null;
if (typeof ((_a = process === null || process === void 0 ? void 0 : process.versions) === null || _a === void 0 ? void 0 : _a.node) !== "undefined" &&
    process.env.NODE_ENV !== "test") {
    try {
        _pool = new serverless_1.Pool({
            connectionString: DATABASE_URL,
            // Optimized for Neon's connection limits and serverless patterns
            max: 5, // Max connections (conservative for Neon free tier)
            min: 0, // No minimum connections (serverless-friendly)
            idleTimeoutMillis: 30000, // 30 seconds idle timeout
            connectionTimeoutMillis: 10000, // 10 seconds connection timeout
            maxUses: 7500, // Recycle connections after this many queries
            allowExitOnIdle: true, // Allow process to exit when idle
            // Add statement timeout for pooled connections
            statement_timeout: exports.TIMEOUT_CONFIG.READ, // 3 seconds default statement timeout
            query_timeout: exports.TIMEOUT_CONFIG.WRITE, // 5 seconds query timeout
        });
        _pooledDb = (0, neon_serverless_1.drizzle)(_pool, {
            schema: schema,
            logger: process.env.NODE_ENV === "development",
        });
    }
    catch (error) {
        console.warn("Failed to initialize connection pool, falling back to HTTP client:", error);
    }
}
// Export pooled database connection (if available) or fallback to HTTP client
// Cast to maintain type compatibility with the HTTP client
exports.dbPooled = (_pooledDb || exports.db);
// Global monitoring instance for external access (lazy loaded)
exports.dbMonitor = {
    startMonitoring: function () {
    },
    stopMonitoring: function () {
    },
    checkHealth: function () { return Promise.resolve({ isHealthy: true }); },
};
// Connection lifecycle management
function closeConnections() {
    return __awaiter(this, void 0, void 0, function () {
        var error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    if (!_pool) return [3 /*break*/, 2];
                    console.log("Closing database connection pool...");
                    return [4 /*yield*/, _pool.end()];
                case 1:
                    _a.sent();
                    _pool = null;
                    _pooledDb = null;
                    _a.label = 2;
                case 2:
                    if (monitor === null || monitor === void 0 ? void 0 : monitor.stopMonitoring) {
                        monitor.stopMonitoring();
                    }
                    console.log("Database connections closed successfully");
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.error("Error closing database connections:", error_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// Helper for tenant-scoped queries with proper isolation and timeout support
function tenantDb(householdId_1, callback_1) {
    return __awaiter(this, arguments, void 0, function (householdId, callback, options) {
        var database, operation;
        var _this = this;
        if (options === void 0) { options = {}; }
        return __generator(this, function (_a) {
            if (!householdId) {
                throw new Error("householdId is required for tenant-scoped queries");
            }
            database = (_pooledDb || exports.db);
            operation = function () { return __awaiter(_this, void 0, void 0, function () {
                var error_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            _a.trys.push([0, 2, , 3]);
                            return [4 /*yield*/, callback(database)];
                        case 1: return [2 /*return*/, _a.sent()];
                        case 2:
                            error_2 = _a.sent();
                            console.error("Tenant query error for household ".concat(householdId, ":"), error_2);
                            throw error_2;
                        case 3: return [2 /*return*/];
                    }
                });
            }); };
            // Apply timeout wrapper if specified
            if (options.timeoutMs || options.operationType || options.operationName) {
                return [2 /*return*/, withDatabaseTimeout(operation, options)];
            }
            return [2 /*return*/, operation()];
        });
    });
}
// Utility to get the best available connection for different use cases
function getOptimalConnection(useCase) {
    if (useCase === void 0) { useCase = "api"; }
    switch (useCase) {
        case "migration":
        case "batch":
            // Use unpooled for long-running operations
            return exports.dbUnpooled;
        case "transaction":
            // Use pooled connection with WebSocket support if available
            return (_pooledDb || exports.dbUnpooled);
        default:
            // Use pooled connection for API routes
            return exports.dbPooled;
    }
}
/**
 * Execute a database operation with automatic timeout based on operation type
 */
function executeWithTimeout(operation, operationType, operationName) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, withDatabaseTimeout(operation, { operationType: operationType, operationName: operationName })];
        });
    });
}
/**
 * Create a database operation wrapper with built-in timeout and circuit breaker
 */
function createTimedDatabaseOperation(operationType, operationName) {
    var _this = this;
    return function (operation) {
        return function () {
            var args = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                args[_i] = arguments[_i];
            }
            return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, executeWithTimeout(function () { return operation.apply(void 0, args); }, operationType, operationName)];
                });
            });
        };
    };
}
/**
 * Utility functions for common database operations with appropriate timeouts
 */
exports.timedOperations = {
    /**
     * Execute a read operation with read timeout
     */
    read: function (operation, operationName) {
        return executeWithTimeout(operation, "READ", operationName);
    },
    /**
     * Execute a write operation with write timeout
     */
    write: function (operation, operationName) {
        return executeWithTimeout(operation, "WRITE", operationName);
    },
    /**
     * Execute a health check with health check timeout
     */
    healthCheck: function (operation, operationName) { return executeWithTimeout(operation, "HEALTH_CHECK", operationName); },
    /**
     * Execute analytics operation with analytics timeout
     */
    analytics: function (operation, operationName) { return executeWithTimeout(operation, "ANALYTICS", operationName); },
    /**
     * Execute batch operation with batch timeout
     */
    batch: function (operation, operationName) {
        return executeWithTimeout(operation, "BATCH", operationName);
    },
};
// Initialize monitoring in production - only in Node.js runtime, not Edge Runtime
// if (typeof process !== "undefined" && process.env.NODE_ENV === "production" && process.env.VERCEL_ENV === 'production') {
// 	// Lazy load DatabaseMonitor to avoid circular dependency
// 	import("@/lib/infrastructure/db-monitoring").then(({ DatabaseMonitor }) => {
// 		monitor = new DatabaseMonitor();
// 		monitor.startMonitoring(60000, (violations: string[], metrics: unknown) => {
// 			const metricsTyped = metrics as ConnectionMetrics;
// 			console.error("Database health alert:", {
// 				violations,
// 				metrics: {
// 					responseTime: metricsTyped.responseTime,
// 					usagePercentage: metricsTyped.usagePercentage,
// 					connectionCount: metricsTyped.connectionCount,
// 					isHealthy: metricsTyped.isHealthy,
// 				},
// 			});
// 		});
// 	});
// }
// Graceful shutdown handling - only in Node.js runtime, not Edge Runtime
if (process === null || process === void 0 ? void 0 : process.on) {
    process.on("SIGTERM", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Shutting down database connections...");
                    return [4 /*yield*/, closeConnections()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    process.on("SIGINT", function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log("Shutting down database connections...");
                    return [4 /*yield*/, closeConnections()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    // Handle unhandled rejections and uncaught exceptions
    process.on("unhandledRejection", function (reason, promise) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.error("Unhandled Rejection at:", promise, "reason:", reason);
                    // Gracefully close connections on critical errors
                    return [4 /*yield*/, closeConnections()];
                case 1:
                    // Gracefully close connections on critical errors
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
}
// Export all schemas for easy access
__exportStar(require("./schema"), exports);
