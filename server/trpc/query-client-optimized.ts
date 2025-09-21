// server/trpc/query-client-optimized.ts
import {
  defaultShouldDehydrateQuery,
  dehydrate,
  type FetchStatus,
  focusManager,
  onlineManager,
  type Query,
  QueryClient,
  type QueryKey,
} from "@tanstack/react-query";

// Types & constants
const HTTP_MIN_CLIENT_ERROR = 400;
const HTTP_MAX_CLIENT_ERROR = 499;

interface TRPCErrorLike {
  data?: { httpStatus?: number; code?: string };
}

// Define the domains and a real uniform type
type DomainConfig = {
  gcTime: number;
  staleTime: number;
  refetchInterval?: number | false;
  refetchOnWindowFocus?: boolean;
  refetchOnReconnect?: boolean;
};

export const DOMAINS = [
  "administrations",
  "animals",
  "default",
  "household",
  "inventory",
  "medications",
  "notifications",
  "pendingMeds",
  "regimens",
  "reports",
  "user",
] as const;

export type Domain = (typeof DOMAINS)[number];

// Give CACHE_CONFIG an explicit Record<Domain, DomainConfig>
export const CACHE_CONFIG: Record<Domain, DomainConfig> = {
  administrations: { gcTime: 5 * 60_000, staleTime: 30_000 },
  animals: { gcTime: 15 * 60_000, staleTime: 2 * 60_000 },
  default: { gcTime: 5 * 60_000, staleTime: 30_000 },
  household: { gcTime: 15 * 60_000, staleTime: 2 * 60_000 },
  inventory: { gcTime: 10 * 60_000, staleTime: 60_000 },
  medications: { gcTime: 2 * 60 * 60_000, staleTime: 30 * 60_000 },
  notifications: {
    gcTime: 5 * 60_000,
    refetchInterval: 10_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  },
  pendingMeds: {
    gcTime: 2 * 60_000,
    refetchInterval: 15_000,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  },
  regimens: { gcTime: 10 * 60_000, staleTime: 60_000 },
  reports: { gcTime: 30 * 60_000, staleTime: 5 * 60_000 },
  user: { gcTime: 30 * 60_000, staleTime: 5 * 60_000 },
};

// Type guard
function isDomain(x: string): x is Domain {
  return Object.hasOwn(CACHE_CONFIG, x);
}

// Domain extraction
function _extractDomain(queryKey: QueryKey): Domain {
  if (!Array.isArray(queryKey) || queryKey.length === 0) return "default";
  const first = queryKey[0];
  if (typeof first === "string") {
    // Avoid destructuring/safe-index to keep TS happy
    const dot = first.indexOf(".");
    const candidate = dot === -1 ? first : first.slice(0, dot); // always a string
    if (isDomain(candidate)) return candidate;
  }
  return "default";
}

// Retry helpers
function shouldRetry(failureCount: number, error: unknown): boolean {
  const e = error as TRPCErrorLike;
  const status = e?.data?.httpStatus;
  if (
    typeof status === "number" &&
    status >= HTTP_MIN_CLIENT_ERROR &&
    status <= HTTP_MAX_CLIENT_ERROR
  )
    return false;
  if (e?.data?.code === "UNAUTHORIZED") return false;
  return failureCount < 3;
}

function retryDelay(attemptIndex: number): number {
  // 1s, 2s, 4s, capped at 10s with ±10% jitter
  const base = Math.min(1000 * 2 ** attemptIndex, 10_000);
  const jitterFactor = 1 + (Math.random() * 0.2 - 0.1);
  return base * jitterFactor;
}

// Performance monitor
interface PerformanceMetrics {
  cacheHits: number;
  cacheMisses: number;
  queryCount: number;
  errorCount: number;
  averageQueryTime: number;
}
class QueryPerformanceMonitor {
  private metrics: PerformanceMetrics = {
    averageQueryTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errorCount: 0,
    queryCount: 0,
  };
  private times: number[] = [];
  private fetchStarts = new Map<string, number>();

  start(query: Query): void {
    this.fetchStarts.set(
      query.queryHash,
      typeof performance !== "undefined" ? performance.now() : Date.now(),
    );
  }
  success(query: Query): void {
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    const t0 = this.fetchStarts.get(query.queryHash);
    if (t0 != null) {
      const dt = now - t0;
      this.times.push(dt);
      if (this.times.length > 100) this.times.shift();
      this.metrics.averageQueryTime =
        this.times.reduce((a, b) => a + b, 0) / this.times.length;
      this.fetchStarts.delete(query.queryHash);
    }
    this.metrics.queryCount++;
  }
  error(query: Query): void {
    this.fetchStarts.delete(query.queryHash);
    this.metrics.errorCount++;
  }
  recordImmediateResult(): void {
    this.metrics.cacheHits++;
  }
  recordFetchNeeded(): void {
    this.metrics.cacheMisses++;
  }
  getMetrics(): PerformanceMetrics & { cacheHitRatio: number } {
    const total = this.metrics.cacheHits + this.metrics.cacheMisses;
    return {
      ...this.metrics,
      cacheHitRatio: total ? this.metrics.cacheHits / total : 0,
    };
  }
  reset(): void {
    this.metrics = {
      averageQueryTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errorCount: 0,
      queryCount: 0,
    };
    this.times = [];
    this.fetchStarts.clear();
  }
}
export const performanceMonitor = new QueryPerformanceMonitor();

// Client factory
export function makeQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: {
        retry: (count: number, error: unknown) => {
          const e = error as TRPCErrorLike;
          const s = e?.data?.httpStatus;
          if (
            typeof s === "number" &&
            s >= HTTP_MIN_CLIENT_ERROR &&
            s <= HTTP_MAX_CLIENT_ERROR
          )
            return false;
          return count < 2;
        },
        retryDelay,
      },
      queries: {
        gcTime: CACHE_CONFIG.default.gcTime,
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
        retryDelay,
        staleTime: CACHE_CONFIG.default.staleTime,
      },
    },
  });

  // Apply per-domain defaults
  DOMAINS.forEach((domain) => {
    const cfg = CACHE_CONFIG[domain]; // DomainConfig
    queryClient.setQueryDefaults([domain], {
      gcTime: cfg.gcTime,
      // Undefined is fine; React Query ignores it.
      refetchInterval: cfg.refetchInterval,
      refetchOnReconnect: cfg.refetchOnReconnect,
      refetchOnWindowFocus: cfg.refetchOnWindowFocus,
      staleTime: cfg.staleTime,
    });
  });

  // Instrument cache to infer hits/misses & timing
  type MinimalEvent = { query?: Query };
  const lastState = new Map<
    string,
    { fetchStatus: FetchStatus | "unknown"; hadData: boolean }
  >();

  const handleCacheMiss = (
    q: Query,
    prev:
      | { fetchStatus: FetchStatus | "unknown"; hadData: boolean }
      | undefined,
    current: { fetchStatus: FetchStatus | "unknown"; hadData: boolean },
  ) => {
    const prevWasFetching = prev?.fetchStatus === "fetching";
    if (
      current.fetchStatus === "fetching" &&
      !prevWasFetching &&
      !current.hadData
    ) {
      performanceMonitor.recordFetchNeeded();
      performanceMonitor.start(q);
    }
  };

  const handleCacheHit = (
    prev:
      | { fetchStatus: FetchStatus | "unknown"; hadData: boolean }
      | undefined,
    current: { fetchStatus: FetchStatus | "unknown"; hadData: boolean },
  ) => {
    const nowIdleWithData =
      current.hadData && current.fetchStatus !== "fetching";
    const prevNoData = !prev?.hadData;
    if (nowIdleWithData && (prev === undefined || prevNoData)) {
      performanceMonitor.recordImmediateResult();
    }
  };

  const handleQuerySuccess = (q: Query) => {
    if (q.state.status === "success" && q.state.fetchStatus === "idle") {
      performanceMonitor.success(q);
    }
  };

  const handleQueryError = (q: Query) => {
    if (q.state.status === "error" && q.state.fetchStatus === "idle") {
      performanceMonitor.error(q);
    }
  };

  queryClient.getQueryCache().subscribe((event: MinimalEvent) => {
    const q = event.query;
    if (!q) return;

    const key = q.queryHash;
    const prev = lastState.get(key);
    const currentState = {
      fetchStatus: q.state.fetchStatus ?? "unknown",
      hadData: q.state.data !== undefined,
    };

    handleCacheMiss(q, prev, currentState);
    handleCacheHit(prev, currentState);
    handleQuerySuccess(q);
    handleQueryError(q);

    lastState.set(key, currentState);
  });

  // Expose metrics
  (
    queryClient as unknown as { getPerformanceMetrics: () => unknown }
  ).getPerformanceMetrics = () => performanceMonitor.getMetrics();
  (
    queryClient as unknown as { resetPerformanceMetrics: () => void }
  ).resetPerformanceMetrics = () => performanceMonitor.reset();

  // Focus/online hooks (no-ops on server)
  if (typeof window !== "undefined") {
    focusManager.setEventListener((handleFocus) => {
      const onFocus = () => handleFocus();
      window.addEventListener("visibilitychange", onFocus, false);
      window.addEventListener("focus", onFocus, false);
      return () => {
        window.removeEventListener("visibilitychange", onFocus, false);
        window.removeEventListener("focus", onFocus, false);
      };
    });
    onlineManager.setEventListener((setOnline) => {
      const onOnline = () => setOnline(true);
      const onOffline = () => setOnline(false);
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
    });
  }

  return queryClient;
}

// SSR dehydration helper
export function _dehydrateClientForSSR(client: QueryClient) {
  return dehydrate(client, {
    shouldDehydrateQuery: (q) =>
      defaultShouldDehydrateQuery(q) || q.state.status === "pending",
  });
}

// Invalidation helpers
export const cacheInvalidation = {
  household: (qc: QueryClient): Promise<void> => {
    return qc.invalidateQueries({
      predicate: (query) => {
        const first = query.queryKey[0];
        return (
          typeof first === "string" &&
          (first.startsWith("household") ||
            first.startsWith("animals") ||
            first.startsWith("pendingMeds"))
        );
      },
    });
  },

  medications: (qc: QueryClient): Promise<void> => {
    return qc.invalidateQueries({
      predicate: (query) => {
        const first = query.queryKey[0];
        return (
          typeof first === "string" &&
          (first.startsWith("regimens") ||
            first.startsWith("administrations") ||
            first.startsWith("pendingMeds"))
        );
      },
    });
  },

  smart: (qc: QueryClient, mutationType: string): Promise<void> => {
    switch (mutationType) {
      case "administration":
      case "regimen":
        return cacheInvalidation.medications(qc);
      case "animal":
        return cacheInvalidation.household(qc);
      case "user":
        return cacheInvalidation.user(qc);
      default:
        return qc.invalidateQueries();
    }
  },

  user: (qc: QueryClient): Promise<void> => {
    return qc.invalidateQueries({
      predicate: (query) => {
        const first = query.queryKey[0];
        return typeof first === "string" && first.startsWith("user");
      },
    });
  },
};
