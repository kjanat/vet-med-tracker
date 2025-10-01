export default [
  {
    limit: "120 KB",
    name: "Initial JS bundle",
    path: ".next/static/chunks/main-*.js",
    webpack: false,
  },
  {
    limit: "180 KB",
    name: "Framework bundle",
    path: ".next/static/chunks/framework-*.js",
    webpack: false,
  },
  {
    limit: "50 KB",
    name: "Main app bundle",
    path: ".next/static/chunks/main-app-*.js",
    webpack: false,
  },
  {
    limit: "110 KB",
    name: "Polyfills",
    path: ".next/static/chunks/polyfills-*.js",
    webpack: false,
  },
  {
    limit: "95 KB",
    name: "Admin record page",
    path: ".next/static/chunks/app/**/admin/record/page-*.js",
    webpack: false,
  },
  {
    limit: "85 KB",
    name: "Reports page",
    path: ".next/static/chunks/app/**/reports/page-*.js",
    webpack: false,
  },
  {
    ignore: ["**/chunks/app/**"], // Ignore app-specific chunks
    limit: "700 KB", // Combined limit for all heavy chunks
    name: "Heavy chunks (shared libraries)",
    path: ".next/static/chunks/[0-9]*-*.js",
    webpack: false,
  },
  {
    limit: "30 KB",
    name: "CSS bundle",
    path: ".next/static/css/*.css",
    webpack: false,
  },
];
