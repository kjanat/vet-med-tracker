module.exports = {
  ci: {
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.9 }],
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],

        // Core Web Vitals
        "first-contentful-paint": ["warn", { maxNumericValue: 2000 }],
        "largest-contentful-paint": ["error", { maxNumericValue: 2500 }],
        "interaction-to-next-paint": ["error", { maxNumericValue: 200 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "speed-index": ["warn", { maxNumericValue: 3000 }],
        "time-to-interactive": ["warn", { maxNumericValue: 3000 }],

        // Resource budgets
        "resource-summary:script:size": ["error", { maxNumericValue: 500000 }], // 500KB
        "resource-summary:stylesheet:size": [
          "warn",
          { maxNumericValue: 50000 },
        ], // 50KB
        "resource-summary:image:size": ["warn", { maxNumericValue: 1000000 }], // 1MB
        "resource-summary:font:size": ["warn", { maxNumericValue: 100000 }], // 100KB
        "resource-summary:other:size": ["warn", { maxNumericValue: 200000 }], // 200KB
        "resource-summary:total:size": ["warn", { maxNumericValue: 2000000 }], // 2MB

        // Bundle-specific budgets
        "unused-javascript": ["warn", { maxNumericValue: 100000 }], // 100KB unused JS
        "unused-css-rules": ["warn", { maxNumericValue: 20000 }], // 20KB unused CSS

        // Performance metrics
        "bootup-time": ["warn", { maxNumericValue: 3000 }], // 3s JS bootup
        "mainthread-work-breakdown": ["warn", { maxNumericValue: 4000 }], // 4s main thread
        "third-party-summary": ["warn", { maxNumericValue: 2000 }], // 2s third-party
      },
    },
    collect: {
      url: [
        "http://localhost:3000/",
        "http://localhost:3000/login",
        "http://localhost:3000/dashboard",
        "http://localhost:3000/medications/inventory",
        "http://localhost:3000/reports",
        "http://localhost:3000/insights",
        "http://localhost:3000/admin/record",
      ],
      startServerCommand: "pnpm start",
      startServerReadyPattern: "ready on",
      startServerReadyTimeout: 30000,
      numberOfRuns: 3,
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
