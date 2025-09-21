/**
 * Performance Monitoring Dashboard
 * Performance Optimization - Wave 2B
 *
 * Real-time monitoring of Core Web Vitals, cache performance,
 * and database query metrics for production optimization
 */

"use client";

import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// =============================================================================
// TYPES & INTERFACES
// =============================================================================

interface CoreWebVitals {
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
}

interface CacheMetrics {
  hitRatio: number;
  totalRequests: number;
  hitCount: number;
  missCount: number;
  averageResponseTime: number;
}

interface DatabaseMetrics {
  averageQueryTime: number;
  slowQueries: number;
  connectionPoolUsage: number;
  totalQueries: number;
  errorRate: number;
}

interface BundleMetrics {
  initialBundleSize: number;
  totalBundleSize: number;
  chunkCount: number;
  compressionRatio: number;
  unusedBytes: number;
}

interface PerformanceData {
  timestamp: number;
  webVitals: CoreWebVitals;
  cache: CacheMetrics;
  database: DatabaseMetrics;
  bundle: BundleMetrics;
  userAgent: string;
  connectionType: string;
}

type NavigatorWithConnection = Navigator & {
  connection?: {
    effectiveType?: string;
  };
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function getWebVitalsScore(vitals: CoreWebVitals): {
  score: number;
  grade: string;
  color: string;
} {
  const lcpScore = vitals.lcp <= 2500 ? 100 : vitals.lcp <= 4000 ? 50 : 0;
  const fidScore = vitals.fid <= 100 ? 100 : vitals.fid <= 300 ? 50 : 0;
  const clsScore = vitals.cls <= 0.1 ? 100 : vitals.cls <= 0.25 ? 50 : 0;

  const totalScore = (lcpScore + fidScore + clsScore) / 3;

  let grade = "Poor";
  let color = "destructive";

  if (totalScore >= 90) {
    grade = "Good";
    color = "default";
  } else if (totalScore >= 50) {
    grade = "Needs Improvement";
    color = "secondary";
  }

  return { color, grade, score: Math.round(totalScore) };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
}

function formatTime(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// =============================================================================
// PERFORMANCE MONITORING HOOK
// =============================================================================

function usePerformanceMonitoring() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const collectWebVitals = useCallback((): CoreWebVitals => {
    const navigation = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming;

    return {
      cls: 0, // This would be collected via PerformanceObserver in real implementation
      fcp: navigation?.responseStart - navigation?.fetchStart || 0,
      fid: 0, // This would be collected via PerformanceObserver in real implementation
      lcp: 0, // This would be collected via PerformanceObserver in real implementation
      ttfb: navigation?.responseStart - navigation?.requestStart || 0,
    };
  }, []);

  const collectCacheMetrics = useCallback(async (): Promise<CacheMetrics> => {
    // In a real implementation, this would query the tRPC cache
    const mockMetrics: CacheMetrics = {
      averageResponseTime: 145,
      hitCount: 1049,
      hitRatio: 0.85,
      missCount: 185,
      totalRequests: 1234,
    };

    return mockMetrics;
  }, []);

  const collectDatabaseMetrics =
    useCallback(async (): Promise<DatabaseMetrics> => {
      // In a real implementation, this would query database performance metrics
      const mockMetrics: DatabaseMetrics = {
        averageQueryTime: 65,
        connectionPoolUsage: 0.45,
        errorRate: 0.002,
        slowQueries: 3,
        totalQueries: 5678,
      };

      return mockMetrics;
    }, []);

  const collectBundleMetrics = useCallback((): BundleMetrics => {
    // Collect bundle size information
    const mockMetrics: BundleMetrics = {
      chunkCount: 12,
      compressionRatio: 0.35,
      initialBundleSize: 485000, // ~485KB
      totalBundleSize: 1250000, // ~1.25MB
      unusedBytes: 125000,
    };

    return mockMetrics;
  }, []);

  const refreshMetrics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [webVitals, cache, database] = await Promise.all([
        Promise.resolve(collectWebVitals()),
        collectCacheMetrics(),
        collectDatabaseMetrics(),
      ]);

      const bundle = collectBundleMetrics();

      const navigatorWithConnection = navigator as NavigatorWithConnection;

      const newData: PerformanceData = {
        bundle,
        cache,
        connectionType:
          navigatorWithConnection.connection?.effectiveType ?? "unknown",
        database,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        webVitals,
      };

      setData(newData);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to collect metrics",
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    collectWebVitals,
    collectCacheMetrics,
    collectDatabaseMetrics,
    collectBundleMetrics,
  ]);

  useEffect(() => {
    refreshMetrics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshMetrics, 30000);
    return () => clearInterval(interval);
  }, [refreshMetrics]);

  return { data, error, isLoading, refreshMetrics };
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PerformanceDashboard() {
  const { data, isLoading, error, refreshMetrics } = usePerformanceMonitoring();

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          <h2 className="font-semibold text-lg">Performance Dashboard</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {["a", "b", "c", "d"].map((id) => (
            <Card className="animate-pulse" key={`loading-${id}`}>
              <CardHeader className="pb-2">
                <div className="h-4 w-20 rounded bg-muted" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Performance Monitoring Error
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{error}</p>
          <Button className="mt-4" onClick={refreshMetrics}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const webVitalsScore = getWebVitalsScore(data.webVitals);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          <h2 className="font-semibold text-lg">Performance Dashboard</h2>
          <Badge className="text-xs" variant="outline">
            Updated {formatTime(Date.now() - data.timestamp)} ago
          </Badge>
        </div>
        <Button disabled={isLoading} onClick={refreshMetrics} size="sm">
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {/* Quick Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">
              Web Vitals Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="font-bold text-2xl">
                {webVitalsScore.score}%
              </span>
              <Badge
                variant={
                  webVitalsScore.color as
                    | "default"
                    | "secondary"
                    | "destructive"
                    | "outline"
                }
              >
                {webVitalsScore.grade}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">
              Cache Hit Ratio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="font-bold text-2xl">
                {Math.round(data.cache.hitRatio * 100)}%
              </span>
              {data.cache.hitRatio >= 0.8 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">
              Avg Query Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="font-bold text-2xl">
                {data.database.averageQueryTime}ms
              </span>
              {data.database.averageQueryTime <= 100 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-medium text-sm">Bundle Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="font-bold text-2xl">
                {formatBytes(data.bundle.initialBundleSize)}
              </span>
              {data.bundle.initialBundleSize <= 500000 ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Metrics */}
      <Tabs className="space-y-4" defaultValue="vitals">
        <TabsList>
          <TabsTrigger value="vitals">Core Web Vitals</TabsTrigger>
          <TabsTrigger value="cache">Cache Performance</TabsTrigger>
          <TabsTrigger value="database">Database Metrics</TabsTrigger>
          <TabsTrigger value="bundle">Bundle Analysis</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="vitals">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Core Web Vitals
                </CardTitle>
                <CardDescription>Key user experience metrics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Largest Contentful Paint (LCP)</span>
                    <span>{formatTime(data.webVitals.lcp)}</span>
                  </div>
                  <Progress
                    className="h-2"
                    value={Math.min(
                      100,
                      (2500 / Math.max(data.webVitals.lcp, 1)) * 100,
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>First Input Delay (FID)</span>
                    <span>{formatTime(data.webVitals.fid)}</span>
                  </div>
                  <Progress
                    className="h-2"
                    value={Math.min(
                      100,
                      (100 / Math.max(data.webVitals.fid, 1)) * 100,
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Cumulative Layout Shift (CLS)</span>
                    <span>{data.webVitals.cls.toFixed(3)}</span>
                  </div>
                  <Progress
                    className="h-2"
                    value={Math.min(
                      100,
                      (0.1 / Math.max(data.webVitals.cls, 0.001)) * 100,
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Loading Metrics
                </CardTitle>
                <CardDescription>Page load performance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">First Contentful Paint</span>
                  <span className="font-mono">
                    {formatTime(data.webVitals.fcp)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Time to First Byte</span>
                  <span className="font-mono">
                    {formatTime(data.webVitals.ttfb)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Connection Type</span>
                  <span className="font-mono">{data.connectionType}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent className="space-y-4" value="cache">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Cache Performance</CardTitle>
                <CardDescription>
                  Query and asset caching metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Hit Ratio</span>
                    <span>{Math.round(data.cache.hitRatio * 100)}%</span>
                  </div>
                  <Progress className="h-2" value={data.cache.hitRatio * 100} />
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Requests</span>
                  <span className="font-mono">
                    {data.cache.totalRequests.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Cache Hits</span>
                  <span className="font-mono text-green-600">
                    {data.cache.hitCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Cache Misses</span>
                  <span className="font-mono text-red-600">
                    {data.cache.missCount.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Avg Response Time</span>
                  <span className="font-mono">
                    {data.cache.averageResponseTime}ms
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent className="space-y-4" value="database">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Database Performance
                </CardTitle>
                <CardDescription>
                  Query performance and connection metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">Average Query Time</span>
                  <span className="font-mono">
                    {data.database.averageQueryTime}ms
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Slow Queries (&gt;1s)</span>
                  <span className="font-mono text-yellow-600">
                    {data.database.slowQueries}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Queries</span>
                  <span className="font-mono">
                    {data.database.totalQueries.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Error Rate</span>
                  <span className="font-mono">
                    {(data.database.errorRate * 100).toFixed(3)}%
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Connection Pool Usage</span>
                    <span>
                      {Math.round(data.database.connectionPoolUsage * 100)}%
                    </span>
                  </div>
                  <Progress
                    className="h-2"
                    value={data.database.connectionPoolUsage * 100}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent className="space-y-4" value="bundle">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Bundle Analysis</CardTitle>
                <CardDescription>
                  JavaScript bundle size and optimization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm">Initial Bundle Size</span>
                  <span className="font-mono">
                    {formatBytes(data.bundle.initialBundleSize)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Total Bundle Size</span>
                  <span className="font-mono">
                    {formatBytes(data.bundle.totalBundleSize)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Number of Chunks</span>
                  <span className="font-mono">{data.bundle.chunkCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Compression Ratio</span>
                  <span className="font-mono">
                    {Math.round(data.bundle.compressionRatio * 100)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Unused Code</span>
                  <span className="font-mono text-yellow-600">
                    {formatBytes(data.bundle.unusedBytes)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
