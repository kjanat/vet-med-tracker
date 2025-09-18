export const ci = {
  assert: {
    assertions: {
      // Performance metrics
      "bootup-time": ["warn", { maxNumericValue: 3000 }], // 3s JS bootup
      "categories:accessibility": ["error", { minScore: 0.95 }],
      "categories:best-practices": ["warn", { minScore: 0.9 }],
      "categories:performance": ["warn", { minScore: 0.9 }],
      "categories:seo": ["warn", { minScore: 0.9 }],
      "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],

      // Core Web Vitals
      "first-contentful-paint": ["warn", { maxNumericValue: 2000 }],
      "interaction-to-next-paint": ["error", { maxNumericValue: 200 }],
      "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
      "mainthread-work-breakdown": ["warn", { maxNumericValue: 4000 }], // 4s main thread
      "resource-summary:font:size": ["warn", { maxNumericValue: 100000 }], // 100KB
      "resource-summary:image:size": ["warn", { maxNumericValue: 1000000 }], // 1MB
      "resource-summary:other:size": ["warn", { maxNumericValue: 200000 }], // 200KB

      // Resource budgets
      "resource-summary:script:size": ["error", { maxNumericValue: 500000 }], // 500KB
      "resource-summary:stylesheet:size": ["warn", { maxNumericValue: 50000 }], // 50KB
      "resource-summary:total:size": ["warn", { maxNumericValue: 2000000 }], // 2MB
      "speed-index": ["warn", { maxNumericValue: 3000 }],
      "third-party-summary": ["warn", { maxNumericValue: 2000 }], // 2s third-party
      "time-to-interactive": ["warn", { maxNumericValue: 3000 }],
      "unused-css-rules": ["warn", { maxNumericValue: 20000 }], // 20KB unused CSS

      // Bundle-specific budgets
      "unused-javascript": ["warn", { maxNumericValue: 100000 }], // 100KB unused JS
    },
  },
  collect: {
    numberOfRuns: 3,
    startServerCommand: "pnpm start",
    startServerReadyPattern: "ready on",
    startServerReadyTimeout: 30000,
    url: [
      "http://localhost:3000/",
      "http://localhost:3000/login",
      "http://localhost:3000/dashboard",
      "http://localhost:3000/medications/inventory",
      "http://localhost:3000/reports",
      "http://localhost:3000/insights",
      "http://localhost:3000/admin/record",
    ],
  },
  upload: {
    target: "temporary-public-storage",
  },
};
