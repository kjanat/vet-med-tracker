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

import { writeFileSync } from "node:fs";
import { performance } from "node:perf_hooks";

interface MonitoringConfig {
  baseUrl: string;
  monitoringInterval: number; // ms
  outputFile?: string;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    queueSize: number;
    circuitBreakerFailures: number;
  };
}

interface SystemSnapshot {
  timestamp: number;
  health: {
    status: string;
    responseTime: number;
    components: {
      database: {
        status: string;
        responseTime?: number;
      };
      queue: {
        status: string;
        activeConnections?: number;
        queuedItems?: number;
        averageWaitTime?: number;
      };
      circuitBreakers: {
        [key: string]: {
          status: string;
          state?: string;
          failureCount?: number;
          failureRate?: number;
        };
      };
    };
  };
  alerts: string[];
  performance: {
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: NodeJS.CpuUsage;
  };
}

class SystemMonitor {
  private config: MonitoringConfig;
  private snapshots: SystemSnapshot[] = [];
  private isMonitoring = false;
  private monitoringInterval?: NodeJS.Timeout;
  private lastCpuUsage: NodeJS.CpuUsage;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Used in analysis reporting
  private startTime = 0;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.lastCpuUsage = process.cpuUsage();
  }

  start(): void {
    if (this.isMonitoring) {
      console.warn("⚠️ Monitoring already running");
      return;
    }

    console.log("🔍 Starting system monitoring...");
    console.log(`📊 Monitoring interval: ${this.config.monitoringInterval}ms`);
    console.log(`🎯 Target URL: ${this.config.baseUrl}`);

    this.isMonitoring = true;
    this.startTime = performance.now();

    this.monitoringInterval = setInterval(async () => {
      try {
        const snapshot = await this.takeSnapshot();
        this.snapshots.push(snapshot);
        this.analyzeSnapshot(snapshot);
      } catch (error) {
        console.error("❌ Monitoring error:", error);
      }
    }, this.config.monitoringInterval);

    // Handle cleanup
    process.on("SIGINT", () => this.stop());
    process.on("SIGTERM", () => this.stop());
  }

  stop(): void {
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
  }

  getSnapshots(): SystemSnapshot[] {
    return [...this.snapshots];
  }

  private async takeSnapshot(): Promise<SystemSnapshot> {
    const timestamp = Date.now();
    const startTime = performance.now();

    try {
      // Fetch health endpoint
      const response = await fetch(
        `${this.config.baseUrl}/api/health?detailed=true`,
      );
      const responseTime = performance.now() - startTime;
      const healthData = await response.json();

      // Get system performance metrics
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage(this.lastCpuUsage);
      this.lastCpuUsage = process.cpuUsage();

      const snapshot: SystemSnapshot = {
        timestamp,
        health: {
          status: healthData.status,
          responseTime,
          components: healthData.components,
        },
        alerts: this.detectAlerts(healthData, responseTime),
        performance: {
          memoryUsage,
          cpuUsage,
        },
      };

      return snapshot;
    } catch (error) {
      // Return error snapshot
      return {
        timestamp,
        health: {
          status: "error",
          responseTime: -1,
          components: {
            database: { status: "unknown" },
            queue: { status: "unknown" },
            circuitBreakers: {},
          },
        },
        alerts: [`Health endpoint error: ${error}`],
        performance: {
          memoryUsage: process.memoryUsage(),
          cpuUsage: process.cpuUsage(this.lastCpuUsage),
        },
      };
    }
  }

  private detectAlerts(healthData: unknown, responseTime: number): string[] {
    const alerts: string[] = [];

    // Response time alerts
    if (responseTime > this.config.alertThresholds.responseTime) {
      alerts.push(`High response time: ${responseTime.toFixed(2)}ms`);
    }

    // Type the health data once
    const healthDataTyped = healthData as {
      components?: {
        database?: { status?: string };
        circuitBreakers?: Record<string, { status?: string; state?: string }>;
      };
      metrics?: {
        queue?: { queuedItems?: number };
        errors?: { recentCount?: number };
      };
      status?: string;
    };

    // Database alerts
    if (healthDataTyped.components?.database?.status !== "healthy") {
      alerts.push(
        `Database unhealthy: ${healthDataTyped.components?.database?.status}`,
      );
    }

    // Queue alerts
    const queuedItems = healthDataTyped.metrics?.queue?.queuedItems || 0;
    if (queuedItems > this.config.alertThresholds.queueSize) {
      alerts.push(`High queue size: ${queuedItems} items`);
    }

    // Circuit breaker alerts
    const circuitBreakers = healthDataTyped.components?.circuitBreakers || {};
    for (const [name, breaker] of Object.entries(circuitBreakers)) {
      if (breaker.status === "unhealthy" || breaker.state === "OPEN") {
        alerts.push(`Circuit breaker ${name} opened`);
      }
    }

    // Error rate alerts
    const errorStats = healthDataTyped.metrics?.errors;
    if (
      errorStats?.recentCount &&
      errorStats.recentCount >
        this.config.alertThresholds.circuitBreakerFailures
    ) {
      alerts.push(`High error rate: ${errorStats.recentCount} errors`);
    }

    // Overall status alerts
    if (healthDataTyped.status === "unhealthy") {
      alerts.push("System status: UNHEALTHY");
    } else if (healthDataTyped.status === "degraded") {
      alerts.push("System status: DEGRADED");
    }

    return alerts;
  }

  private analyzeSnapshot(snapshot: SystemSnapshot): void {
    // Print real-time status
    const elapsed = (
      (snapshot.timestamp -
        (this.snapshots[0]?.timestamp || snapshot.timestamp)) /
      1000
    ).toFixed(1);

    process.stdout.write(
      `\r🔍 [${elapsed}s] Status: ${snapshot.health.status.toUpperCase().padEnd(9)} | ` +
        `Response: ${snapshot.health.responseTime.toFixed(0).padStart(4)}ms | ` +
        `Queue: ${(snapshot.health.components.queue.queuedItems || 0).toString().padStart(3)} | ` +
        `Alerts: ${snapshot.alerts.length}`,
    );

    // Print alerts immediately
    if (snapshot.alerts.length > 0) {
      console.log(
        `\n🚨 ALERTS at ${new Date(snapshot.timestamp).toISOString()}:`,
      );
      snapshot.alerts.forEach((alert) => console.log(`   ⚠️ ${alert}`));
    }
  }

  private generateReport(): void {
    if (this.snapshots.length === 0) {
      console.log("\n📊 No monitoring data collected");
      return;
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log("📊 SYSTEM MONITORING REPORT");
    console.log("=".repeat(80));

    const duration =
      ((this.snapshots[this.snapshots.length - 1]?.timestamp || 0) -
        (this.snapshots[0]?.timestamp || 0)) /
      1000;
    const totalSnapshots = this.snapshots.length;

    console.log(`\n📋 Monitoring Summary:`);
    console.log(`   Duration: ${duration.toFixed(1)}s`);
    console.log(`   Snapshots: ${totalSnapshots}`);
    console.log(`   Interval: ${this.config.monitoringInterval}ms`);

    // Status distribution
    const statusCounts = this.snapshots.reduce(
      (acc, snapshot) => {
        acc[snapshot.health.status] = (acc[snapshot.health.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log(`\n🎯 Status Distribution:`);
    for (const [status, count] of Object.entries(statusCounts)) {
      const percentage = ((count / totalSnapshots) * 100).toFixed(1);
      console.log(`   ${status}: ${count} (${percentage}%)`);
    }

    // Response time analysis
    const responseTimes = this.snapshots
      .filter((s) => s.health.responseTime > 0)
      .map((s) => s.health.responseTime);

    if (responseTimes.length > 0) {
      responseTimes.sort((a, b) => a - b);
      const avg =
        responseTimes.reduce((sum, time) => sum + time, 0) /
        responseTimes.length;
      const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)] || 0;
      const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)] || 0;
      const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)] || 0;

      console.log(`\n⚡ Response Time Analysis:`);
      console.log(`   Average: ${avg.toFixed(2)}ms`);
      console.log(`   Median (P50): ${p50.toFixed(2)}ms`);
      console.log(`   P95: ${p95.toFixed(2)}ms`);
      console.log(`   P99: ${p99.toFixed(2)}ms`);
      console.log(`   Min: ${Math.min(...responseTimes).toFixed(2)}ms`);
      console.log(`   Max: ${Math.max(...responseTimes).toFixed(2)}ms`);
    }

    // Alert analysis
    const allAlerts = this.snapshots.flatMap((s) => s.alerts);
    const alertCounts = allAlerts.reduce(
      (acc, alert) => {
        acc[alert] = (acc[alert] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    console.log(`\n🚨 Alert Analysis:`);
    console.log(`   Total Alerts: ${allAlerts.length}`);

    if (Object.keys(alertCounts).length > 0) {
      console.log(`   Alert Types:`);
      for (const [alert, count] of Object.entries(alertCounts)) {
        console.log(`     ${alert}: ${count} times`);
      }
    } else {
      console.log(`   ✅ No alerts detected during monitoring`);
    }

    // Circuit breaker state changes
    const circuitBreakerStates = this.snapshots.map((s) => ({
      timestamp: s.timestamp,
      states: s.health.components.circuitBreakers,
    }));

    console.log(`\n🔄 Circuit Breaker Activity:`);
    const stateChanges =
      this.detectCircuitBreakerStateChanges(circuitBreakerStates);
    if (stateChanges.length > 0) {
      stateChanges.forEach((change) => {
        const time = new Date(change.timestamp).toISOString();
        console.log(`   ${time}: ${change.breaker} -> ${change.newState}`);
      });
    } else {
      console.log(`   ✅ No circuit breaker state changes detected`);
    }

    // Queue performance
    const queueMetrics = this.snapshots
      .filter((s) => s.health.components.queue.queuedItems !== undefined)
      .map((s) => ({
        timestamp: s.timestamp,
        queuedItems: s.health.components.queue.queuedItems || 0,
        activeConnections: s.health.components.queue.activeConnections || 0,
        averageWaitTime: s.health.components.queue.averageWaitTime || 0,
      }));

    if (queueMetrics.length > 0) {
      const maxQueueSize = Math.max(...queueMetrics.map((m) => m.queuedItems));
      const avgQueueSize =
        queueMetrics.reduce((sum, m) => sum + m.queuedItems, 0) /
        queueMetrics.length;
      const maxConnections = Math.max(
        ...queueMetrics.map((m) => m.activeConnections),
      );

      console.log(`\n🗂️ Queue Performance:`);
      console.log(`   Max Queue Size: ${maxQueueSize} items`);
      console.log(`   Avg Queue Size: ${avgQueueSize.toFixed(1)} items`);
      console.log(`   Max Active Connections: ${maxConnections}`);
    }

    console.log(`\n✅ System monitoring completed`);
  }

  private detectCircuitBreakerStateChanges(
    stateSnapshots: Array<{
      timestamp: number;
      states: Record<string, unknown>;
    }>,
  ): Array<{ timestamp: number; breaker: string; newState: string }> {
    const changes: Array<{
      timestamp: number;
      breaker: string;
      newState: string;
    }> = [];
    const previousStates: Record<string, string> = {};

    for (const snapshot of stateSnapshots) {
      for (const [breakerName, breakerData] of Object.entries(
        snapshot.states,
      )) {
        const typedBreakerData = breakerData as { state?: string };
        const currentState = typedBreakerData?.state || "CLOSED";
        const previousState = previousStates[breakerName];

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
  }

  private saveResults(): void {
    if (!this.config.outputFile) return;

    try {
      const report = {
        config: this.config,
        startTime: this.snapshots[0]?.timestamp,
        endTime: this.snapshots[this.snapshots.length - 1]?.timestamp,
        duration:
          this.snapshots.length > 0
            ? ((this.snapshots[this.snapshots.length - 1]?.timestamp || 0) -
                (this.snapshots[0]?.timestamp || 0)) /
              1000
            : 0,
        totalSnapshots: this.snapshots.length,
        snapshots: this.snapshots,
      };

      writeFileSync(this.config.outputFile, JSON.stringify(report, null, 2));
      console.log(`\n💾 Monitoring data saved to: ${this.config.outputFile}`);
    } catch (error) {
      console.error(`❌ Failed to save monitoring data:`, error);
    }
  }
}

// CLI interface
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("🔍 System Monitor for Load Testing");
    console.log("");
    console.log("Usage:");
    console.log(
      "  tsx scripts/monitor-during-load.ts <baseUrl> [interval] [outputFile]",
    );
    console.log("");
    console.log("Examples:");
    console.log("  tsx scripts/monitor-during-load.ts http://localhost:3000");
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

  const baseUrl = args[0] || "http://localhost:3000";
  const interval = parseInt(args[1] || "5000") || 5000;
  const outputFile = args[2] || "monitoring-report.json";

  const config: MonitoringConfig = {
    baseUrl,
    monitoringInterval: interval,
    outputFile,
    alertThresholds: {
      responseTime: 1000, // 1 second
      errorRate: 10, // 10 errors
      queueSize: 25, // 25 queued items
      circuitBreakerFailures: 5, // 5 failures
    },
  };

  const monitor = new SystemMonitor(config);

  console.log("Press Ctrl+C to stop monitoring");
  monitor.start();

  // Keep the process running
  process.stdin.resume();
}

if (require.main === module) {
  main().catch((error) => {
    console.error("❌ Monitoring failed:", error);
    process.exit(1);
  });
}

export { SystemMonitor, type MonitoringConfig, type SystemSnapshot };
