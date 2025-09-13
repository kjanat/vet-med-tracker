#!/usr/bin/env tsx
/**
 * System Monitoring Script for Load Testing
 *
 * Monitors system health and safeguards during load testing:
 * - Real-time health endpoint monitoring
 * - Circuit breaker state tracking
 * - Connection queue monitoring
 * - Rate limiting detection
 * - Performance metrics collection
 */
var __awaiter =
  (this && this.__awaiter) ||
  ((thisArg, _arguments, P, generator) => {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P((resolve) => {
            resolve(value);
          });
    }
    return new (P || (P = Promise))((resolve, reject) => {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator.throw(value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  });
var __generator =
  (this && this.__generator) ||
  ((thisArg, body) => {
    var _ = {
        label: 0,
        sent: () => {
          if (t[0] & 1) throw t[1];
          return t[1];
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g = Object.create(
        (typeof Iterator === "function" ? Iterator : Object).prototype,
      );
    return (
      (g.next = verb(0)),
      (g.throw = verb(1)),
      (g.return = verb(2)),
      typeof Symbol === "function" &&
        (g[Symbol.iterator] = function () {
          return this;
        }),
      g
    );
    function verb(n) {
      return (v) => step([n, v]);
    }
    function step(op) {
      if (f) throw new TypeError("Generator is already executing.");
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y.return
                  : op[0]
                    ? y.throw || ((t = y.return) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t;
          if (((y = 0), t)) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
      if (op[0] & 5) throw op[1];
      return { value: op[0] ? op[1] : void 0, done: true };
    }
  });
var __spreadArray =
  (this && this.__spreadArray) ||
  ((to, from, pack) => {
    if (pack || arguments.length === 2)
      for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
    return to.concat(ar || Array.prototype.slice.call(from));
  });
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemMonitor = void 0;
var node_fs_1 = require("node:fs");
var node_perf_hooks_1 = require("node:perf_hooks");
var SystemMonitor = /** @class */ (() => {
  function SystemMonitor(config) {
    this.snapshots = [];
    this.isMonitoring = false;
    this.config = config;
    this.lastCpuUsage = process.cpuUsage();
  }
  SystemMonitor.prototype.start = function () {
    if (this.isMonitoring) {
      console.warn("⚠️ Monitoring already running");
      return;
    }
    console.log("🔍 Starting system monitoring...");
    console.log(
      "\uD83D\uDCCA Monitoring interval: ".concat(
        this.config.monitoringInterval,
        "ms",
      ),
    );
    console.log("\uD83C\uDFAF Target URL: ".concat(this.config.baseUrl));
    this.isMonitoring = true;
    this.startTime = node_perf_hooks_1.performance.now();
    this.monitoringInterval = setInterval(
      () =>
        __awaiter(this, void 0, void 0, function () {
          var snapshot, error_1;
          return __generator(this, function (_a) {
            switch (_a.label) {
              case 0:
                _a.trys.push([0, 2, undefined, 3]);
                return [4 /*yield*/, this.takeSnapshot()];
              case 1:
                snapshot = _a.sent();
                this.snapshots.push(snapshot);
                this.analyzeSnapshot(snapshot);
                return [3 /*break*/, 3];
              case 2:
                error_1 = _a.sent();
                console.error("❌ Monitoring error:", error_1);
                return [3 /*break*/, 3];
              case 3:
                return [2 /*return*/];
            }
          });
        }),
      this.config.monitoringInterval,
    );
    // Handle cleanup
    process.on("SIGINT", () => this.stop());
    process.on("SIGTERM", () => this.stop());
  };
  SystemMonitor.prototype.stop = function () {
    if (!this.isMonitoring) {
      return;
    }
    console.log("\n⏹️ Stopping system monitoring...");
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    this.generateReport();
    if (this.config.outputFile) {
      this.saveResults();
    }
  };
  SystemMonitor.prototype.getSnapshots = function () {
    return __spreadArray([], this.snapshots, true);
  };
  SystemMonitor.prototype.takeSnapshot = function () {
    return __awaiter(this, void 0, void 0, function () {
      var timestamp,
        startTime,
        response,
        responseTime,
        healthData,
        memoryUsage,
        cpuUsage,
        error_2;
      return __generator(this, function (_a) {
        switch (_a.label) {
          case 0:
            timestamp = Date.now();
            startTime = node_perf_hooks_1.performance.now();
            _a.label = 1;
          case 1:
            _a.trys.push([1, 4, undefined, 5]);
            return [
              4 /*yield*/,
              fetch(
                "".concat(this.config.baseUrl, "/api/health?detailed=true"),
              ),
            ];
          case 2:
            response = _a.sent();
            responseTime = node_perf_hooks_1.performance.now() - startTime;
            return [4 /*yield*/, response.json()];
          case 3:
            healthData = _a.sent();
            memoryUsage = process.memoryUsage();
            cpuUsage = process.cpuUsage(this.lastCpuUsage);
            this.lastCpuUsage = process.cpuUsage();
            return [
              2 /*return*/,
              {
                timestamp: timestamp,
                health: {
                  status: healthData.status,
                  responseTime: responseTime,
                  components: healthData.components,
                },
                alerts: this.detectAlerts(healthData, responseTime),
                performance: {
                  memoryUsage: memoryUsage,
                  cpuUsage: cpuUsage,
                },
              },
            ];
          case 4:
            error_2 = _a.sent();
            // Return error snapshot
            return [
              2 /*return*/,
              {
                timestamp: timestamp,
                health: {
                  status: "error",
                  responseTime: -1,
                  components: {
                    database: { status: "unknown" },
                    queue: { status: "unknown" },
                    circuitBreakers: {},
                  },
                },
                alerts: ["Health endpoint error: ".concat(error_2)],
                performance: {
                  memoryUsage: process.memoryUsage(),
                  cpuUsage: process.cpuUsage(this.lastCpuUsage),
                },
              },
            ];
          case 5:
            return [2 /*return*/];
        }
      });
    });
  };
  SystemMonitor.prototype.detectAlerts = function (healthData, responseTime) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    var alerts = [];
    // Response time alerts
    if (responseTime > this.config.alertThresholds.responseTime) {
      alerts.push("High response time: ".concat(responseTime.toFixed(2), "ms"));
    }
    // Type the health data once
    var healthDataTyped = healthData;
    // Database alerts
    if (
      ((_b =
        (_a = healthDataTyped.components) === null || _a === void 0
          ? void 0
          : _a.database) === null || _b === void 0
        ? void 0
        : _b.status) !== "healthy"
    ) {
      alerts.push(
        "Database unhealthy: ".concat(
          (_d =
            (_c = healthDataTyped.components) === null || _c === void 0
              ? void 0
              : _c.database) === null || _d === void 0
            ? void 0
            : _d.status,
        ),
      );
    }
    // Queue alerts
    var queuedItems =
      ((_f =
        (_e = healthDataTyped.metrics) === null || _e === void 0
          ? void 0
          : _e.queue) === null || _f === void 0
        ? void 0
        : _f.queuedItems) || 0;
    if (queuedItems > this.config.alertThresholds.queueSize) {
      alerts.push("High queue size: ".concat(queuedItems, " items"));
    }
    // Circuit breaker alerts
    var circuitBreakers =
      ((_g = healthDataTyped.components) === null || _g === void 0
        ? void 0
        : _g.circuitBreakers) || {};
    for (
      var _i = 0, _j = Object.entries(circuitBreakers);
      _i < _j.length;
      _i++
    ) {
      var _k = _j[_i],
        name_1 = _k[0],
        breaker = _k[1];
      if (breaker.status === "unhealthy" || breaker.state === "OPEN") {
        alerts.push("Circuit breaker ".concat(name_1, " opened"));
      }
    }
    // Error rate alerts
    var errorStats =
      (_h = healthDataTyped.metrics) === null || _h === void 0
        ? void 0
        : _h.errors;
    if (
      (errorStats === null || errorStats === void 0
        ? void 0
        : errorStats.recentCount) &&
      errorStats.recentCount >
        this.config.alertThresholds.circuitBreakerFailures
    ) {
      alerts.push(
        "High error rate: ".concat(errorStats.recentCount, " errors"),
      );
    }
    // Overall status alerts
    if (healthDataTyped.status === "unhealthy") {
      alerts.push("System status: UNHEALTHY");
    } else if (healthDataTyped.status === "degraded") {
      alerts.push("System status: DEGRADED");
    }
    return alerts;
  };
  SystemMonitor.prototype.analyzeSnapshot = function (snapshot) {
    var _a;
    // Print real-time status
    var elapsed = (
      (snapshot.timestamp -
        (((_a = this.snapshots[0]) === null || _a === void 0
          ? void 0
          : _a.timestamp) || snapshot.timestamp)) /
      1000
    ).toFixed(1);
    process.stdout.write(
      "\r\uD83D\uDD0D ["
        .concat(elapsed, "s] Status: ")
        .concat(snapshot.health.status.toUpperCase().padEnd(9), " | ") +
        "Response: ".concat(
          snapshot.health.responseTime.toFixed(0).padStart(4),
          "ms | ",
        ) +
        "Queue: ".concat(
          (snapshot.health.components.queue.queuedItems || 0)
            .toString()
            .padStart(3),
          " | ",
        ) +
        "Alerts: ".concat(snapshot.alerts.length),
    );
    // Print alerts immediately
    if (snapshot.alerts.length > 0) {
      console.log(
        "\n\uD83D\uDEA8 ALERTS at ".concat(
          new Date(snapshot.timestamp).toISOString(),
          ":",
        ),
      );
      snapshot.alerts.forEach((alert) => {
        console.log("   \u26A0\uFE0F ".concat(alert));
      });
    }
  };
  SystemMonitor.prototype.generateReport = function () {
    var _a, _b;
    if (this.snapshots.length === 0) {
      console.log("\n📊 No monitoring data collected");
      return;
    }
    console.log("\n".concat("=".repeat(80)));
    console.log("📊 SYSTEM MONITORING REPORT");
    console.log("=".repeat(80));
    var duration =
      ((((_a = this.snapshots[this.snapshots.length - 1]) === null ||
      _a === void 0
        ? void 0
        : _a.timestamp) || 0) -
        (((_b = this.snapshots[0]) === null || _b === void 0
          ? void 0
          : _b.timestamp) || 0)) /
      1000;
    var totalSnapshots = this.snapshots.length;
    console.log("\n\uD83D\uDCCB Monitoring Summary:");
    console.log("   Duration: ".concat(duration.toFixed(1), "s"));
    console.log("   Snapshots: ".concat(totalSnapshots));
    console.log("   Interval: ".concat(this.config.monitoringInterval, "ms"));
    // Status distribution
    var statusCounts = this.snapshots.reduce((acc, snapshot) => {
      acc[snapshot.health.status] = (acc[snapshot.health.status] || 0) + 1;
      return acc;
    }, {});
    console.log("\n\uD83C\uDFAF Status Distribution:");
    for (var _i = 0, _c = Object.entries(statusCounts); _i < _c.length; _i++) {
      var _d = _c[_i],
        status_1 = _d[0],
        count = _d[1];
      var percentage = ((count / totalSnapshots) * 100).toFixed(1);
      console.log(
        "   "
          .concat(status_1, ": ")
          .concat(count, " (")
          .concat(percentage, "%)"),
      );
    }
    // Response time analysis
    var responseTimes = this.snapshots
      .filter((s) => s.health.responseTime > 0)
      .map((s) => s.health.responseTime);
    if (responseTimes.length > 0) {
      responseTimes.sort((a, b) => a - b);
      var avg =
        responseTimes.reduce((sum, time) => sum + time, 0) /
        responseTimes.length;
      var p50 = responseTimes[Math.floor(responseTimes.length * 0.5)] || 0;
      var p95 = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
      var p99 = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;
      console.log("\n\u26A1 Response Time Analysis:");
      console.log("   Average: ".concat(avg.toFixed(2), "ms"));
      console.log("   Median (P50): ".concat(p50.toFixed(2), "ms"));
      console.log("   P95: ".concat(p95.toFixed(2), "ms"));
      console.log("   P99: ".concat(p99.toFixed(2), "ms"));
      console.log(
        "   Min: ".concat(Math.min.apply(Math, responseTimes).toFixed(2), "ms"),
      );
      console.log(
        "   Max: ".concat(Math.max.apply(Math, responseTimes).toFixed(2), "ms"),
      );
    }
    // Alert analysis
    var allAlerts = this.snapshots.flatMap((s) => s.alerts);
    var alertCounts = allAlerts.reduce((acc, alert) => {
      acc[alert] = (acc[alert] || 0) + 1;
      return acc;
    }, {});
    console.log("\n\uD83D\uDEA8 Alert Analysis:");
    console.log("   Total Alerts: ".concat(allAlerts.length));
    if (Object.keys(alertCounts).length > 0) {
      console.log("   Alert Types:");
      for (var _e = 0, _f = Object.entries(alertCounts); _e < _f.length; _e++) {
        var _g = _f[_e],
          alert_1 = _g[0],
          count = _g[1];
        console.log("     ".concat(alert_1, ": ").concat(count, " times"));
      }
    } else {
      console.log("   \u2705 No alerts detected during monitoring");
    }
    // Circuit breaker state changes
    var circuitBreakerStates = this.snapshots.map((s) => ({
      timestamp: s.timestamp,
      states: s.health.components.circuitBreakers,
    }));
    console.log("\n\uD83D\uDD04 Circuit Breaker Activity:");
    var stateChanges =
      this.detectCircuitBreakerStateChanges(circuitBreakerStates);
    if (stateChanges.length > 0) {
      stateChanges.forEach((change) => {
        var time = new Date(change.timestamp).toISOString();
        console.log(
          "   "
            .concat(time, ": ")
            .concat(change.breaker, " -> ")
            .concat(change.newState),
        );
      });
    } else {
      console.log("   \u2705 No circuit breaker state changes detected");
    }
    // Queue performance
    var queueMetrics = this.snapshots
      .filter((s) => s.health.components.queue.queuedItems !== undefined)
      .map((s) => ({
        timestamp: s.timestamp,
        queuedItems: s.health.components.queue.queuedItems || 0,
        activeConnections: s.health.components.queue.activeConnections || 0,
        averageWaitTime: s.health.components.queue.averageWaitTime || 0,
      }));
    if (queueMetrics.length > 0) {
      var maxQueueSize = Math.max.apply(
        Math,
        queueMetrics.map((m) => m.queuedItems),
      );
      var avgQueueSize =
        queueMetrics.reduce((sum, m) => sum + m.queuedItems, 0) /
        queueMetrics.length;
      var maxConnections = Math.max.apply(
        Math,
        queueMetrics.map((m) => m.activeConnections),
      );
      console.log("\n\uD83D\uDDC2\uFE0F Queue Performance:");
      console.log("   Max Queue Size: ".concat(maxQueueSize, " items"));
      console.log(
        "   Avg Queue Size: ".concat(avgQueueSize.toFixed(1), " items"),
      );
      console.log("   Max Active Connections: ".concat(maxConnections));
    }
    console.log("\n\u2705 System monitoring completed");
  };
  SystemMonitor.prototype.detectCircuitBreakerStateChanges = (
    stateSnapshots,
  ) => {
    var changes = [];
    var previousStates = {};
    for (
      var _i = 0, stateSnapshots_1 = stateSnapshots;
      _i < stateSnapshots_1.length;
      _i++
    ) {
      var snapshot = stateSnapshots_1[_i];
      for (
        var _a = 0, _b = Object.entries(snapshot.states);
        _a < _b.length;
        _a++
      ) {
        var _c = _b[_a],
          breakerName = _c[0],
          breakerData = _c[1];
        var typedBreakerData = breakerData;
        var currentState =
          (typedBreakerData === null || typedBreakerData === void 0
            ? void 0
            : typedBreakerData.state) || "CLOSED";
        var previousState = previousStates[breakerName];
        if (previousState && previousState !== currentState) {
          changes.push({
            timestamp: snapshot.timestamp,
            breaker: breakerName,
            newState: currentState,
          });
        }
        previousStates[breakerName] = currentState;
      }
    }
    return changes;
  };
  SystemMonitor.prototype.saveResults = function () {
    var _a, _b, _c, _d;
    if (!this.config.outputFile) return;
    try {
      var report = {
        config: this.config,
        startTime:
          (_a = this.snapshots[0]) === null || _a === void 0
            ? void 0
            : _a.timestamp,
        endTime:
          (_b = this.snapshots[this.snapshots.length - 1]) === null ||
          _b === void 0
            ? void 0
            : _b.timestamp,
        duration:
          this.snapshots.length > 0
            ? ((((_c = this.snapshots[this.snapshots.length - 1]) === null ||
              _c === void 0
                ? void 0
                : _c.timestamp) || 0) -
                (((_d = this.snapshots[0]) === null || _d === void 0
                  ? void 0
                  : _d.timestamp) || 0)) /
              1000
            : 0,
        totalSnapshots: this.snapshots.length,
        snapshots: this.snapshots,
      };
      (0, node_fs_1.writeFileSync)(
        this.config.outputFile,
        JSON.stringify(report, null, 2),
      );
      console.log(
        "\n\uD83D\uDCBE Monitoring data saved to: ".concat(
          this.config.outputFile,
        ),
      );
    } catch (error) {
      console.error("\u274C Failed to save monitoring data:", error);
    }
  };
  return SystemMonitor;
})();
exports.SystemMonitor = SystemMonitor;
// CLI interface
function main() {
  return __awaiter(this, void 0, void 0, function () {
    var args, baseUrl, interval, outputFile, config, monitor;
    return __generator(this, (_a) => {
      args = process.argv.slice(2);
      if (args.length === 0) {
        console.log("🔍 System Monitor for Load Testing");
        console.log("");
        console.log("Usage:");
        console.log(
          "  tsx scripts/monitor-during-load.ts <baseUrl> [interval] [outputFile]",
        );
        console.log("");
        console.log("Examples:");
        console.log(
          "  tsx scripts/monitor-during-load.ts http://localhost:3000",
        );
        console.log(
          "  tsx scripts/monitor-during-load.ts http://localhost:3000 2000",
        );
        console.log(
          "  tsx scripts/monitor-during-load.ts http://localhost:3000 1000 monitoring-results.json",
        );
        console.log("");
        console.log("Default interval: 5000ms (5 seconds)");
        process.exit(1);
      }
      baseUrl = args[0] || "http://localhost:3000";
      interval = parseInt(args[1] || "5000", 10) || 5000;
      outputFile = args[2] || "monitoring-report.json";
      config = {
        baseUrl: baseUrl,
        monitoringInterval: interval,
        outputFile: outputFile,
        alertThresholds: {
          responseTime: 1000, // 1 second
          errorRate: 10, // 10 errors
          queueSize: 25, // 25 queued items
          circuitBreakerFailures: 5, // 5 failures
        },
      };
      monitor = new SystemMonitor(config);
      console.log("Press Ctrl+C to stop monitoring");
      monitor.start();
      // Keep the process running
      process.stdin.resume();
      return [2 /*return*/];
    });
  });
}
if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Monitoring failed:", error);
    process.exit(1);
  });
}
